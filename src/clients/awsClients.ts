import { SupportClient } from "@aws-sdk/client-support";
import { TrustedAdvisorClient } from "@aws-sdk/client-trustedadvisor";
import { 
  AWSClientConfig, 
  TrustedAdvisorConfig, 
  SupportConfig, 
  defaultSupportConfig, 
  defaultTrustedAdvisorConfig,
  mergeConfigs 
} from "../config/awsConfig.js";

// Performance optimization: Client connection pool
const clientPool = new Map<string, SupportClient | TrustedAdvisorClient>();

/**
 * Creates a configured AWS Support Client with connection pooling
 * @param customConfig Optional custom configuration
 * @returns Configured SupportClient instance
 */
export function createSupportClient(customConfig: Partial<SupportConfig> = {}): SupportClient {
  const config = mergeConfigs(defaultSupportConfig, customConfig);
  
  // Create a cache key based on configuration
  const cacheKey = `support-${JSON.stringify(config)}`;
  
  // Return cached client if available
  if (clientPool.has(cacheKey)) {
    return clientPool.get(cacheKey) as SupportClient;
  }
  
  // Build only the configuration options that are defined and compatible
  const clientConfig: any = {};
  
  if (config.region) clientConfig.region = config.region;
  if (config.maxAttempts) clientConfig.maxAttempts = config.maxAttempts;
  if (config.retryMode) clientConfig.retryMode = config.retryMode;
  if (config.useDualstackEndpoint !== undefined) clientConfig.useDualstackEndpoint = config.useDualstackEndpoint;
  if (config.useFipsEndpoint !== undefined) clientConfig.useFipsEndpoint = config.useFipsEndpoint;
  if (config.disableHostPrefix !== undefined) clientConfig.disableHostPrefix = config.disableHostPrefix;
  if (config.logger) clientConfig.logger = config.logger;
  if (config.requestHandler) clientConfig.requestHandler = config.requestHandler;
  
  // Performance optimization: Keep-alive connections
  if (!clientConfig.requestHandler) {
    clientConfig.requestHandler = {
      httpOptions: {
        connectTimeout: 3000,
        timeout: 10000,
      }
    };
  }
  
  const client = new SupportClient(clientConfig);
  
  // Cache the client
  clientPool.set(cacheKey, client);
  
  return client;
}

/**
 * Creates a configured AWS Trusted Advisor Client with connection pooling
 * @param customConfig Optional custom configuration
 * @returns Configured TrustedAdvisorClient instance
 */
export function createTrustedAdvisorClient(customConfig: Partial<TrustedAdvisorConfig> = {}): TrustedAdvisorClient {
  const config = mergeConfigs(defaultTrustedAdvisorConfig, customConfig);
  
  // Create a cache key based on configuration
  const cacheKey = `trustedadvisor-${JSON.stringify(config)}`;
  
  // Return cached client if available
  if (clientPool.has(cacheKey)) {
    return clientPool.get(cacheKey) as TrustedAdvisorClient;
  }
  
  // Build only the configuration options that are defined and compatible
  const clientConfig: any = {};
  
  if (config.region) clientConfig.region = config.region;
  if (config.maxAttempts) clientConfig.maxAttempts = config.maxAttempts;
  if (config.retryMode) clientConfig.retryMode = config.retryMode;
  if (config.useDualstackEndpoint !== undefined) clientConfig.useDualstackEndpoint = config.useDualstackEndpoint;
  if (config.useFipsEndpoint !== undefined) clientConfig.useFipsEndpoint = config.useFipsEndpoint;
  if (config.disableHostPrefix !== undefined) clientConfig.disableHostPrefix = config.disableHostPrefix;
  if (config.logger) clientConfig.logger = config.logger;
  if (config.requestHandler) clientConfig.requestHandler = config.requestHandler;
  
  // Performance optimization: Keep-alive connections
  if (!clientConfig.requestHandler) {
    clientConfig.requestHandler = {
      httpOptions: {
        connectTimeout: 3000,
        timeout: 10000,
      }
    };
  }
  
  const client = new TrustedAdvisorClient(clientConfig);
  
  // Cache the client
  clientPool.set(cacheKey, client);
  
  return client;
}

// Default client instances (lazy initialization)
let _supportClient: SupportClient | undefined;
let _trustedAdvisorClient: TrustedAdvisorClient | undefined;

export const supportClient = (() => {
  if (!_supportClient) {
    _supportClient = createSupportClient();
  }
  return _supportClient;
})();

export const trustedAdvisorClient = (() => {
  if (!_trustedAdvisorClient) {
    _trustedAdvisorClient = createTrustedAdvisorClient();
  }
  return _trustedAdvisorClient;
})();

// Factory functions for custom configurations
export const createCustomSupportClient = (config: Partial<SupportConfig>) => createSupportClient(config);
export const createCustomTrustedAdvisorClient = (config: Partial<TrustedAdvisorConfig>) => createTrustedAdvisorClient(config);

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupClients(): void {
  clientPool.clear();
}

/**
 * Get client pool statistics for monitoring
 */
export function getClientPoolStats(): { poolSize: number; clients: string[] } {
  return {
    poolSize: clientPool.size,
    clients: Array.from(clientPool.keys())
  };
}
