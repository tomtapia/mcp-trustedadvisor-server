import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { listTrustedAdvisorChecks } from "./resources/listTrustedAdvisorChecks";

const server = new McpServer({
  name: "TrustedAdvisorServer",
  version: "1.0.0"
});

listTrustedAdvisorChecks(server);

const transport = new StdioServerTransport();
try {
  await server.connect(transport);
} catch (error) {
  console.error("Failed to connect the server:", error);
}
