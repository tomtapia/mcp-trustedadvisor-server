/**
 * Integration tests for listChecks resource
 * Tests the complete flow from parameters to AWS response
 */

import { 
  extractParameters, 
  CommonParamSpecs 
} from '../../src/utils/parameterUtils';
import { 
  createListResponse, 
  handleAwsError, 
  formatMcpResponse 
} from '../../src/utils/responseUtils';
import { 
  CacheInstances, 
  withCache 
} from '../../src/utils/cacheUtils';
import { mockTrustedAdvisorClient, mockTrustedAdvisorResponses } from '../mocks/awsTrustedAdvisor.mock';
import { testData } from '../fixtures/testData';

// Mock AWS clients
jest.mock('../../src/clients/awsClients', () => ({
  trustedAdvisorClient: mockTrustedAdvisorClient
}));

describe('Integration: listChecks Resource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CacheInstances.checks.clear();
  });

  describe('Parameter Processing', () => {
    it('should extract parameters correctly', () => {
      const params = testData.mcpParameters.listChecks;
      
      const extracted = extractParameters(params, [
        ...CommonParamSpecs.language,
        { name: 'maxResults', type: 'number', required: false }
      ]);

      expect(extracted.language).toBe('en');
      expect(extracted.maxResults).toBe(10);
    });

    it('should handle invalid parameters', () => {
      expect(() => {
        extractParameters(
          testData.invalidParameters.arrayInsteadOfObject,
          [...CommonParamSpecs.language]
        );
      }).toThrow('Arguments must be an object');
    });
  });

  describe('Response Processing', () => {
    it('should create list response correctly', () => {
      const awsResponse = mockTrustedAdvisorResponses.listChecks;
      const listResponse = createListResponse(
        awsResponse.checkSummaries,
        'list'
      );

      expect(listResponse.items).toHaveLength(2);
      expect(listResponse.items[0]).toHaveProperty('id');
      expect(listResponse.items[0]).toHaveProperty('name');
    });

    it('should format MCP response correctly', () => {
      const data = { items: [{ id: '1', name: 'test' }] };
      const mcpResponse = formatMcpResponse(
        'trusted-advisor://checks',
        data
      );

      expect(mcpResponse).toHaveProperty('contents');
      expect(Array.isArray(mcpResponse.contents)).toBe(true);
      expect(mcpResponse.contents[0]).toHaveProperty('uri');
      expect(mcpResponse.contents[0]).toHaveProperty('text');
      expect(mcpResponse.contents[0]).toHaveProperty('mimeType', 'application/json');
    });
  });

  describe('Error Handling', () => {
    it('should handle AWS errors properly', () => {
      const error = new Error('Access denied');
      error.name = 'AccessDeniedException';
      (error as any).$metadata = { httpStatusCode: 403 };

      const errorResponse = handleAwsError(error, 'listChecks');
      
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse).toHaveProperty('details');
      expect(errorResponse.details.errorType).toBe('PERMISSION_ERROR');
      expect(errorResponse.details.isRetryable).toBe(false);
    });
  });

  describe('Caching Integration', () => {
    it('should work with cache system', async () => {
      const mockData = { test: 'data' };
      let callCount = 0;

      const result1 = await withCache(
        CacheInstances.checks,
        'test_operation',
        async () => {
          callCount++;
          return mockData;
        },
        { param: 'value' }
      );

      const result2 = await withCache(
        CacheInstances.checks,
        'test_operation', 
        async () => {
          callCount++;
          return mockData;
        },
        { param: 'value' }
      );

      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
      expect(callCount).toBe(1); // Should hit cache on second call
    });
  });

  describe('Full Integration Flow', () => {
    it('should process complete workflow', () => {
      // Test parameter extraction
      const params = testData.mcpParameters.listChecks;
      const extracted = extractParameters(params, [
        ...CommonParamSpecs.language
      ]);

      // Test response creation
      const awsResponse = mockTrustedAdvisorResponses.listChecks;
      const listResponse = createListResponse(
        awsResponse.checkSummaries,
        'list'
      );

      // Test MCP formatting
      const mcpResponse = formatMcpResponse(
        `trusted-advisor://checks?language=${extracted.language}`,
        listResponse
      );

      // Verify complete flow
      expect(extracted.language).toBe('en');
      expect(listResponse.items).toHaveLength(2);
      expect(mcpResponse.contents[0]).toHaveProperty('text');
      
      const responseData = JSON.parse(mcpResponse.contents[0].text);
      expect(responseData.items).toHaveLength(2);
      expect(responseData.items[0]).toHaveProperty('id');
    });
  });
});