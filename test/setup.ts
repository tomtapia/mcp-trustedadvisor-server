/**
 * Jest setup file
 * Global test configuration and utilities
 */

// Increase timeout for AWS operations
jest.setTimeout(30000);

// Mock console methods to avoid noise in tests unless explicitly needed
const originalConsole = global.console;

beforeEach(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  // Helper to create mock AWS responses
  createMockAwsResponse: (data: any, metadata?: any) => ({
    $metadata: {
      httpStatusCode: 200,
      requestId: 'test-request-id',
      ...metadata
    },
    ...data
  }),

  // Helper to create mock AWS errors
  createMockAwsError: (name: string, message: string, statusCode = 400) => {
    const error = new Error(message);
    error.name = name;
    (error as any).$metadata = {
      httpStatusCode: statusCode,
      requestId: 'test-error-request-id'
    };
    return error;
  },

  // Helper to wait for async operations
  wait: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to generate test data
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Helper to validate MCP response format
  validateMcpResponse: (response: any) => {
    expect(response).toHaveProperty('contents');
    expect(Array.isArray(response.contents)).toBe(true);
    expect(response.contents.length).toBeGreaterThan(0);
    
    response.contents.forEach((content: any) => {
      expect(content).toHaveProperty('uri');
      expect(content).toHaveProperty('text');
      expect(content).toHaveProperty('mimeType', 'application/json');
      
      // Validate that text is valid JSON
      expect(() => JSON.parse(content.text)).not.toThrow();
    });
  }
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidMcpResponse(): R;
      toHaveAwsError(errorName: string): R;
    }
  }
  
  var testUtils: {
    createMockAwsResponse: (data: any, metadata?: any) => any;
    createMockAwsError: (name: string, message: string, statusCode?: number) => Error;
    wait: (ms?: number) => Promise<void>;
    generateTestId: () => string;
    validateMcpResponse: (response: any) => void;
  };
}

// Custom matchers
expect.extend({
  toBeValidMcpResponse(received) {
    try {
      global.testUtils.validateMcpResponse(received);
      return {
        message: () => 'Expected value not to be a valid MCP response',
        pass: true,
      };
    } catch (error) {
      return {
        message: () => `Expected value to be a valid MCP response: ${error}`,
        pass: false,
      };
    }
  },

  toHaveAwsError(received, errorName) {
    const hasError = received && received.error && received.code === errorName;
    return {
      message: () => hasError 
        ? `Expected response not to have AWS error '${errorName}'`
        : `Expected response to have AWS error '${errorName}', but got '${received?.code}'`,
      pass: hasError,
    };
  },
});

export {};
