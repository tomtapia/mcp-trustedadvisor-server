import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BatchUpdateRecommendationResourceExclusionCommand } from "@aws-sdk/client-trustedadvisor";
import { trustedAdvisorClient } from "../clients/awsClients.js";
import { 
  RecommendationInputSchema 
} from "../schemas/trustedAdvisorSchemas.js";
import { 
  parseInput, 
  createUpdateResponse, 
  handleAwsError, 
  formatMcpResponse 
} from "../utils/responseUtils.js";

// Input schema for batch updating resource exclusions
const BatchUpdateExclusionInputSchema = RecommendationInputSchema.extend({
  resourceExclusions: z.array(z.object({
    arn: z.string(),
    isExcluded: z.boolean()
  })).min(1).max(100)
});

type BatchUpdateExclusionInput = z.infer<typeof BatchUpdateExclusionInputSchema>;

export const batchUpdateRecommendationResourceExclusion = (server: McpServer) => {
  server.resource(
    "batch-update-recommendation-resource-exclusion",
    new ResourceTemplate("trusted-advisor://recommendations/{recommendationIdentifier}/resource-exclusions", {
      list: async () => ({
        resources: [
          {
            name: "Batch Update Recommendation Resource Exclusion",
            uri: "trusted-advisor://recommendations/{recommendationIdentifier}/resource-exclusions",
            description: [
              "Update one or more exclusion status for a list of recommendation resources.",
              "Parameters:",
              "- recommendationIdentifier: The identifier for the recommendation (required)",
              "- resourceExclusions: Array of resources with ARN and exclusion status (required, max 100)",
              "  - arn: Resource ARN (required)",
              "  - isExcluded: Whether the resource should be excluded (required)",
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
        const input = parseInput<BatchUpdateExclusionInput>(BatchUpdateExclusionInputSchema, _params);
        
        const command = new BatchUpdateRecommendationResourceExclusionCommand({
          recommendationResourceExclusions: input.resourceExclusions.map((exclusion: any) => ({
            arn: exclusion.arn,
            isExcluded: exclusion.isExcluded
          }))
        });

        const response = await trustedAdvisorClient.send(command);
        
        const errors = response.batchUpdateRecommendationResourceExclusionErrors?.map(error => ({
          resourceId: error.arn || "unknown",
          errorCode: error.errorCode || "UnknownError",
          errorMessage: error.errorMessage || "Unknown error occurred"
        }));

        const successCount = input.resourceExclusions.length - (errors?.length || 0);
        
        const result = createUpdateResponse(
          errors?.length === 0 || !errors,
          "batchUpdateRecommendationResourceExclusion",
          successCount,
          errors,
          input.awsAccountId,
          input.region
        );
        
        return formatMcpResponse(uri.href, result);
        
      } catch (error) {
        const awsAccountId = Array.isArray(_params?.awsAccountId) ? _params.awsAccountId[0] : _params?.awsAccountId;
        const region = Array.isArray(_params?.region) ? _params.region[0] : _params?.region;
        const errorResponse = handleAwsError(error, "batchUpdateRecommendationResourceExclusion", awsAccountId, region);
        return formatMcpResponse(uri.href, errorResponse);
      }
    }
  );
};
