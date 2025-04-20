import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DescribeTrustedAdvisorChecksCommand } from "@aws-sdk/client-support";
import { supportClient } from "../clients/awsSupportClient.js";

const InputSchema = z.object({
  language: z.enum(["en", "ja", "fr", "zh"]).default("en")
});

const CheckSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  metadata: z.array(z.string()),
  defaultRefreshIntervalInSec: z.number()
});

const OutputSchema = z.object({
  uri: z.string(),
  checks: z.array(CheckSchema)
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
              "You must specify a language code in the query parameters (e.g., ?language=en).",
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
      const input = InputSchema.parse(_params);

      const command = new DescribeTrustedAdvisorChecksCommand({ 
        language: input.language 
      });

      const { checks } = await supportClient.send(command);
  
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(checks, null, 2),
          mimeType: "application/json"
        }]
      };
    }
  );
};
