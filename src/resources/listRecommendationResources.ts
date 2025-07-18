import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ListRecommendationResourcesCommand } from "@aws-sdk/client-trustedadvisor";
import { trustedAdvisorClient } from "../clients/awsClients.js";
import { 
  RecommendationInputSchema, 
  PaginationInputSchema, 
  ResourceSchema 
} from "../schemas/trustedAdvisorSchemas.js";
import { 
  parseInput, 
  createListResponse, 
  handleAwsError, 
  formatMcpResponse 
} from "../utils/responseUtils.js";

// Input schema for listing recommendation resources
const ListRecommendationResourcesInputSchema = RecommendationInputSchema.merge(PaginationInputSchema).extend({
  status: z.enum(["ok", "warning", "error"]).optional(),
  exclusionStatus: z.enum(["excluded", "included"]).optional()
});

type ListRecommendationResourcesInput = z.infer<typeof ListRecommendationResourcesInputSchema>;

export const listRecommendationResources = (server: McpServer) => {
  server.resource(
    "list-recommendation-resources",
    new ResourceTemplate("trusted-advisor://recommendations/{recommendationIdentifier}/resources", {
      list: async () => ({
        resources: [
          {
            name: "List Recommendation Resources",
            uri: "trusted-advisor://recommendations/{recommendationIdentifier}/resources",
            description: [
              "List Resources of a Trusted Advisor Recommendation.",
              "Parameters:",
              "- recommendationIdentifier: The identifier for the recommendation (required)",
              "- status: Filter by resource status (ok, warning, error)",
              "- exclusionStatus: Filter by exclusion status (excluded, included)",
              "- maxResults: Maximum number of results (1-200, default: 100)",
              "- nextToken: Token for pagination",
              "- language: Language code (en, ja, fr, zh) - defaults to 'en'",
              "- awsAccountId: (optional) AWS Account ID for metadata",
              "- region: (optional) AWS region - defaults to 'us-east-1'",
              "⚠️ Requires a Business, Enterprise On-Ramp, or Enterprise Support plan."
            ].join(" "),
            mimeType: "application/json"
          }
        ]
      })
    }),
    async (uri, _params) => {
      try {
        const input = parseInput<ListRecommendationResourcesInput>(ListRecommendationResourcesInputSchema, _params);
        
        const command = new ListRecommendationResourcesCommand({
          recommendationIdentifier: input.recommendationIdentifier,
          status: input.status,
          exclusionStatus: input.exclusionStatus,
          maxResults: input.maxResults,
          nextToken: input.nextToken
        });

        const response = await trustedAdvisorClient.send(command);
        
        if (!response.recommendationResourceSummaries) {
          const result = createListResponse([], "listRecommendationResources", undefined, input.awsAccountId, input.region);
          return formatMcpResponse(uri.href, result);
        }

        const resources = response.recommendationResourceSummaries.map(resource => ({
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
          "listRecommendationResources", 
          response.nextToken, 
          input.awsAccountId, 
          input.region
        );
        
        return formatMcpResponse(uri.href, result);
        
      } catch (error) {
        const awsAccountId = Array.isArray(_params?.awsAccountId) ? _params.awsAccountId[0] : _params?.awsAccountId;
        const region = Array.isArray(_params?.region) ? _params.region[0] : _params?.region;
        const errorResponse = handleAwsError(error, "listRecommendationResources", awsAccountId, region);
        return formatMcpResponse(uri.href, errorResponse);
      }
    }
  );
};
