import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { 
  ListOrganizationRecommendationsCommand,
  GetOrganizationRecommendationCommand,
  ListOrganizationRecommendationAccountsCommand,
  ListOrganizationRecommendationResourcesCommand,
  UpdateOrganizationRecommendationLifecycleCommand
} from "@aws-sdk/client-trustedadvisor";
import { trustedAdvisorClient } from "../clients/awsClients.js";
import { 
  OrganizationInputSchema,
  FilterInputSchema,
  PaginationInputSchema,
  RecommendationInputSchema,
  UpdateLifecycleInputSchema,
  RecommendationSchema,
  AccountSchema,
  ResourceSchema
} from "../schemas/trustedAdvisorSchemas.js";
import { 
  parseInput, 
  createListResponse, 
  createSingleResponse,
  createUpdateResponse,
  handleAwsError, 
  formatMcpResponse 
} from "../utils/responseUtils.js";

// Organization recommendations listing
const ListOrganizationRecommendationsInputSchema = OrganizationInputSchema.merge(FilterInputSchema).merge(PaginationInputSchema);
type ListOrganizationRecommendationsInput = z.infer<typeof ListOrganizationRecommendationsInputSchema>;

export const listOrganizationRecommendations = (server: McpServer) => {
  server.resource(
    "list-organization-recommendations",
    new ResourceTemplate("trusted-advisor://organizations/{organizationId}/recommendations", {
      list: async () => ({
        resources: [
          {
            name: "List Organization Recommendations",
            uri: "trusted-advisor://organizations/{organizationId}/recommendations",
            description: [
              "List a filterable set of Recommendations within an Organization. This API only supports prioritized recommendations.",
              "Parameters:",
              "- organizationId: The organization identifier (required)",
              "- awsService: Filter by AWS service",
              "- pillar: Filter by pillar (cost_optimizing, performance, security, etc.)",
              "- source: Filter by source (aws_config, compute_optimizer, etc.)",
              "- status: Filter by status (ok, warning, error)",
              "- maxResults: Maximum number of results (1-200, default: 100)",
              "- nextToken: Token for pagination",
              "- language: Language code (en, ja, fr, zh) - defaults to 'en'",
              "- awsAccountId: (optional) AWS Account ID for metadata",
              "- region: (optional) AWS region - defaults to 'us-east-1'",
              "⚠️ Requires Enterprise Support plan.",
              "⚠️ Only supports prioritized recommendations."
            ].join(" "),
            mimeType: "application/json"
          }
        ]
      })
    }),
    async (uri, _params) => {
      try {
        const input = parseInput<ListOrganizationRecommendationsInput>(ListOrganizationRecommendationsInputSchema, _params);
        
        const command = new ListOrganizationRecommendationsCommand({
          awsService: input.awsService,
          pillar: input.pillar,
          source: input.source,
          status: input.status,
          maxResults: input.maxResults,
          nextToken: input.nextToken
        });

        const response = await trustedAdvisorClient.send(command);
        
        if (!response.organizationRecommendationSummaries) {
          const result = createListResponse([], "listOrganizationRecommendations", undefined, input.awsAccountId, input.region);
          return formatMcpResponse(uri.href, result);
        }

        const recommendations = response.organizationRecommendationSummaries.map(rec => ({
          id: rec.id!,
          checkId: rec.checkArn || "unknown",
          type: rec.type!,
          name: rec.name,
          description: "Available in detailed view",
          status: rec.status!,
          createdAt: rec.createdAt?.toISOString(),
          updatedAt: rec.lastUpdatedAt?.toISOString(),
          lifecycleStage: rec.lifecycleStage,
          updateReason: "Available in detailed view",
          updateReasonCode: "Available in detailed view",
          pillar: rec.pillars?.[0] || "unknown",
          source: rec.source,
          awsServices: rec.awsServices || [],
          resourcesAggregates: rec.resourcesAggregates ? {
            errorCount: rec.resourcesAggregates.errorCount,
            okCount: rec.resourcesAggregates.okCount,
            warningCount: rec.resourcesAggregates.warningCount
          } : undefined
        }));

        const result = createListResponse(
          recommendations, 
          "listOrganizationRecommendations", 
          response.nextToken, 
          input.awsAccountId, 
          input.region
        );
        
        return formatMcpResponse(uri.href, result);
        
      } catch (error) {
        const awsAccountId = Array.isArray(_params?.awsAccountId) ? _params.awsAccountId[0] : _params?.awsAccountId;
        const region = Array.isArray(_params?.region) ? _params.region[0] : _params?.region;
        const errorResponse = handleAwsError(error, "listOrganizationRecommendations", awsAccountId, region);
        return formatMcpResponse(uri.href, errorResponse);
      }
    }
  );
};

