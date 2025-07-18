export interface AWSClientConfig {
  // Core configuration
  region?: string;
  profile?: string;
  
  // Retry and performance configuration
  maxAttempts?: number;
  retryMode?: string;
  
  // Endpoint configuration
  useDualstackEndpoint?: boolean;
  useFipsEndpoint?: boolean;
  disableHostPrefix?: boolean;
  
  // Defaults and extensions
  defaultsMode?: string; // DefaultsMode
  
  // Logging
  logger?: any; // Logger from @smithy/types
  
  // Request handling
  requestHandler?: any; // __HttpHandlerUserInput
  extensions?: any[]; // RuntimeExtension[]
}

export interface TrustedAdvisorConfig extends AWSClientConfig {
  // Specific configurations for Trusted Advisor
  defaultLanguage?: "en" | "ja" | "fr" | "zh";
  enableCaching?: boolean;
  cacheTimeout?: number;
}

export interface SupportConfig extends AWSClientConfig {
  // Specific configurations for Support API
  enableTrustedAdvisor?: boolean;
}

// Default configuration values
export const defaultAWSConfig: AWSClientConfig = {
  region: "us-east-1", // Trusted Advisor is only available in us-east-1
  maxAttempts: 3,
  retryMode: "adaptive",
  useDualstackEndpoint: false,
  useFipsEndpoint: false,
  disableHostPrefix: false,
};

export const defaultTrustedAdvisorConfig: TrustedAdvisorConfig = {
  ...defaultAWSConfig,
  defaultLanguage: "en",
  enableCaching: false,
  cacheTimeout: 300000, // 5 minutes
};

export const defaultSupportConfig: SupportConfig = {
  ...defaultAWSConfig,
  enableTrustedAdvisor: true,
};

// Environment variable mapping
export function getConfigFromEnvironment(): Partial<AWSClientConfig> {
  const config: Partial<AWSClientConfig> = {};
  
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  const profile = process.env.AWS_PROFILE;
  const maxAttempts = process.env.AWS_MAX_ATTEMPTS;
  const retryMode = process.env.AWS_RETRY_MODE;
  const useDualstack = process.env.AWS_USE_DUALSTACK_ENDPOINT;
  const useFips = process.env.AWS_USE_FIPS_ENDPOINT;
  
  if (region) config.region = region;
  if (profile) config.profile = profile;
  if (maxAttempts) config.maxAttempts = parseInt(maxAttempts);
  if (retryMode) config.retryMode = retryMode;
  if (useDualstack !== undefined) config.useDualstackEndpoint = useDualstack === "true";
  if (useFips !== undefined) config.useFipsEndpoint = useFips === "true";
  
  return config;
}

// Merge configurations with precedence: custom > environment > defaults
export function mergeConfigs<T extends AWSClientConfig>(
  defaultConfig: T,
  customConfig: Partial<T> = {}
): T {
  const envConfig = getConfigFromEnvironment();
  
  return {
    ...defaultConfig,
    ...envConfig,
    ...customConfig,
  } as T;
}
