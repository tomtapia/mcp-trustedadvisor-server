import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListRecommendationsCommand } from "@aws-sdk/client-trustedadvisor";
import { trustedAdvisorClient } from "../clients/awsClients.js";
import { 
  createListResponse, 
  handleAwsError, 
  formatMcpResponse 
} from "../utils/responseUtils.js";
import { 
  extractParameters, 
  CommonParamSpecs,
  ParamSpec 
} from "../utils/parameterUtils.js";
import { 
  CacheInstances, 
  CacheKeys, 
  withCache 
} from "../utils/cacheUtils.js";

// Parameter specification for listRecommendations operation
const LIST_RECOMMENDATIONS_PARAMS: ParamSpec[] = [
  ...CommonParamSpecs.language,
  ...CommonParamSpecs.pagination,
  { name: 'awsService', type: 'string', required: false },
  { name: 'checkId', type: 'string', required: false },
  { name: 'pillar', type: 'string', required: false },
  { name: 'source', type: 'string', required: false },
  { name: 'status', type: 'string', required: false },
  { name: 'lifecycleStage', type: 'string', required: false },
  { name: 'awsAccountId', type: 'string', required: false },
  { name: 'region', type: 'string', required: false, defaultValue: 'us-east-1' }
];

export const listRecommendations = (server: McpServer) => {
  server.resource(
    "list-recommendations",
    new ResourceTemplate("trusted-advisor://recommendations", {
      list: async () => ({
        resources: [
          {
            name: "List Trusted Advisor Recommendations",
            uri: "trusted-advisor://recommendations",
            description: [
              "List a filterable set of Trusted Advisor Recommendations.",
              "Parameters:",
              "- awsService: Filter by AWS service",
              "- checkId: Filter by specific check ID",
              "- pillar: Filter by pillar (cost_optimizing, performance, security, etc.)",
              "- source: Filter by source (aws_config, compute_optimizer, etc.)",
              "- status: Filter by status (ok, warning, error)",
              "- lifecycleStage: Filter by lifecycle stage (in_progress, pending_response, dismissed, resolved)",
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
        // Use optimized parameter extraction
        const params = extractParameters(_params, LIST_RECOMMENDATIONS_PARAMS);
        
        // Cache-aware execution
        const result = await withCache(
          CacheInstances.recommendations,
          CacheKeys.LIST_RECOMMENDATIONS,
          async () => {
            // Build command input with only defined values
            const commandInput: any = {};
            if (params.awsService) commandInput.awsService = params.awsService;
            if (params.checkId) commandInput.checkId = params.checkId;
            if (params.pillar) commandInput.pillar = params.pillar;
            if (params.source) commandInput.source = params.source;
            if (params.status) commandInput.status = params.status;
            if (params.lifecycleStage) commandInput.lifecycleStage = params.lifecycleStage;
            if (params.maxResults) commandInput.maxResults = params.maxResults;
            if (params.nextToken) commandInput.nextToken = params.nextToken;
            
            const command = new ListRecommendationsCommand(commandInput);
            const response = await trustedAdvisorClient.send(command);
            
            if (!response.recommendationSummaries) {
              return createListResponse([], "listRecommendations", undefined, params.awsAccountId as string, params.region as string);
            }

            const recommendations = response.recommendationSummaries.map(rec => ({
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

            return createListResponse(
              recommendations, 
              "listRecommendations", 
              response.nextToken, 
              params.awsAccountId as string, 
              params.region as string
            );
          },
          params as Record<string, unknown>
        );
        
        return formatMcpResponse(uri.href, result);
        
      } catch (error) {
        // Fallback parameter extraction for error handling
        const awsAccountId = Array.isArray(_params?.awsAccountId) ? _params.awsAccountId[0] : _params?.awsAccountId;
        const region = Array.isArray(_params?.region) ? _params.region[0] : _params?.region || 'us-east-1';
        const errorResponse = handleAwsError(error, "listRecommendations", awsAccountId, region);
        return formatMcpResponse(uri.href, errorResponse);
      }
    }
  );
};