// Get organization recommendation
const GetOrganizationRecommendationInputSchema = OrganizationInputSchema.merge(RecommendationInputSchema);
type GetOrganizationRecommendationInput = z.infer<typeof GetOrganizationRecommendationInputSchema>;

export const getOrganizationRecommendation = (server: McpServer) => {
  server.resource(
    "get-organization-recommendation",
    new ResourceTemplate("trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}", {
      list: async () => ({
        resources: [
          {
            name: "Get Organization Recommendation",
            uri: "trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}",
            description: [
              "Get a specific recommendation within an AWS Organizations organization. This API supports only prioritized recommendations.",
              "Parameters:",
              "- organizationId: The organization identifier (required)",
              "- recommendationIdentifier: The recommendation identifier (required)",
              "- language: Language code (en, ja, fr, zh) - defaults to 'en'",
              "- awsAccountId: (optional) AWS Account ID for metadata",
              "- region: (optional) AWS region - defaults to 'us-east-1'",
              "⚠️ Requires Enterprise Support plan.",
              "⚠️ Only supports prioritized recommendations."
            ].join(" "),
            mimeType: "application/json"
          }
        ]
      })
    }),
    async (uri, _params) => {
      try {
        const input = parseInput<GetOrganizationRecommendationInput>(GetOrganizationRecommendationInputSchema, _params);
        
        const command = new GetOrganizationRecommendationCommand({
          organizationRecommendationIdentifier: input.recommendationIdentifier
        });

        const response = await trustedAdvisorClient.send(command);
        
        if (!response.organizationRecommendation) {
          const errorResponse = {
            error: "Organization recommendation not found",
            message: `No organization recommendation found with identifier: ${input.recommendationIdentifier}`,
            code: "OrganizationRecommendationNotFound",
            metadata: {
              timestamp: new Date().toISOString(),
              awsAccountId: input.awsAccountId,
              region: input.region,
              operationType: "getOrganizationRecommendation"
            }
          };
          return formatMcpResponse(uri.href, errorResponse);
        }

        const recommendation = {
          id: response.organizationRecommendation.id!,
          checkId: response.organizationRecommendation.checkArn || "unknown",
          type: response.organizationRecommendation.type!,
          name: response.organizationRecommendation.name,
          description: response.organizationRecommendation.description,
          status: response.organizationRecommendation.status!,
          createdAt: response.organizationRecommendation.createdAt?.toISOString(),
          updatedAt: response.organizationRecommendation.lastUpdatedAt?.toISOString(),
          lifecycleStage: response.organizationRecommendation.lifecycleStage,
          updateReason: response.organizationRecommendation.updateReason,
          updateReasonCode: response.organizationRecommendation.updateReasonCode,
          pillar: response.organizationRecommendation.pillars?.[0] || "unknown",
          source: response.organizationRecommendation.source,
          awsServices: response.organizationRecommendation.awsServices || [],
          resourcesAggregates: response.organizationRecommendation.resourcesAggregates ? {
            errorCount: response.organizationRecommendation.resourcesAggregates.errorCount,
            okCount: response.organizationRecommendation.resourcesAggregates.okCount,
            warningCount: response.organizationRecommendation.resourcesAggregates.warningCount
          } : undefined
        };

        const result = createSingleResponse(
          recommendation, 
          "getOrganizationRecommendation", 
          input.awsAccountId, 
          input.region
        );
        
        return formatMcpResponse(uri.href, result);
        
      } catch (error) {
        const awsAccountId = Array.isArray(_params?.awsAccountId) ? _params.awsAccountId[0] : _params?.awsAccountId;
        const region = Array.isArray(_params?.region) ? _params.region[0] : _params?.region;
        const errorResponse = handleAwsError(error, "getOrganizationRecommendation", awsAccountId, region);
        return formatMcpResponse(uri.href, errorResponse);
      }
    }
  );
};

// List organization recommendation accounts
const ListOrganizationRecommendationAccountsInputSchema = OrganizationInputSchema.merge(RecommendationInputSchema).merge(PaginationInputSchema);
type ListOrganizationRecommendationAccountsInput = z.infer<typeof ListOrganizationRecommendationAccountsInputSchema>;

