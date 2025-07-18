import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GetRecommendationCommand } from "@aws-sdk/client-trustedadvisor";
import { trustedAdvisorClient } from "../clients/awsClients.js";

const InputSchema = z.object({
  checkId: z.string(),
  language: z.enum(["en", "ja", "fr", "zh"]).default("en"),
  awsAccountId: z.string().optional()
});

const RecommendationSchema = z.object({
  checkId: z.string(),
  type: z.string(),
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  lifecycleStage: z.string().optional(),
  pillars: z.array(z.string()).optional(),
  source: z.string().optional(),
  awsServices: z.array(z.string()).optional(),
  resourcesAggregates: z.object({
    errorCount: z.number().optional(),
    okCount: z.number().optional(),
    warningCount: z.number().optional()
  }).optional()
});

export const getTrustedAdvisorRecommendation = (server: McpServer) => {
  server.resource(
    "get-trusted-advisor-recommendation",
    new ResourceTemplate("trusted-advisor://recommendation/{checkId}", {
      list: async () => ({
        resources: [
          {
            name: "Get Trusted Advisor Recommendation",
            uri: "trusted-advisor://recommendation/{checkId}",
            description: [
              "Get a specific Trusted Advisor recommendation by check ID.",
              "Returns detailed information about the recommendation including status,",
              "lifecycle stage, AWS services affected, and resource counts.",
              "⚠️ This operation requires the new Trusted Advisor API (not Support API).",
              "⚠️ Requires a Business, Enterprise On-Ramp, or Enterprise Support plan.",
              "⚠️ This operation is only available in the US East (N. Virginia) region (us-east-1)."
            ].join(" "),
            mimeType: "application/json"
          }
        ]
      })
    }),
    async (uri, params) => {
      const input = InputSchema.parse(params);

      const command = new GetRecommendationCommand({
        recommendationIdentifier: input.checkId
      });

      try {
        const response = await trustedAdvisorClient.send(command);
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(response.recommendation, null, 2),
            mimeType: "application/json"
          }]
        };
      } catch (error) {
        // Handle specific AWS errors
        if (error instanceof Error) {
          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify({
                error: error.name,
                message: error.message,
                checkId: input.checkId
              }, null, 2),
              mimeType: "application/json"
            }]
          };
        }
        throw error;
      }
    }
  );
};
