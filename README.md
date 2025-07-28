# MCP Trusted Advisor Server

A Model Context Protocol (MCP) server that provides comprehensive access to AWS Trusted Advisor through both legacy Support API and modern TrustedAdvisor API endpoints.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tomtapia/mcp-trustedadvisor-server)

## Overview

This server implements the Model Context Protocol to provide standardized access to AWS Trusted Advisor functionality, including:

- **Legacy Support API**: Compatible with existing Trusted Advisor integrations
- **Modern TrustedAdvisor API**: Enhanced functionality with better performance and features
- **Organization Support**: Enterprise-level features for AWS Organizations
- **Resource Management**: Detailed resource analysis and lifecycle management

## Features

### 🔍 **Check Management**

- List all available Trusted Advisor checks with filtering
- Get detailed information about specific checks
- Support for multiple languages (en, ja, fr, zh)

### 📊 **Recommendations**

- List and filter recommendations by various criteria
- Get detailed recommendation information
- Resource-level analysis and management
- Lifecycle management (in progress, dismissed, resolved, etc.)

### 🏢 **Organization Support** (Enterprise Support Required)

- Organization-wide recommendation aggregation
- Multi-account resource management
- Organization-level lifecycle management
- Account-specific resource filtering

### ⚙️ **Resource Operations**

- Batch exclusion/inclusion of resources
- Resource status tracking
- Metadata and detailed resource information
- Cross-account resource visibility

## Available Resources

### Legacy Support API Resources

#### `list-trusted-advisor-checks`

Lists all available Trusted Advisor checks using the legacy Support API.

- **URI**: `trusted-advisor://checks`
- **Parameters**: `language`, `awsAccountId`, `region`
- **Filters**: Language-based filtering
- **Requirements**: Business, Enterprise On-Ramp, or Enterprise Support plan

#### `get-trusted-advisor-recommendation`

Gets a specific recommendation using the legacy Support API.

- **URI**: `trusted-advisor://recommendations/{checkId}`
- **Parameters**: `checkId`, `language`, `awsAccountId`
- **Requirements**: Business, Enterprise On-Ramp, or Enterprise Support plan

### Modern TrustedAdvisor API Resources

#### `list-checks`

List a filterable set of Trusted Advisor Checks.

- **URI**: `trusted-advisor://checks/list`
- **Parameters**: `awsService`, `pillar`, `source`, `maxResults`, `nextToken`, `language`, `awsAccountId`, `region`
- **Filters**: AWS service, pillar, source
- **Pagination**: Supported with `nextToken`

#### `get-recommendation`

Get a specific Trusted Advisor Recommendation.

- **URI**: `trusted-advisor://recommendations/{recommendationIdentifier}`
- **Parameters**: `recommendationIdentifier`, `language`, `awsAccountId`, `region`
- **Response**: Detailed recommendation with lifecycle information

#### `list-recommendations`

List a filterable set of Trusted Advisor Recommendations.

- **URI**: `trusted-advisor://recommendations`
- **Parameters**: `awsService`, `pillar`, `source`, `status`, `maxResults`, `nextToken`, `language`, `awsAccountId`, `region`
- **Filters**: AWS service, pillar, source, status
- **Pagination**: Supported with `nextToken`

#### `list-recommendation-resources`

List Resources of a Trusted Advisor Recommendation.

- **URI**: `trusted-advisor://recommendations/{recommendationIdentifier}/resources`
- **Parameters**: `recommendationIdentifier`, `status`, `exclusionStatus`, `maxResults`, `nextToken`, `language`, `awsAccountId`, `region`
- **Filters**: Resource status, exclusion status
- **Pagination**: Supported with `nextToken`

#### `update-recommendation-lifecycle`

Update the lifecycle of a Trusted Advisor Recommendation.

- **URI**: `trusted-advisor://recommendations/{recommendationIdentifier}/lifecycle`
- **Parameters**: `recommendationIdentifier`, `lifecycleStage`, `updateReason`, `updateReasonCode`, `language`, `awsAccountId`, `region`
- **Lifecycle Stages**: `pending_response`, `in_progress`, `dismissed`, `resolved`
- **Note**: Only supports prioritized recommendations

#### `batch-update-recommendation-resource-exclusion`

Update one or more exclusion status for a list of recommendation resources.

- **URI**: `trusted-advisor://recommendations/{recommendationIdentifier}/resource-exclusions`
- **Parameters**: `recommendationIdentifier`, `resourceExclusions` (array), `language`, `awsAccountId`, `region`
- **Batch Size**: Up to 100 resources per request
- **Response**: Success/error status for each resource

### Organization Resources (Enterprise Support Required)

#### `list-organization-recommendations`

List a filterable set of Recommendations within an Organization.

- **URI**: `trusted-advisor://organizations/{organizationId}/recommendations`
- **Parameters**: `organizationId`, `awsService`, `pillar`, `source`, `status`, `maxResults`, `nextToken`, `language`, `awsAccountId`, `region`
- **Requirements**: Enterprise Support plan
- **Note**: Only supports prioritized recommendations

#### `get-organization-recommendation`

Get a specific recommendation within an AWS Organizations organization.

- **URI**: `trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}`
- **Parameters**: `organizationId`, `recommendationIdentifier`, `language`, `awsAccountId`, `region`
- **Requirements**: Enterprise Support plan
- **Note**: Only supports prioritized recommendations

#### `list-organization-recommendation-accounts`

