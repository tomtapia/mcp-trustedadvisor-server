/**
 * Parameter parsing utilities for MCP server
 * Provides optimized and centralized parameter handling
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Validates that arguments is an object and not an array
 * @param args Arguments to validate
 * @returns Validated arguments object
 * @throws McpError if validation fails
 */
export function validateArgumentsObject(args: unknown): Record<string, unknown> {
  if (Array.isArray(args)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Arguments must be an object, not an array'
    );
  }
  
  if (typeof args !== 'object' || args === null) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Arguments must be a valid object'
    );
  }
  
  return args as Record<string, unknown>;
}

/**
 * Extracts a required string parameter from arguments
 * @param args Arguments object
 * @param paramName Parameter name
 * @returns String value
 * @throws McpError if parameter is missing or invalid
 */
export function getRequiredStringParam(args: Record<string, unknown>, paramName: string): string {
  const value = args[paramName];
  
  if (typeof value !== 'string') {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Parameter '${paramName}' must be a string`
    );
  }
  
  if (value.trim().length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Parameter '${paramName}' cannot be empty`
    );
  }
  
  return value;
}

/**
 * Extracts an optional string parameter from arguments
 * @param args Arguments object
 * @param paramName Parameter name
 * @param defaultValue Default value if parameter is not provided
 * @returns String value or default
 */
export function getOptionalStringParam(
  args: Record<string, unknown>, 
  paramName: string, 
  defaultValue?: string
): string | undefined {
  const value = args[paramName];
  
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  if (typeof value !== 'string') {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Parameter '${paramName}' must be a string`
    );
  }
  
  return value;
}

/**
 * Extracts a required number parameter from arguments
 * @param args Arguments object
 * @param paramName Parameter name
 * @returns Number value
 * @throws McpError if parameter is missing or invalid
 */
export function getRequiredNumberParam(args: Record<string, unknown>, paramName: string): number {
  const value = args[paramName];
  
  if (typeof value !== 'number' || isNaN(value)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Parameter '${paramName}' must be a valid number`
    );
  }
  
  return value;
}

/**
 * Extracts an optional number parameter from arguments
 * @param args Arguments object
 * @param paramName Parameter name
 * @param defaultValue Default value if parameter is not provided
 * @returns Number value or default
 */
export function getOptionalNumberParam(
  args: Record<string, unknown>, 
  paramName: string, 
  defaultValue?: number
): number | undefined {
  const value = args[paramName];
  
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  if (typeof value !== 'number' || isNaN(value)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Parameter '${paramName}' must be a valid number`
    );
  }
  
  return value;
}

/**
 * Extracts a required boolean parameter from arguments
 * @param args Arguments object
 * @param paramName Parameter name
 * @returns Boolean value
 * @throws McpError if parameter is missing or invalid
 */
export function getRequiredBooleanParam(args: Record<string, unknown>, paramName: string): boolean {
  const value = args[paramName];
  
  if (typeof value !== 'boolean') {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Parameter '${paramName}' must be a boolean`
    );
  }
  
  return value;
}

/**
 * Extracts an optional boolean parameter from arguments
 * @param args Arguments object
 * @param paramName Parameter name
 * @param defaultValue Default value if parameter is not provided
 * @returns Boolean value or default
 */
export function getOptionalBooleanParam(
  args: Record<string, unknown>, 
  paramName: string, 
  defaultValue?: boolean
): boolean | undefined {
  const value = args[paramName];
  
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  if (typeof value !== 'boolean') {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Parameter '${paramName}' must be a boolean`
    );
  }
  
  return value;
}

/**
 * Extracts an array parameter from arguments
 * @param args Arguments object
 * @param paramName Parameter name
 * @param required Whether the parameter is required
 * @returns Array value or undefined if optional and not provided
 * @throws McpError if parameter is invalid
 */
export function getArrayParam<T>(
  args: Record<string, unknown>, 
  paramName: string, 
  required: boolean = false
): T[] | undefined {
  const value = args[paramName];
  
  if (value === undefined || value === null) {
    if (required) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Parameter '${paramName}' is required`
      );
    }
    return undefined;
  }
  
  if (!Array.isArray(value)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Parameter '${paramName}' must be an array`
    );
  }
  
  return value as T[];
}

/**
 * Validates and extracts multiple parameters in a single call
 * @param args Arguments object
 * @param paramSpecs Parameter specifications
 * @returns Extracted parameters object
 */
export interface ParamSpec {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  defaultValue?: unknown;
}

export function extractParameters(
  args: unknown, 
  paramSpecs: ParamSpec[]
): Record<string, unknown> {
  const validatedArgs = validateArgumentsObject(args);
  const result: Record<string, unknown> = {};
  
  for (const spec of paramSpecs) {
    const { name, type, required = false, defaultValue } = spec;
    
    switch (type) {
      case 'string':
        result[name] = required 
          ? getRequiredStringParam(validatedArgs, name)
          : getOptionalStringParam(validatedArgs, name, defaultValue as string);
        break;
      
      case 'number':
        result[name] = required
          ? getRequiredNumberParam(validatedArgs, name)
          : getOptionalNumberParam(validatedArgs, name, defaultValue as number);
        break;
      
      case 'boolean':
        result[name] = required
          ? getRequiredBooleanParam(validatedArgs, name)
          : getOptionalBooleanParam(validatedArgs, name, defaultValue as boolean);
        break;
      
      case 'array':
        result[name] = getArrayParam(validatedArgs, name, required);
        break;
      
      default:
        throw new McpError(
          ErrorCode.InternalError,
          `Unsupported parameter type: ${type}`
        );
    }
  }
  
  return result;
}

/**
 * Performance-optimized parameter extraction for common patterns
 * Pre-compiled parameter specifications for frequently used operations
 */
export const CommonParamSpecs = {
  // For operations that need checkId
  checkId: [{ name: 'checkId', type: 'string' as const, required: true }],
  
  // For operations that need language
  language: [{ name: 'language', type: 'string' as const, required: false, defaultValue: 'en' }],
  
  // For operations that need accountId
  accountId: [{ name: 'accountId', type: 'string' as const, required: true }],
  
  // For pagination operations
  pagination: [
    { name: 'maxResults', type: 'number' as const, required: false },
    { name: 'nextToken', type: 'string' as const, required: false }
  ],
  
  // For recommendation operations
  recommendation: [
    { name: 'checkId', type: 'string' as const, required: true },
    { name: 'language', type: 'string' as const, required: false, defaultValue: 'en' },
    { name: 'accountId', type: 'string' as const, required: false }
  ]
} as const;
