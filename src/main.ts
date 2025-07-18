import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { listTrustedAdvisorChecks } from "./resources/listTrustedAdvisorChecks.js";
import { getTrustedAdvisorRecommendation } from "./resources/getTrustedAdvisorRecommendation.js";
import { listChecks } from "./resources/listChecks.js";
import { getRecommendation } from "./resources/getRecommendation.js";
import { listRecommendations } from "./resources/listRecommendations.js";
import { listRecommendationResources } from "./resources/listRecommendationResources.js";
import { updateRecommendationLifecycle } from "./resources/updateRecommendationLifecycle.js";
import { batchUpdateRecommendationResourceExclusion } from "./resources/batchUpdateRecommendationResourceExclusion.js";
import { 
  listOrganizationRecommendations,
  getOrganizationRecommendation,
  listOrganizationRecommendationAccounts,
  listOrganizationRecommendationResources,
  updateOrganizationRecommendationLifecycle
} from "./resources/organizationRecommendations.js";

/**
 * MCP Trusted Advisor Server
 * 
 * This server implements the Model Context Protocol to provide access to AWS Trusted Advisor
 * checks and recommendations through a standardized interface.
 */
async function main() {
  const server = new McpServer({
    name: "mcp-trustedadvisor-server",
    version: "1.0.0",
  });

  // Register all available resources
  // Legacy Support API resources
  listTrustedAdvisorChecks(server);
  getTrustedAdvisorRecommendation(server);
  
  // Modern TrustedAdvisor API resources
  listChecks(server);
  getRecommendation(server);
  listRecommendations(server);
  listRecommendationResources(server);
  updateRecommendationLifecycle(server);
  batchUpdateRecommendationResourceExclusion(server);
  
  // Organization resources (Enterprise Support required)
  listOrganizationRecommendations(server);
  getOrganizationRecommendation(server);
  listOrganizationRecommendationAccounts(server);
  listOrganizationRecommendationResources(server);
  updateOrganizationRecommendationLifecycle(server);

  // Use StdioServerTransport for MCP communication
  const transport = new StdioServerTransport();
  
  try {
    console.error("Starting MCP Trusted Advisor Server...");
    await server.connect(transport);
    console.error("MCP Trusted Advisor Server started successfully");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