Lists the accounts that own the resources for an organization aggregate recommendation.

- **URI**: `trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}/accounts`
- **Parameters**: `organizationId`, `recommendationIdentifier`, `maxResults`, `nextToken`, `language`, `awsAccountId`, `region`
- **Requirements**: Enterprise Support plan
- **Note**: Only supports prioritized recommendations

#### `list-organization-recommendation-resources`

List Resources of a Recommendation within an Organization.

- **URI**: `trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}/resources`
- **Parameters**: `organizationId`, `recommendationIdentifier`, `status`, `exclusionStatus`, `affectedAccountId`, `maxResults`, `nextToken`, `language`, `awsAccountId`, `region`
- **Requirements**: Enterprise Support plan
- **Note**: Only supports prioritized recommendations

#### `update-organization-recommendation-lifecycle`

Update the lifecycle of a Recommendation within an Organization.

- **URI**: `trusted-advisor://organizations/{organizationId}/recommendations/{recommendationIdentifier}/lifecycle`
- **Parameters**: `organizationId`, `recommendationIdentifier`, `lifecycleStage`, `updateReason`, `updateReasonCode`, `language`, `awsAccountId`, `region`
- **Requirements**: Enterprise Support plan
- **Note**: Only supports prioritized recommendations

## Configuration

### Environment Variables

All AWS configuration can be managed through environment variables:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SESSION_TOKEN=your_session_token  # if using temporary credentials

# AWS Configuration
AWS_REGION=us-east-1                   # Default region
AWS_PROFILE=your_profile               # AWS profile to use

# Trusted Advisor specific
AWS_SUPPORT_REGION=us-east-1           # Support API only available in us-east-1
```

### AWS Permissions

The server requires the following AWS permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "support:DescribeTrustedAdvisorChecks",
        "support:DescribeTrustedAdvisorCheckResult",
        "trustedadvisor:ListChecks",
        "trustedadvisor:GetRecommendation",
        "trustedadvisor:ListRecommendations",
        "trustedadvisor:ListRecommendationResources",
        "trustedadvisor:UpdateRecommendationLifecycle",
        "trustedadvisor:BatchUpdateRecommendationResourceExclusion",
        "trustedadvisor:ListOrganizationRecommendations",
        "trustedadvisor:GetOrganizationRecommendation",
        "trustedadvisor:ListOrganizationRecommendationAccounts",
        "trustedadvisor:ListOrganizationRecommendationResources",
        "trustedadvisor:UpdateOrganizationRecommendationLifecycle"
      ],
      "Resource": "*"
    }
  ]
}
```

## Support Plans

Different features require different AWS Support plans:

- **Basic Support**: No Trusted Advisor access
- **Developer Support**: Limited Trusted Advisor access
- **Business Support**: Full individual account Trusted Advisor access
- **Enterprise On-Ramp**: Full individual account Trusted Advisor access
- **Enterprise Support**: Full individual account + Organization-wide Trusted Advisor access

## Error Handling

The server implements comprehensive error handling:

- **AWS API Errors**: Properly formatted error responses with AWS error codes
- **Validation Errors**: Input validation with detailed error messages
- **Network Errors**: Graceful handling of connection issues
- **Permission Errors**: Clear indication of missing permissions

## Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run the server
pnpm start
```

## Usage with MCP

This server is designed to be used with MCP-compatible clients. The server communicates via stdio and provides structured JSON responses for all operations.

### Configuration with AI Clients

#### Claude Desktop

Add this server to your Claude Desktop configuration file:

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "trusted-advisor": {
      "command": "node",
      "args": ["/path/to/mcp-trustedadvisor-server/build/main.js"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": "your_access_key",
        "AWS_SECRET_ACCESS_KEY": "your_secret_key"
      }
    }
  }
}
```

#### Amazon Q Developer

Configure the MCP server in your Amazon Q Developer settings:

```json
{
  "mcp": {
    "servers": {
      "trusted-advisor": {
        "command": "node",
        "args": ["/path/to/mcp-trustedadvisor-server/build/main.js"],
        "environment": {
          "AWS_REGION": "us-east-1",
          "AWS_PROFILE": "your-aws-profile"
        }
      }
    }
  }
}
```

#### Other MCP Clients

For any MCP-compatible client, use these parameters:

```bash
# Command to run the server
node /path/to/mcp-trustedadvisor-server/build/main.js

# Required environment variables
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Optional environment variables
AWS_PROFILE=your-profile
AWS_SESSION_TOKEN=your_session_token
```

### Using the Server

Once configured, you can ask your AI client to:

- **List available checks**: "Show me all available Trusted Advisor checks"
- **Get recommendations**: "What are the current Trusted Advisor recommendations for my account?"
- **Check specific services**: "Show me cost optimization recommendations"
- **Manage resources**: "Update the lifecycle status of recommendation xyz to resolved"
- **Organization insights**: "List all recommendations across my organization"

The AI client will automatically use the appropriate MCP resources based on your requests and provide structured responses with the Trusted Advisor data.

## Architecture

The server follows Clean Code principles with:

- **Modular Design**: Each functionality is in its own module
- **Reusable Components**: Shared schemas, utilities, and error handling
- **Type Safety**: Full TypeScript implementation with strict typing
- **Error Resilience**: Comprehensive error handling and validation
- **Extensibility**: Easy to add new Trusted Advisor features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes following the existing patterns
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
