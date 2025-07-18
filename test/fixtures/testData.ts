/**
 * Test fixtures for AWS Trusted Advisor data
 * Provides realistic test data for different scenarios
 */

export const testData = {
  // Valid MCP parameters for different operations
  mcpParameters: {
    listChecks: {
      language: 'en',
      awsService: 'ec2',
      pillar: 'security',
      maxResults: 10,
      region: 'us-east-1'
    },
    
    listRecommendations: {
      language: 'en',
      checkId: 'trusted-advisor-check-1',
      status: 'warning',
      maxResults: 20,
      awsAccountId: '123456789012',
      region: 'us-west-2'
    },
    
    getRecommendation: {
      recommendationId: 'recommendation-1',
      language: 'en',
      awsAccountId: '123456789012'
    },
    
    listRecommendationResources: {
      recommendationId: 'recommendation-1',
      status: 'warning',
      maxResults: 50
    }
  },

  // Invalid parameters for error testing
  invalidParameters: {
    arrayInsteadOfObject: ['invalid', 'array'],
    missingRequired: {
      language: 'en'
      // missing recommendationId for getRecommendation
    },
    invalidTypes: {
      maxResults: 'not-a-number',
      language: 123
    },
    emptyStrings: {
      recommendationId: '',
      checkId: '   ',
      language: ''
    }
  },

  // Expected response structures
  expectedResponses: {
    listChecks: {
      items: expect.any(Array),
      totalCount: expect.any(Number),
      metadata: {
        timestamp: expect.any(String),
        requestId: expect.any(String),
        operationType: 'listChecks',
        region: expect.any(String)
      }
    },
    
    listRecommendations: {
      items: expect.any(Array),
      totalCount: expect.any(Number),
      metadata: {
        timestamp: expect.any(String),
        requestId: expect.any(String),
        operationType: 'listRecommendations'
      }
    },
    
    errorResponse: {
      error: expect.any(String),
      message: expect.any(String),
      code: expect.any(String),
      metadata: {
        timestamp: expect.any(String),
        requestId: expect.any(String),
        operationType: expect.any(String)
      }
    }
  },

  // AWS service responses
  awsResponses: {
    trustedAdvisorCheck: {
      id: 'Pfx0RwqBli',
      name: 'Security Groups - Specific Ports Unrestricted',
      description: 'Checks security groups for rules that allow unrestricted access (0.0.0.0/0) to specific ports.',
      pillars: ['security'],
      awsServices: ['ec2'],
      source: 'trusted_advisor'
    },
    
    recommendation: {
      id: 'arn:aws:trustedadvisor:us-east-1:123456789012:recommendation/Pfx0RwqBli',
      checkArn: 'arn:aws:trustedadvisor::check/Pfx0RwqBli',
      type: 'standard',
      name: 'Security Groups - Specific Ports Unrestricted',
      description: 'Security group sg-12345678 has port 22 open to 0.0.0.0/0',
      status: 'warning',
      lifecycleStage: 'in_progress',
      pillars: ['security'],
      source: 'trusted_advisor',
      awsServices: ['ec2']
    }
  },

  // Cache test data
  cacheScenarios: {
    fastOperation: {
      params: { checkId: 'fast-check', language: 'en' },
      expectedCacheHit: true,
      ttl: 1000 // 1 second for testing
    },
    
    slowOperation: {
      params: { checkId: 'slow-check', language: 'en' },
      expectedCacheHit: false,
      ttl: 5000 // 5 seconds
    }
  }
};

// Helper functions for test data generation
export const generateTestCheck = (overrides: Partial<any> = {}) => ({
  id: testUtils.generateTestId(),
  name: 'Test Check',
  description: 'A test check for unit testing',
  pillars: ['security'],
  awsServices: ['ec2'],
  source: 'trusted_advisor',
  ...overrides
});

export const generateTestRecommendation = (overrides: Partial<any> = {}) => ({
  id: testUtils.generateTestId(),
  checkId: 'test-check-id',
  type: 'standard',
  name: 'Test Recommendation',
  status: 'warning',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lifecycleStage: 'in_progress',
  pillars: ['security'],
  source: 'trusted_advisor',
  awsServices: ['ec2'],
  ...overrides
});

export const generateTestResource = (overrides: Partial<any> = {}) => ({
  id: testUtils.generateTestId(),
  arn: `arn:aws:ec2:us-east-1:123456789012:security-group/${testUtils.generateTestId()}`,
  awsResourceId: testUtils.generateTestId(),
  status: 'warning',
  lastUpdatedAt: new Date().toISOString(),
  metadata: {
    'Resource Type': 'Security Group',
    'Region': 'us-east-1'
  },
  ...overrides
});

export default testData;
