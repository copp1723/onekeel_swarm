import { getConfig as getAppConfig, validateConfig } from '../../shared/config/app-config';
import { productionConfig } from './production';
import { stagingConfig } from './staging';
import { developmentConfig } from './development';

export interface EnvironmentConfig {
  environment: 'development' | 'staging' | 'production';
  server: {
    port: number;
    nodeEnv: string;
    memoryLimit: number;
  };
  features: {
    enableAgents: boolean;
    enableWebSocket: boolean;
    enableRedis: boolean;
    enableMonitoring: boolean;
    enableEmailTemplates: boolean;
    enableQueueSystem: boolean;
    enableHealthChecks: boolean;
    enableMetrics: boolean;
    enablePerformanceMonitoring: boolean;
    enableAuditLogging: boolean;
    enableAnalytics: boolean;
  };
  performance: {
    maxConcurrentRequests: number;
    requestTimeout: number;
    keepAliveTimeout: number;
  };
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    checks: string[];
  };
  redis: {
    enabled: boolean;
    maxRetriesPerRequest: number;
    enableOfflineQueue: boolean;
    connectTimeout: number;
  };
  memory: {
    maxHeapUsagePercent: number;
    gcInterval: number;
    preventMemoryLeaks: boolean;
  };
  logging: {
    level: string;
    maxFiles: number;
    console: boolean;
  };
  database: {
    url?: string;
    maxConnections: number;
  };
  external: {
    mailgun: {
      apiKey?: string;
      domain?: string;
      fromEmail?: string;
    };
    twilio: {
      accountSid?: string;
      authToken?: string;
      phoneNumber?: string;
    };
    openai: {
      apiKey?: string;
      model: string;
    };
  };
  security: {
    sessionSecret: string;
    jwtSecret?: string;
    rateLimitWindow: number;
    rateLimitMax: number;
  };
}

// Merge configurations based on environment
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const appConfig = getAppConfig();
  const environment = appConfig.server.nodeEnv as 'development' | 'staging' | 'production';
  
  // Start with default app config
  const baseConfig: EnvironmentConfig = {
    environment,
    server: { ...appConfig.server },
    features: {
      enableAgents: appConfig.features.enableAgents,
      enableWebSocket: appConfig.features.enableWebSocket,
      enableRedis: appConfig.features.enableRedis,
      enableMonitoring: appConfig.features.enableMonitoring,
      enableEmailTemplates: appConfig.features.enableEmailTemplates,
      enableQueueSystem: false,
      enableHealthChecks: true,
      enableMetrics: false,
      enablePerformanceMonitoring: false,
      enableAuditLogging: false,
      enableAnalytics: false,
    },
    performance: {
      maxConcurrentRequests: 100,
      requestTimeout: 30000,
      keepAliveTimeout: 5000,
    },
    healthCheck: {
      enabled: true,
      interval: 30000,
      timeout: 5000,
      checks: ['database', 'redis', 'external'],
    },
    redis: {
      enabled: appConfig.features.enableRedis,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      connectTimeout: 10000,
    },
    memory: {
      maxHeapUsagePercent: 85,
      gcInterval: 60000,
      preventMemoryLeaks: false,
    },
    logging: {
      level: 'info',
      maxFiles: 5,
      console: true,
    },
    database: { ...appConfig.database },
    external: { ...appConfig.external },
    security: { ...appConfig.security },
  };
  
  // Apply environment-specific overrides
  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        features: {
          ...baseConfig.features,
          ...(productionConfig as any).features
        },
        performance: {
          ...baseConfig.performance,
          ...(productionConfig as any).performance
        },
        healthCheck: {
          ...baseConfig.healthCheck,
          ...(productionConfig as any).healthCheck
        },
        redis: {
          ...baseConfig.redis,
          ...(productionConfig as any).redis
        },
        memory: {
          ...baseConfig.memory,
          ...(productionConfig as any).memory
        },
        logging: {
          ...baseConfig.logging,
          ...(productionConfig as any).logging
        }
      };
    case 'staging':
      return {
        ...baseConfig,
        features: {
          ...baseConfig.features,
          ...(stagingConfig as any).features
        },
        performance: {
          ...baseConfig.performance,
          ...(stagingConfig as any).performance
        },
        healthCheck: {
          ...baseConfig.healthCheck,
          ...(stagingConfig as any).healthCheck
        },
        redis: {
          ...baseConfig.redis,
          ...(stagingConfig as any).redis
        },
        memory: {
          ...baseConfig.memory,
          ...(stagingConfig as any).memory
        },
        logging: {
          ...baseConfig.logging,
          ...(stagingConfig as any).logging
        }
      };
    case 'development':
    default:
      return {
        ...baseConfig,
        features: {
          ...baseConfig.features,
          ...(developmentConfig as any).features
        },
        performance: {
          ...baseConfig.performance,
          ...(developmentConfig as any).performance
        },
        healthCheck: {
          ...baseConfig.healthCheck,
          ...(developmentConfig as any).healthCheck
        },
        redis: {
          ...baseConfig.redis,
          ...(developmentConfig as any).redis
        },
        memory: {
          ...baseConfig.memory,
          ...(developmentConfig as any).memory
        },
        logging: {
          ...baseConfig.logging,
          ...(developmentConfig as any).logging
        }
      };
  }
};

// Validate environment configuration
export const validateEnvironmentConfig = (config: EnvironmentConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate server settings
  if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
    errors.push('Invalid server port');
  }
  
  if (config.server.memoryLimit < 128) {
    errors.push('Memory limit too low (minimum 128MB)');
  }
  
  // Validate feature dependencies
  if (config.features.enableEmailTemplates && !config.external.mailgun.apiKey) {
    errors.push('Mailgun API key required when email templates are enabled');
  }
  
  if (config.features.enableRedis && !config.redis.enabled) {
    errors.push('Redis must be enabled when Redis features are enabled');
  }
  
  if (!config.security.sessionSecret || config.security.sessionSecret.length < 16) {
    errors.push('Session secret must be at least 16 characters');
  }
  
  // Validate performance settings
  if (config.performance.maxConcurrentRequests < 1) {
    errors.push('Max concurrent requests must be at least 1');
  }
  
  if (config.performance.requestTimeout < 1000) {
    errors.push('Request timeout must be at least 1000ms');
  }
  
  return { valid: errors.length === 0, errors };
};

// Get configuration with validation
export const getConfig = (): EnvironmentConfig => {
  const config = getEnvironmentConfig();
  const validation = validateEnvironmentConfig(config);
  
  if (!validation.valid) {
    console.warn('Environment configuration validation warnings:', validation.errors);
  }
  
  return config;
};

// Export singleton instance
export const environmentConfig = getConfig();

export default environmentConfig;