export const listOrganizationRecommendationAccounts = (server: McpServer) => {
  server.resource(
    "list-organization-recommendation-accounts",
    new ResourceTemplate("trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}/accounts", {
      list: async () => ({
        resources: [
          {
            name: "List Organization Recommendation Accounts",
            uri: "trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}/accounts",
            description: [
              "Lists the accounts that own the resources for an organization aggregate recommendation. This API only supports prioritized recommendations.",
              "Parameters:",
              "- organizationId: The organization identifier (required)",
              "- recommendationIdentifier: The recommendation identifier (required)",
              "- maxResults: Maximum number of results (1-200, default: 100)",
              "- nextToken: Token for pagination",
              "- language: Language code (en, ja, fr, zh) - defaults to 'en'",
              "- awsAccountId: (optional) AWS Account ID for metadata",
              "- region: (optional) AWS region - defaults to 'us-east-1'",
              "⚠️ Requires Enterprise Support plan.",
              "⚠️ Only supports prioritized recommendations."
            ].join(" "),
            mimeType: "application/json"
          }
        ]
      })
    }),
    async (uri, _params) => {
      try {
        const input = parseInput<ListOrganizationRecommendationAccountsInput>(ListOrganizationRecommendationAccountsInputSchema, _params);
        
        const command = new ListOrganizationRecommendationAccountsCommand({
          organizationRecommendationIdentifier: input.recommendationIdentifier,
          maxResults: input.maxResults,
          nextToken: input.nextToken
        });

        const response = await trustedAdvisorClient.send(command);
        
        if (!response.accountRecommendationLifecycleSummaries) {
          const result = createListResponse([], "listOrganizationRecommendationAccounts", undefined, input.awsAccountId, input.region);
          return formatMcpResponse(uri.href, result);
        }

        const accounts = response.accountRecommendationLifecycleSummaries.map(account => ({
          accountId: account.accountId!,
          name: account.accountRecommendationArn,
          email: undefined
        }));

        const result = createListResponse(
          accounts, 
          "listOrganizationRecommendationAccounts", 
          response.nextToken, 
          input.awsAccountId, 
          input.region
        );
        
        return formatMcpResponse(uri.href, result);
        
      } catch (error) {
        const awsAccountId = Array.isArray(_params?.awsAccountId) ? _params.awsAccountId[0] : _params?.awsAccountId;
        const region = Array.isArray(_params?.region) ? _params.region[0] : _params?.region;
        const errorResponse = handleAwsError(error, "listOrganizationRecommendationAccounts", awsAccountId, region);
        return formatMcpResponse(uri.href, errorResponse);
      }
    }
  );
};

// List organization recommendation resources
const ListOrganizationRecommendationResourcesInputSchema = OrganizationInputSchema.merge(RecommendationInputSchema).merge(PaginationInputSchema).extend({
  status: z.enum(["ok", "warning", "error"]).optional(),
  exclusionStatus: z.enum(["excluded", "included"]).optional(),
  affectedAccountId: z.string().optional()
});

type ListOrganizationRecommendationResourcesInput = z.infer<typeof ListOrganizationRecommendationResourcesInputSchema>;

