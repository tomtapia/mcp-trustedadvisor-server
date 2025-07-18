/**
 * Unit tests for parameter utilities
 * Tests parameter parsing, validation, and error handling
 */

import { 
  validateArgumentsObject,
  getRequiredStringParam,
  getOptionalStringParam,
  getRequiredNumberParam,
  getOptionalNumberParam,
  getRequiredBooleanParam,
  getOptionalBooleanParam,
  getArrayParam,
  extractParameters,
  CommonParamSpecs
} from '../../src/utils/parameterUtils';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('Parameter Utilities', () => {
  describe('validateArgumentsObject', () => {
    it('should accept valid objects', () => {
      const validObj = { key: 'value', number: 42 };
      expect(() => validateArgumentsObject(validObj)).not.toThrow();
      expect(validateArgumentsObject(validObj)).toEqual(validObj);
    });

    it('should reject arrays', () => {
      expect(() => validateArgumentsObject(['array', 'values'])).toThrow(McpError);
      expect(() => validateArgumentsObject(['array'])).toThrow(/Arguments must be an object, not an array/);
    });

    it('should reject null and primitive values', () => {
      expect(() => validateArgumentsObject(null)).toThrow(McpError);
      expect(() => validateArgumentsObject('string')).toThrow(McpError);
      expect(() => validateArgumentsObject(42)).toThrow(McpError);
      expect(() => validateArgumentsObject(undefined)).toThrow(McpError);
    });
  });

  describe('getRequiredStringParam', () => {
    it('should return valid string parameters', () => {
      const args = { testParam: 'valid-string' };
      expect(getRequiredStringParam(args, 'testParam')).toBe('valid-string');
    });

    it('should throw for missing parameters', () => {
      const args = {};
      expect(() => getRequiredStringParam(args, 'missing')).toThrow(McpError);
      expect(() => getRequiredStringParam(args, 'missing')).toThrow(/must be a string/);
    });

    it('should throw for non-string parameters', () => {
      const args = { testParam: 42 };
      expect(() => getRequiredStringParam(args, 'testParam')).toThrow(McpError);
    });

    it('should throw for empty strings', () => {
      const args = { testParam: '' };
      expect(() => getRequiredStringParam(args, 'testParam')).toThrow(McpError);
      expect(() => getRequiredStringParam(args, 'testParam')).toThrow(/cannot be empty/);
    });

    it('should throw for whitespace-only strings', () => {
      const args = { testParam: '   ' };
      expect(() => getRequiredStringParam(args, 'testParam')).toThrow(McpError);
    });
  });

  describe('getOptionalStringParam', () => {
    it('should return valid string parameters', () => {
      const args = { testParam: 'valid-string' };
      expect(getOptionalStringParam(args, 'testParam')).toBe('valid-string');
    });

    it('should return default value for missing parameters', () => {
      const args = {};
      expect(getOptionalStringParam(args, 'missing', 'default')).toBe('default');
      expect(getOptionalStringParam(args, 'missing')).toBeUndefined();
    });

    it('should return default value for null/undefined', () => {
      const args = { testParam: null };
      expect(getOptionalStringParam(args, 'testParam', 'default')).toBe('default');
    });

    it('should throw for non-string parameters', () => {
      const args = { testParam: 42 };
      expect(() => getOptionalStringParam(args, 'testParam')).toThrow(McpError);
    });
  });

  describe('getRequiredNumberParam', () => {
    it('should return valid number parameters', () => {
      const args = { testParam: 42 };
      expect(getRequiredNumberParam(args, 'testParam')).toBe(42);
    });

    it('should accept zero', () => {
      const args = { testParam: 0 };
      expect(getRequiredNumberParam(args, 'testParam')).toBe(0);
    });

    it('should accept negative numbers', () => {
      const args = { testParam: -42 };
      expect(getRequiredNumberParam(args, 'testParam')).toBe(-42);
    });

    it('should throw for NaN', () => {
      const args = { testParam: NaN };
      expect(() => getRequiredNumberParam(args, 'testParam')).toThrow(McpError);
    });

    it('should throw for non-number parameters', () => {
      const args = { testParam: 'not-a-number' };
      expect(() => getRequiredNumberParam(args, 'testParam')).toThrow(McpError);
    });
  });

  describe('getRequiredBooleanParam', () => {
    it('should return true for true values', () => {
      const args = { testParam: true };
      expect(getRequiredBooleanParam(args, 'testParam')).toBe(true);
    });

    it('should return false for false values', () => {
      const args = { testParam: false };
      expect(getRequiredBooleanParam(args, 'testParam')).toBe(false);
    });

    it('should throw for non-boolean parameters', () => {
      const args = { testParam: 'true' };
      expect(() => getRequiredBooleanParam(args, 'testParam')).toThrow(McpError);
    });
  });

  describe('getArrayParam', () => {
    it('should return valid arrays', () => {
      const args = { testParam: ['item1', 'item2'] };
      expect(getArrayParam(args, 'testParam')).toEqual(['item1', 'item2']);
    });

    it('should return empty arrays', () => {
      const args = { testParam: [] };
      expect(getArrayParam(args, 'testParam')).toEqual([]);
    });

    it('should return undefined for missing optional arrays', () => {
      const args = {};
      expect(getArrayParam(args, 'missing')).toBeUndefined();
    });

    it('should throw for missing required arrays', () => {
      const args = {};
      expect(() => getArrayParam(args, 'missing', true)).toThrow(McpError);
    });

    it('should throw for non-array parameters', () => {
      const args = { testParam: 'not-an-array' };
      expect(() => getArrayParam(args, 'testParam')).toThrow(McpError);
    });
  });

  describe('extractParameters', () => {
    it('should extract multiple parameters correctly', () => {
      const args = {
        stringParam: 'test-string',
        numberParam: 42,
        booleanParam: true,
        arrayParam: ['item1', 'item2']
      };

      const specs = [
        { name: 'stringParam', type: 'string' as const, required: true },
        { name: 'numberParam', type: 'number' as const, required: true },
        { name: 'booleanParam', type: 'boolean' as const, required: true },
        { name: 'arrayParam', type: 'array' as const, required: true }
      ];

      const result = extractParameters(args, specs);

      expect(result).toEqual({
        stringParam: 'test-string',
        numberParam: 42,
        booleanParam: true,
        arrayParam: ['item1', 'item2']
      });
    });

    it('should handle optional parameters with defaults', () => {
      const args = { requiredParam: 'test' };

      const specs = [
        { name: 'requiredParam', type: 'string' as const, required: true },
        { name: 'optionalParam', type: 'string' as const, required: false, defaultValue: 'default-value' }
      ];

      const result = extractParameters(args, specs);

      expect(result).toEqual({
        requiredParam: 'test',
        optionalParam: 'default-value'
      });
    });

    it('should throw for invalid arguments', () => {
      expect(() => extractParameters(['invalid'], [])).toThrow(McpError);
    });

    it('should throw for unsupported parameter types', () => {
      const args = { testParam: 'test' };
      const specs = [{ name: 'testParam', type: 'unsupported' as any, required: true }];

      expect(() => extractParameters(args, specs)).toThrow(McpError);
      expect(() => extractParameters(args, specs)).toThrow(/Unsupported parameter type/);
    });
  });

  describe('CommonParamSpecs', () => {
    it('should have checkId specification', () => {
      expect(CommonParamSpecs.checkId).toEqual([
        { name: 'checkId', type: 'string', required: true }
      ]);
    });

    it('should have language specification with default', () => {
      expect(CommonParamSpecs.language).toEqual([
        { name: 'language', type: 'string', required: false, defaultValue: 'en' }
      ]);
    });

    it('should have pagination specifications', () => {
      expect(CommonParamSpecs.pagination).toEqual([
        { name: 'maxResults', type: 'number', required: false },
        { name: 'nextToken', type: 'string', required: false }
      ]);
    });

    it('should work with extractParameters', () => {
      const args = { checkId: 'test-check-123' };
      const result = extractParameters(args, [...CommonParamSpecs.checkId]);

      expect(result).toEqual({ checkId: 'test-check-123' });
    });
  });

  describe('Performance', () => {
    it('should handle large parameter sets efficiently', () => {
      const args: Record<string, any> = {};
      const specs: any[] = [];

      // Create 100 parameters
      for (let i = 0; i < 100; i++) {
        args[`param${i}`] = `value${i}`;
        specs.push({ name: `param${i}`, type: 'string', required: false });
      }

      const startTime = performance.now();
      const result = extractParameters(args, specs);
      const endTime = performance.now();

      expect(Object.keys(result)).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
    });
  });
});
