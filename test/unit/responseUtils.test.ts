/**
 * Unit tests for response utilities
 * Tests response formatting, error handling, and metadata generation
 */

import { 
  createMetadata,
  createErrorResponse,
  handleAwsError,
  createListResponse,
  createSingleResponse,
  createUpdateResponse,
  createResourceUri,
  formatMcpResponse,
  parseInput
} from '../../src/utils/responseUtils';
import { z } from 'zod';

// Mock crypto.randomUUID for consistent testing
const mockRequestId = 'test-request-id-123';
jest.mock('crypto', () => ({
  randomUUID: () => 'crypto-uuid-mock'
}));

// Override the optimized ID generator for testing
jest.mock('../../src/utils/responseUtils', () => {
  const actual = jest.requireActual('../../src/utils/responseUtils');
  return {
    ...actual,
    createMetadata: (operationType: string, awsAccountId?: string, region = "us-east-1") => ({
      timestamp: new Date('2025-07-17T12:00:00.000Z').toISOString(),
      requestId: mockRequestId,
      awsAccountId,
      region,
      operationType
    })
  };
});

describe('Response Utilities', () => {
  describe('createMetadata', () => {
    it('should create metadata with all required fields', () => {
      const metadata = createMetadata('testOperation', '123456789012', 'us-west-2');

      expect(metadata).toEqual({
        timestamp: '2025-07-17T12:00:00.000Z',
        requestId: mockRequestId,
        awsAccountId: '123456789012',
        region: 'us-west-2',
        operationType: 'testOperation'
      });
    });

    it('should use default region when not provided', () => {
      const metadata = createMetadata('testOperation', '123456789012');

      expect(metadata.region).toBe('us-east-1');
    });

    it('should handle missing AWS account ID', () => {
      const metadata = createMetadata('testOperation');

      expect(metadata.awsAccountId).toBeUndefined();
      expect(metadata.region).toBe('us-east-1');
    });
  });

  describe('createErrorResponse', () => {
    it('should create properly formatted error responses', () => {
      const errorResponse = createErrorResponse(
        'Operation failed',
        'Detailed error message',
        'ERROR_CODE',
        'testOperation',
        { additionalInfo: 'extra details' },
        '123456789012',
        'us-west-2'
      );

      expect(errorResponse).toMatchObject({
        error: 'Operation failed',
        message: 'Detailed error message',
        code: 'ERROR_CODE',
        metadata: {
          awsAccountId: '123456789012',
          region: 'us-west-2',
          operationType: 'testOperation'
        }
      });
      expect(errorResponse.metadata.requestId).toMatch(/^crypto-u-\d+-\d+$/);
      expect(errorResponse.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle missing optional parameters', () => {
      const errorResponse = createErrorResponse(
        'Operation failed',
        'Detailed error message',
        'ERROR_CODE',
        'testOperation'
      );

      expect(errorResponse.details).toBeUndefined();
      expect(errorResponse.metadata.awsAccountId).toBeUndefined();
      expect(errorResponse.metadata.region).toBe('us-east-1');
    });
  });

  describe('handleAwsError', () => {
    it('should handle standard AWS errors', () => {
      const awsError = new Error('Access denied');
      awsError.name = 'AccessDeniedException';
      (awsError as any).$metadata = { httpStatusCode: 403 };

      const errorResponse = handleAwsError(awsError, 'testOperation', '123456789012');

      expect(errorResponse.error).toBe('Failed to execute testOperation');
      expect(errorResponse.message).toBe('Access denied');
      expect(errorResponse.code).toBe('AccessDeniedException');
      expect(errorResponse.details.errorType).toBe('PERMISSION_ERROR');
      expect(errorResponse.details.isRetryable).toBe(false);
      expect(errorResponse.details.httpStatusCode).toBe(403);
    });

    it('should classify throttling errors as retryable', () => {
      const throttlingError = new Error('Request rate exceeded');
      throttlingError.name = 'ThrottlingException';
      (throttlingError as any).$metadata = { httpStatusCode: 429 };

      const errorResponse = handleAwsError(throttlingError, 'testOperation');

      expect(errorResponse.details.errorType).toBe('RATE_LIMIT');
      expect(errorResponse.details.isRetryable).toBe(true);
    });

    it('should classify not found errors correctly', () => {
      const notFoundError = new Error('Resource not found');
      notFoundError.name = 'ResourceNotFoundException';

      const errorResponse = handleAwsError(notFoundError, 'testOperation');

      expect(errorResponse.details.errorType).toBe('NOT_FOUND');
      expect(errorResponse.details.isRetryable).toBe(false);
    });

    it('should handle unknown errors', () => {
      const unknownError = new Error('Unknown error');

      const errorResponse = handleAwsError(unknownError, 'testOperation');

      expect(errorResponse.details.errorType).toBe('UNKNOWN_ERROR');
      expect(errorResponse.details.isRetryable).toBe(false);
    });

    it('should handle non-Error objects', () => {
      const stringError = 'Just a string error';

      const errorResponse = handleAwsError(stringError, 'testOperation');

      expect(errorResponse.message).toBe('Unknown error occurred');
      expect(errorResponse.code).toBe('UnknownError');
    });

    it('should classify internal server errors as retryable', () => {
      const serverError = new Error('Internal server error');
      serverError.name = 'InternalServerError';
      (serverError as any).$metadata = { httpStatusCode: 500 };

      const errorResponse = handleAwsError(serverError, 'testOperation');

      expect(errorResponse.details.errorType).toBe('UNKNOWN_ERROR');
      expect(errorResponse.details.isRetryable).toBe(true);
    });
  });

  describe('createListResponse', () => {
    it('should create properly formatted list responses', () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];

      const response = createListResponse(
        items,
        'listOperation',
        'next-token-123',
        '123456789012',
        'us-west-2'
      );

      expect(response).toMatchObject({
        items,
        totalCount: 2,
        nextToken: 'next-token-123',
        metadata: {
          awsAccountId: '123456789012',
          region: 'us-west-2',
          operationType: 'listOperation'
        }
      });
      expect(response.metadata.requestId).toMatch(/^crypto-u-\d+-\d+$/);
      expect(response.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle empty lists', () => {
      const response = createListResponse([], 'listOperation');

      expect(response.items).toEqual([]);
      expect(response.totalCount).toBe(0);
      expect(response.nextToken).toBeUndefined();
    });
  });

  describe('createSingleResponse', () => {
    it('should create properly formatted single item responses', () => {
      const item = { id: '1', name: 'Test Item' };

      const response = createSingleResponse(
        item,
        'getOperation',
        '123456789012',
        'us-west-2'
      );

      expect(response).toMatchObject({
        item,
        metadata: {
          awsAccountId: '123456789012',
          region: 'us-west-2',
          operationType: 'getOperation'
        }
      });
      expect(response.metadata.requestId).toMatch(/^crypto-u-\d+-\d+$/);
      expect(response.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('createUpdateResponse', () => {
    it('should create properly formatted update responses', () => {
      const errors = [
        { resourceId: 'resource-1', errorCode: 'ValidationError', errorMessage: 'Invalid input' }
      ];

      const response = createUpdateResponse(
        false,
        'updateOperation',
        5,
        errors,
        '123456789012',
        'us-west-2'
      );

      expect(response).toMatchObject({
        success: false,
        updatedCount: 5,
        errors,
        metadata: {
          awsAccountId: '123456789012',
          region: 'us-west-2',
          operationType: 'updateOperation'
        }
      });
      expect(response.metadata.requestId).toMatch(/^crypto-u-\d+-\d+$/);
      expect(response.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle successful updates without errors', () => {
      const response = createUpdateResponse(true, 'updateOperation', 10);

      expect(response.success).toBe(true);
      expect(response.updatedCount).toBe(10);
      expect(response.errors).toBeUndefined();
    });
  });

  describe('createResourceUri', () => {
    it('should create URIs with identifiers', () => {
      const uri = createResourceUri(
        'trusted-advisor://base',
        'recommendations',
        'recommendation-123'
      );

      expect(uri).toBe('trusted-advisor://base/recommendations/recommendation-123');
    });

    it('should create URIs without identifiers', () => {
      const uri = createResourceUri(
        'trusted-advisor://base',
        'recommendations'
      );

      expect(uri).toBe('trusted-advisor://base/recommendations');
    });

    it('should URL encode identifiers', () => {
      const uri = createResourceUri(
        'trusted-advisor://base',
        'recommendations',
        'recommendation with spaces & special chars'
      );

      expect(uri).toBe('trusted-advisor://base/recommendations/recommendation%20with%20spaces%20%26%20special%20chars');
    });
  });

  describe('formatMcpResponse', () => {
    it('should format objects as JSON', () => {
      const data = { test: 'data', number: 42 };
      const uri = 'trusted-advisor://test';

      const response = formatMcpResponse(uri, data);

      expect(response).toEqual({
        contents: [{
          uri,
          text: JSON.stringify(data, null, 2),
          mimeType: 'application/json'
        }]
      });

      expect(response).toHaveProperty('contents');
      expect(Array.isArray(response.contents)).toBe(true);
      expect(response.contents[0]).toHaveProperty('uri');
      expect(response.contents[0]).toHaveProperty('text');
      expect(response.contents[0]).toHaveProperty('mimeType');
    });

    it('should handle string data', () => {
      const data = '{"already": "json"}';
      const uri = 'trusted-advisor://test';

      const response = formatMcpResponse(uri, data);

      expect(response.contents[0].text).toBe(data);
    });

    it('should handle complex nested objects', () => {
      const complexData = {
        array: [1, 2, 3],
        nested: {
          deep: {
            value: 'test'
          }
        },
        nullValue: null,
        booleanValue: true
      };

      const response = formatMcpResponse('test://uri', complexData);

      expect(() => JSON.parse(response.contents[0].text)).not.toThrow();
      expect(JSON.parse(response.contents[0].text)).toEqual(complexData);
    });
  });

  describe('parseInput', () => {
    it('should parse valid input with Zod schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean().optional()
      });

      const input = { name: 'test', age: 25, active: true };
      const result = parseInput(schema, input);

      expect(result).toEqual(input);
    });

    it('should throw for invalid input', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      const invalidInput = { name: 'test', age: 'not-a-number' };

      expect(() => parseInput(schema, invalidInput)).toThrow();
    });

    it('should handle optional fields', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional()
      });

      const input = { required: 'test' };
      const result = parseInput(schema, input) as any;

      expect(result.required).toBe('test');
      expect(result.optional).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should format large responses efficiently', () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: `item-${i}`,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10)
        }))
      };

      const startTime = performance.now();
      const response = formatMcpResponse('test://uri', largeData);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(response).toHaveProperty('contents');
      expect(Array.isArray(response.contents)).toBe(true);
    });

    it('should generate metadata efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        createMetadata(`operation-${i}`, '123456789012', 'us-east-1');
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});
