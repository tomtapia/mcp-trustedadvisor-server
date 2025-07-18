import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DescribeTrustedAdvisorChecksCommand } from "@aws-sdk/client-support";
import { supportClient } from "../clients/awsClients.js";

// Schema for input parameters
const InputSchema = z.object({
  language: z.enum(["en", "ja", "fr", "zh"]).default("en"),
  awsAccountId: z.string().optional(),
  region: z.string().optional().default("us-east-1")
});

// Schema for individual Trusted Advisor check
const CheckSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  metadata: z.array(z.string()),
  defaultRefreshIntervalInSec: z.number()
});

// Enhanced output schema with metadata
const OutputSchema = z.object({
  uri: z.string(),
  checks: z.array(CheckSchema),
  totalCount: z.number(),
  metadata: z.object({
    timestamp: z.string(),
    language: z.string(),
    awsAccountId: z.string().optional(),
    region: z.string()
  })
});

export const listTrustedAdvisorChecks = (server: McpServer) => {
  server.resource(
    "list-trusted-advisor-checks",
    new ResourceTemplate("trusted-advisor://checks", {
      list: async () => ({
        resources: [
          {
            name: "List Trusted Advisor Checks",
            uri: "trusted-advisor://checks",
            description: [
              "Returns information about all available Trusted Advisor checks,",
              "including the name, ID, category, description, and metadata.",
              "Parameters:",
              "- language: Language code (en, ja, fr, zh) - defaults to 'en'",
              "- awsAccountId: (optional) AWS Account ID for metadata",
              "- region: (optional) AWS region - defaults to 'us-east-1'",
              "⚠️ This operation is only available in the US East (N. Virginia) region (us-east-1).",
              "⚠️ Requires a Business, Enterprise On-Ramp, or Enterprise Support plan.",
              "Use the check ID to uniquely identify a check, since names/descriptions may change."
            ].join(" "),
            mimeType: "application/json"
          }
        ]
      })
    }),    
    async (uri, _params) => {
      try {
        const input = InputSchema.parse(_params);

        const command = new DescribeTrustedAdvisorChecksCommand({ 
          language: input.language 
        });

        const response = await supportClient.send(command);
        
        if (!response.checks) {
          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify({
                error: "No checks found",
                message: "The AWS Support API returned no Trusted Advisor checks."
              }, null, 2),
              mimeType: "application/json"
            }]
          };
        }

        const result = {
          uri: uri.href,
          checks: response.checks,
          totalCount: response.checks.length,
          metadata: {
            timestamp: new Date().toISOString(),
            language: input.language,
            awsAccountId: input.awsAccountId,
            region: input.region
          }
        };

        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(result, null, 2),
            mimeType: "application/json"
          }]
        };
      } catch (error) {
        const errorResponse = {
          error: "Failed to retrieve Trusted Advisor checks",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: (error as any)?.name || "UnknownError",
          details: (error as any)?.Code || null
        };

        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(errorResponse, null, 2),
            mimeType: "application/json"
          }]
        };
      }
    }
  );
};
