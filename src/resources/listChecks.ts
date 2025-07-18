import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListChecksCommand } from "@aws-sdk/client-trustedadvisor";
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

// Parameter specification for listChecks operation
const LIST_CHECKS_PARAMS: ParamSpec[] = [
  ...CommonParamSpecs.language,
  ...CommonParamSpecs.pagination,
  { name: 'awsService', type: 'string', required: false },
  { name: 'pillar', type: 'string', required: false },
  { name: 'source', type: 'string', required: false },
  { name: 'awsAccountId', type: 'string', required: false },
  { name: 'region', type: 'string', required: false, defaultValue: 'us-east-1' }
];

export const listChecks = (server: McpServer) => {
  server.resource(
    "list-checks",
    new ResourceTemplate("trusted-advisor://checks/list", {
      list: async () => ({
        resources: [
          {
            name: "List Trusted Advisor Checks",
            uri: "trusted-advisor://checks/list",
            description: [
              "List a filterable set of Trusted Advisor Checks.",
              "Parameters:",
              "- awsService: Filter by AWS service",
              "- pillar: Filter by pillar (cost_optimizing, performance, security, etc.)",
              "- source: Filter by source (aws_config, compute_optimizer, etc.)",
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
        const params = extractParameters(_params, LIST_CHECKS_PARAMS);
        
        // Build command input with only defined values
        const commandInput: any = {};
        if (params.language) commandInput.language = params.language;
        if (params.awsService) commandInput.awsService = params.awsService;
        if (params.pillar) commandInput.pillar = params.pillar;
        if (params.source) commandInput.source = params.source;
        if (params.maxResults) commandInput.maxResults = params.maxResults;
        if (params.nextToken) commandInput.nextToken = params.nextToken;
        
        const command = new ListChecksCommand(commandInput);

        const response = await trustedAdvisorClient.send(command);
        
        if (!response.checkSummaries) {
          const result = createListResponse([], "listChecks", undefined, params.awsAccountId as string, params.region as string);
          return formatMcpResponse(uri.href, result);
        }

        const checks = response.checkSummaries.map(check => ({
          id: check.id!,
          name: check.name!,
          description: check.description!,
          pillar: check.pillars?.[0] || "unknown",
          awsServices: check.awsServices || [],
          source: check.source!,
          metadata: check.metadata
        }));

        const result = createListResponse(
          checks, 
          "listChecks", 
          response.nextToken, 
          params.awsAccountId as string, 
          params.region as string
        );
        
        return formatMcpResponse(uri.href, result);
        
      } catch (error) {
        // Fallback parameter extraction for error handling
        const awsAccountId = Array.isArray(_params?.awsAccountId) ? _params.awsAccountId[0] : _params?.awsAccountId;
        const region = Array.isArray(_params?.region) ? _params.region[0] : _params?.region || 'us-east-1';
        const errorResponse = handleAwsError(error, "listChecks", awsAccountId, region);
        return formatMcpResponse(uri.href, errorResponse);
      }
    }
  );
};
