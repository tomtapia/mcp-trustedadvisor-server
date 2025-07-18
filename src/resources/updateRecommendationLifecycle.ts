import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { UpdateRecommendationLifecycleCommand } from "@aws-sdk/client-trustedadvisor";
import { trustedAdvisorClient } from "../clients/awsClients.js";
import { 
  RecommendationInputSchema, 
  UpdateLifecycleInputSchema 
} from "../schemas/trustedAdvisorSchemas.js";
import { 
  parseInput, 
  createUpdateResponse, 
  handleAwsError, 
  formatMcpResponse 
} from "../utils/responseUtils.js";

// Input schema for updating recommendation lifecycle
const UpdateRecommendationLifecycleInputSchema = RecommendationInputSchema.merge(UpdateLifecycleInputSchema);
type UpdateRecommendationLifecycleInput = z.infer<typeof UpdateRecommendationLifecycleInputSchema>;

export const updateRecommendationLifecycle = (server: McpServer) => {
  server.resource(
    "update-recommendation-lifecycle",
    new ResourceTemplate("trusted-advisor://recommendations/{recommendationIdentifier}/lifecycle", {
      list: async () => ({
        resources: [
          {
            name: "Update Recommendation Lifecycle",
            uri: "trusted-advisor://recommendations/{recommendationIdentifier}/lifecycle",
            description: [
              "Update the lifecycle of a Trusted Advisor Recommendation. This API only supports prioritized recommendations.",
              "Parameters:",
              "- recommendationIdentifier: The identifier for the recommendation (required)",
              "- lifecycleStage: New lifecycle stage (pending_response, in_progress, dismissed, resolved) (required)",
              "- updateReason: Reason for the update (optional)",
              "- updateReasonCode: Reason code (non_critical_account, temporary_account, valid_business_case, etc.) (optional)",
              "- language: Language code (en, ja, fr, zh) - defaults to 'en'",
              "- awsAccountId: (optional) AWS Account ID for metadata",
              "- region: (optional) AWS region - defaults to 'us-east-1'",
              "⚠️ Requires a Business, Enterprise On-Ramp, or Enterprise Support plan.",
              "⚠️ Only supports prioritized recommendations."
            ].join(" "),
            mimeType: "application/json"
          }
        ]
      })
    }),
    async (uri, _params) => {
      try {
        const input = parseInput<UpdateRecommendationLifecycleInput>(UpdateRecommendationLifecycleInputSchema, _params);
        
        const command = new UpdateRecommendationLifecycleCommand({
          recommendationIdentifier: input.recommendationIdentifier,
          lifecycleStage: input.lifecycleStage,
          updateReason: input.updateReason,
          updateReasonCode: input.updateReasonCode
        });

        const response = await trustedAdvisorClient.send(command);
        
        const result = createUpdateResponse(
          true,
          "updateRecommendationLifecycle",
          1,
          undefined,
          input.awsAccountId,
          input.region
        );
        
        return formatMcpResponse(uri.href, result);
        
      } catch (error) {
        const awsAccountId = Array.isArray(_params?.awsAccountId) ? _params.awsAccountId[0] : _params?.awsAccountId;
        const region = Array.isArray(_params?.region) ? _params.region[0] : _params?.region;
        const errorResponse = handleAwsError(error, "updateRecommendationLifecycle", awsAccountId, region);
        return formatMcpResponse(uri.href, errorResponse);
      }
    }
  );
};
