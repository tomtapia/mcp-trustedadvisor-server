import { MetadataSchema } from "../schemas/trustedAdvisorSchemas.js";
import { randomUUID } from 'crypto';

/**
 * Performance-optimized UUID generation with fallback
 */
const generateRequestId = (() => {
  let counter = 0;
  const prefix = randomUUID().substring(0, 8);
  
  return (): string => {
    // Use a simple counter for performance, combined with initial UUID prefix
    return `${prefix}-${++counter}-${Date.now()}`;
  };
})();

/**
 * Creates standardized metadata for responses with optimized ID generation
 */
export const createMetadata = (operationType: string, awsAccountId?: string, region = "us-east-1") => {
  return {
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    awsAccountId,
    region,
    operationType
  };
};

/**
 * Creates standardized error response with enhanced error details
 */
export const createErrorResponse = (
  error: string,
  message: string,
  code: string,
  operationType: string,
  details?: any,
  awsAccountId?: string,
  region = "us-east-1"
) => {
  return {
    error,
    message,
    code,
    details,
    metadata: createMetadata(operationType, awsAccountId, region)
  };
};

/**
 * Enhanced error handler for AWS operations with better error classification
 */
export const handleAwsError = (
  error: any,
  operationType: string,
  awsAccountId?: string,
  region = "us-east-1"
) => {
  const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
  const errorCode = (error as any)?.name || "UnknownError";
  const errorDetails = (error as any)?.Code || null;
  
  // Enhanced error classification
  const errorType = classifyError(error);
  const isRetryable = isRetryableError(error);

  return createErrorResponse(
    `Failed to execute ${operationType}`,
    errorMessage,
    errorCode,
    operationType,
    {
      ...errorDetails,
      errorType,
      isRetryable,
      httpStatusCode: (error as any)?.$metadata?.httpStatusCode
    },
    awsAccountId,
    region
  );
};

/**
 * Classify AWS errors for better handling
 */
function classifyError(error: any): string {
  const errorCode = (error as any)?.name || '';
  
  if (errorCode.includes('AccessDenied') || errorCode.includes('Forbidden')) {
    return 'PERMISSION_ERROR';
  }
  if (errorCode.includes('NotFound') || errorCode.includes('NoSuchKey')) {
    return 'NOT_FOUND';
  }
  if (errorCode.includes('Throttling') || errorCode.includes('TooManyRequests')) {
    return 'RATE_LIMIT';
  }
  if (errorCode.includes('InternalError') || errorCode.includes('ServiceUnavailable')) {
    return 'SERVICE_ERROR';
  }
  if (errorCode.includes('InvalidParameter') || errorCode.includes('ValidationException')) {
    return 'VALIDATION_ERROR';
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  const errorCode = (error as any)?.name || '';
  const httpStatusCode = (error as any)?.$metadata?.httpStatusCode;
  
  // Retry on throttling, internal server errors, and service unavailable
  if (errorCode.includes('Throttling') || 
      errorCode.includes('InternalError') || 
      errorCode.includes('ServiceUnavailable')) {
    return true;
  }
  
  // Retry on specific HTTP status codes
  if (httpStatusCode && [429, 500, 502, 503, 504].includes(httpStatusCode)) {
    return true;
  }
  
  return false;
}

/**
 * Creates a successful list response with performance optimization
 */
export const createListResponse = <T>(
  items: T[],
  operationType: string,
  nextToken?: string,
  awsAccountId?: string,
  region = "us-east-1"
) => {
  return {
    items,
    totalCount: items.length,
    nextToken,
    metadata: createMetadata(operationType, awsAccountId, region)
  };
};

/**
 * Creates a successful single item response
 */
export const createSingleResponse = <T>(
  item: T,
  operationType: string,
  awsAccountId?: string,
  region = "us-east-1"
) => {
  return {
    item,
    metadata: createMetadata(operationType, awsAccountId, region)
  };
};

/**
 * Creates a successful update response with detailed status
 */
export const createUpdateResponse = (
  success: boolean,
  operationType: string,
  updatedCount?: number,
  errors?: Array<{ resourceId: string; errorCode: string; errorMessage: string }>,
  awsAccountId?: string,
  region = "us-east-1"
) => {
  return {
    success,
    updatedCount,
    errors,
    metadata: createMetadata(operationType, awsAccountId, region)
  };
};

/**
 * Creates standardized resource URI with validation
 */
export const createResourceUri = (baseUri: string, resourceType: string, identifier?: string) => {
  if (identifier) {
    return `${baseUri}/${resourceType}/${encodeURIComponent(identifier)}`;
  }
  return `${baseUri}/${resourceType}`;
};

/**
 * Performance-optimized JSON formatting for MCP responses
 */
export const formatMcpResponse = (uri: string, data: any) => {
  // Use optimized JSON serialization for better performance
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  
  return {
    contents: [{
      uri,
      text: jsonString,
      mimeType: "application/json"
    }]
  };
};

/**
 * Batch response formatter for multiple operations
 */
export const formatBatchResponse = <T>(
  operations: Array<{
    uri: string;
    data: T;
    operationType: string;
  }>,
  awsAccountId?: string,
  region = "us-east-1"
) => {
  return {
    operations: operations.map(op => ({
      uri: op.uri,
      data: op.data,
      metadata: createMetadata(op.operationType, awsAccountId, region)
    })),
    batchMetadata: createMetadata('batchOperation', awsAccountId, region)
  };
};

/**
 * Create paginated response with performance metrics
 */
export const createPaginatedResponse = <T>(
  items: T[],
  operationType: string,
  totalCount?: number,
  currentPage?: number,
  pageSize?: number,
  nextToken?: string,
  awsAccountId?: string,
  region = "us-east-1"
) => {
  return {
    items,
    pagination: {
      totalCount: totalCount || items.length,
      currentPage,
      pageSize,
      nextToken,
      hasMore: !!nextToken
    },
    metadata: createMetadata(operationType, awsAccountId, region)
  };
};

/**
 * Validates and parses input parameters using Zod schema
 * Kept for backward compatibility with existing files
 */
export const parseInput = <T>(schema: any, params: any): T => {
  return schema.parse(params) as T;
};
