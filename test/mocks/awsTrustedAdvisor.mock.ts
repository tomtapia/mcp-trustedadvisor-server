/**
 * AWS Trusted Advisor Client Mock
 * Provides mock implementations for AWS Trusted Advisor service calls
 */

export const mockTrustedAdvisorClient = {
  send: jest.fn(),
  config: {
    region: 'us-east-1'
  }
};

export const mockTrustedAdvisorResponses = {
  // Mock response for ListChecks
  listChecks: {
    checkSummaries: [
      {
        id: 'trusted-advisor-check-1',
        name: 'EC2 Security Groups',
        description: 'Checks for security group configurations',
        pillars: ['security'],
        awsServices: ['ec2'],
        source: 'trusted_advisor',
        metadata: {
          checkId: 'trusted-advisor-check-1',
          status: 'active'
        }
      },
      {
        id: 'trusted-advisor-check-2',
        name: 'Underutilized EBS Volumes',
        description: 'Identifies underutilized EBS volumes',
        pillars: ['cost_optimizing'],
        awsServices: ['ec2'],
        source: 'trusted_advisor',
        metadata: {
          checkId: 'trusted-advisor-check-2',
          status: 'active'
        }
      }
    ],
    nextToken: undefined
  },

  // Mock response for ListRecommendations
  listRecommendations: {
    recommendationSummaries: [
      {
        id: 'recommendation-1',
        checkArn: 'arn:aws:trustedadvisor:us-east-1:123456789012:check/trusted-advisor-check-1',
        type: 'security',
        name: 'Security Group Configuration',
        status: 'warning',
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        lifecycleStage: 'in_progress',
        pillars: ['security'],
        source: 'trusted_advisor',
        awsServices: ['ec2'],
        resourcesAggregates: {
          errorCount: 0,
          okCount: 10,
          warningCount: 5
        }
      }
    ],
    nextToken: undefined
  },

  // Mock response for GetRecommendation
  getRecommendation: {
    recommendation: {
      id: 'recommendation-1',
      checkArn: 'arn:aws:trustedadvisor:us-east-1:123456789012:check/trusted-advisor-check-1',
      type: 'security',
      name: 'Security Group Configuration',
      description: 'Review security group configurations for potential security risks',
      status: 'warning',
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      lifecycleStage: 'in_progress',
      updateReason: 'New security group detected',
      updateReasonCode: 'new_resource_detected',
      pillars: ['security'],
      source: 'trusted_advisor',
      awsServices: ['ec2'],
      resourcesAggregates: {
        errorCount: 0,
        okCount: 10,
        warningCount: 5
      }
    }
  },

  // Mock response for ListRecommendationResources
  listRecommendationResources: {
    recommendationResourceSummaries: [
      {
        id: 'resource-1',
        arn: 'arn:aws:ec2:us-east-1:123456789012:security-group/sg-12345678',
        awsResourceId: 'sg-12345678',
        lastUpdatedAt: new Date(),
        status: 'warning',
        metadata: {
          'Group Name': 'test-security-group',
          'Protocol': 'TCP',
          'Port Range': '22'
        }
      }
    ],
    nextToken: undefined
  }
};

// Create AWS SDK mock
export const createMockTrustedAdvisorClient = () => {
  const client = { ...mockTrustedAdvisorClient };
  
  // Reset all mocks
  client.send.mockReset();
  
  return client;
};
