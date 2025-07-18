/**
 * AWS Support Client Mock
 * Provides mock implementations for AWS Support service calls
 */

export const mockSupportClient = {
  send: jest.fn(),
  config: {
    region: 'us-east-1'
  }
};

export const mockSupportResponses = {
  // Mock response for DescribeTrustedAdvisorChecks
  describeTrustedAdvisorChecks: {
    checks: [
      {
        id: 'test-check-1',
        name: 'Test Security Group Check',
        description: 'Checks for security group configurations',
        category: 'security',
        metadata: ['Region', 'Security Group ID', 'Status']
      },
      {
        id: 'test-check-2',
        name: 'Test Cost Optimization Check',
        description: 'Identifies underutilized resources',
        category: 'cost_optimizing',
        metadata: ['Region', 'Resource Type', 'Estimated Savings']
      }
    ]
  },

  // Mock response for DescribeTrustedAdvisorCheckResult
  describeTrustedAdvisorCheckResult: {
    result: {
      checkId: 'test-check-1',
      timestamp: new Date().toISOString(),
      status: 'warning',
      resourcesSummary: {
        resourcesProcessed: 100,
        resourcesFlagged: 5,
        resourcesIgnored: 2,
        resourcesSuppressed: 1
      },
      categorySpecificSummary: {
        costOptimizing: {
          estimatedMonthlySavings: 150.00,
          estimatedPercentMonthlySavings: 10.5
        }
      },
      flaggedResources: [
        {
          status: 'warning',
          region: 'us-east-1',
          resourceId: 'sg-12345678',
          isSuppressed: false,
          metadata: ['us-east-1', 'sg-12345678', 'Open to 0.0.0.0/0']
        }
      ]
    }
  }
};

// Create AWS SDK mock
export const createMockSupportClient = () => {
  const client = { ...mockSupportClient };
  
  // Reset all mocks
  client.send.mockReset();
  
  return client;
};