export const listOrganizationRecommendationResources = (server: McpServer) => {
  server.resource(
    "list-organization-recommendation-resources",
    new ResourceTemplate("trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}/resources", {
      list: async () => ({
        resources: [
          {
            name: "List Organization Recommendation Resources",
            uri: "trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}/resources",
            description: [
              "List Resources of a Recommendation within an Organization. This API only supports prioritized recommendations.",
              "Parameters:",
              "- organizationId: The organization identifier (required)",
              "- recommendationIdentifier: The recommendation identifier (required)",
              "- status: Filter by resource status (ok, warning, error)",
              "- exclusionStatus: Filter by exclusion status (excluded, included)",
              "- affectedAccountId: Filter by specific account ID",
              "- maxResults: Maximum number of results (1-200, default: 100)",
              "- nextToken: Token for pagination",
              "- language: Language code (en, ja, fr, zh) - defaults to 'en'",
              "- awsAccountId: (optional) AWS Account ID for metadata",
              "- region: (optional) AWS region - defaults to 'us-east-1'",
              "⚠️ Requires Enterprise Support plan.",
              "⚠️ Only supports prioritized recommendations."
            ].join(" "),
            mimeType: "application/json"
          }
        ]
      })
    }),
    async (uri, _params) => {
      try {
        const input = parseInput<ListOrganizationRecommendationResourcesInput>(ListOrganizationRecommendationResourcesInputSchema, _params);
        
        const command = new ListOrganizationRecommendationResourcesCommand({
          organizationRecommendationIdentifier: input.recommendationIdentifier,
          status: input.status,
          exclusionStatus: input.exclusionStatus,
          affectedAccountId: input.affectedAccountId,
          maxResults: input.maxResults,
          nextToken: input.nextToken
        });

        const response = await trustedAdvisorClient.send(command);
        
        if (!response.organizationRecommendationResourceSummaries) {
          const result = createListResponse([], "listOrganizationRecommendationResources", undefined, input.awsAccountId, input.region);
          return formatMcpResponse(uri.href, result);
        }

        const resources = response.organizationRecommendationResourceSummaries.map(resource => ({
          id: resource.id!,
          arn: resource.arn,
          awsResourceId: resource.awsResourceId,
          lastUpdated: resource.lastUpdatedAt?.toISOString(),
          status: resource.status!,
          region: resource.regionCode,
          metadata: resource.metadata,
          exclusionStatus: resource.exclusionStatus
        }));

        const result = createListResponse(
          resources, 
          "listOrganizationRecommendationResources", 
          response.nextToken, 
          input.awsAccountId, 
          input.region
        );
        
        return formatMcpResponse(uri.href, result);
        
      } catch (error) {
        const awsAccountId = Array.isArray(_params?.awsAccountId) ? _params.awsAccountId[0] : _params?.awsAccountId;
        const region = Array.isArray(_params?.region) ? _params.region[0] : _params?.region;
        const errorResponse = handleAwsError(error, "listOrganizationRecommendationResources", awsAccountId, region);
        return formatMcpResponse(uri.href, errorResponse);
      }
    }
  );
};

// Update organization recommendation lifecycle
const UpdateOrganizationRecommendationLifecycleInputSchema = OrganizationInputSchema.merge(RecommendationInputSchema).merge(UpdateLifecycleInputSchema);
type UpdateOrganizationRecommendationLifecycleInput = z.infer<typeof UpdateOrganizationRecommendationLifecycleInputSchema>;

export const updateOrganizationRecommendationLifecycle = (server: McpServer) => {
  server.resource(
    "update-organization-recommendation-lifecycle",
    new ResourceTemplate("trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}/lifecycle", {
      list: async () => ({
        resources: [
          {
            name: "Update Organization Recommendation Lifecycle",
            uri: "trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}/lifecycle",
            description: [
              "Update the lifecycle of a Recommendation within an Organization. This API only supports prioritized recommendations.",
              "Parameters:",
              "- organizationId: The organization identifier (required)",
              "- recommendationIdentifier: The recommendation identifier (required)",
              "- lifecycleStage: New lifecycle stage (pending_response, in_progress, dismissed, resolved) (required)",
              "- updateReason: Reason for the update (optional)",
              "- updateReasonCode: Reason code (non_critical_account, temporary_account, valid_business_case, etc.) (optional)",
              "- language: Language code (en, ja, fr, zh) - defaults to 'en'",
              "- awsAccountId: (optional) AWS Account ID for metadata",
              "- region: (optional) AWS region - defaults to 'us-east-1'",
              "⚠️ Requires Enterprise Support plan.",
              "⚠️ Only supports prioritized recommendations."
            ].join(" "),
            mimeType: "application/json"
          }
        ]
      })
    }),
    async (uri, _params) => {
      try {
        const input = parseInput<UpdateOrganizationRecommendationLifecycleInput>(UpdateOrganizationRecommendationLifecycleInputSchema, _params);
        
        const command = new UpdateOrganizationRecommendationLifecycleCommand({
          organizationRecommendationIdentifier: input.recommendationIdentifier,
          lifecycleStage: input.lifecycleStage,
          updateReason: input.updateReason,
          updateReasonCode: input.updateReasonCode
        });

        const response = await trustedAdvisorClient.send(command);
        
        const result = createUpdateResponse(
          true,
          "updateOrganizationRecommendationLifecycle",
          1,
          undefined,
          input.awsAccountId,
          input.region
        );
        
        return formatMcpResponse(uri.href, result);
        
      } catch (error) {
        const awsAccountId = Array.isArray(_params?.awsAccountId) ? _params.awsAccountId[0] : _params?.awsAccountId;
        const region = Array.isArray(_params?.region) ? _params.region[0] : _params?.region;
        const errorResponse = handleAwsError(error, "updateOrganizationRecommendationLifecycle", awsAccountId, region);
        return formatMcpResponse(uri.href, errorResponse);
      }
    }
  );
};
