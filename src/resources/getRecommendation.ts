import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GetRecommendationCommand } from "@aws-sdk/client-trustedadvisor";
import { trustedAdvisorClient } from "../clients/awsClients.js";
import { 
  RecommendationInputSchema, 
  RecommendationSchema 
} from "../schemas/trustedAdvisorSchemas.js";
import { 
  parseInput, 
  createSingleResponse, 
  handleAwsError, 
  formatMcpResponse 
} from "../utils/responseUtils.js";

type GetRecommendationInput = z.infer<typeof RecommendationInputSchema>;

export const getRecommendation = (server: McpServer) => {
  server.resource(
    "get-recommendation",
    new ResourceTemplate("trusted-advisor://recommendations/{recommendationIdentifier}", {
      list: async () => ({
        resources: [
          {
            name: "Get Trusted Advisor Recommendation",
            uri: "trusted-advisor://recommendations/{recommendationIdentifier}",
            description: [
              "Get a specific Trusted Advisor Recommendation.",
              "Parameters:",
              "- recommendationIdentifier: The identifier for the recommendation (required)",
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
        const input = parseInput<GetRecommendationInput>(RecommendationInputSchema, _params);
        
        const command = new GetRecommendationCommand({
          recommendationIdentifier: input.recommendationIdentifier
        });

        const response = await trustedAdvisorClient.send(command);
        
        if (!response.recommendation) {
          const errorResponse = {
            error: "Recommendation not found",
            message: `No recommendation found with identifier: ${input.recommendationIdentifier}`,
            code: "RecommendationNotFound",
            metadata: {
              timestamp: new Date().toISOString(),
              awsAccountId: input.awsAccountId,
              region: input.region,
              operationType: "getRecommendation"
            }
          };
          return formatMcpResponse(uri.href, errorResponse);
        }

        const recommendation = {
          id: response.recommendation.id!,
          checkId: response.recommendation.checkArn || "unknown",
          type: response.recommendation.type!,
          name: response.recommendation.name,
          description: response.recommendation.description,
          status: response.recommendation.status!,
          createdAt: response.recommendation.createdAt?.toISOString(),
          updatedAt: response.recommendation.lastUpdatedAt?.toISOString(),
          lifecycleStage: response.recommendation.lifecycleStage,
          updateReason: response.recommendation.updateReason,
          updateReasonCode: response.recommendation.updateReasonCode,
          pillar: response.recommendation.pillars?.[0] || "unknown",
          source: response.recommendation.source,
          awsServices: response.recommendation.awsServices || [],
          resourcesAggregates: response.recommendation.resourcesAggregates ? {
            errorCount: response.recommendation.resourcesAggregates.errorCount,
            okCount: response.recommendation.resourcesAggregates.okCount,
            warningCount: response.recommendation.resourcesAggregates.warningCount
          } : undefined
        };

        const result = createSingleResponse(
          recommendation, 
          "getRecommendation", 
          input.awsAccountId, 
          input.region
        );
        
        return formatMcpResponse(uri.href, result);
        
      } catch (error) {
        const awsAccountId = Array.isArray(_params?.awsAccountId) ? _params.awsAccountId[0] : _params?.awsAccountId;
        const region = Array.isArray(_params?.region) ? _params.region[0] : _params?.region;
        const errorResponse = handleAwsError(error, "getRecommendation", awsAccountId, region);
        return formatMcpResponse(uri.href, errorResponse);
      }
    }
  );
};
