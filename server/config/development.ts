// Development configuration
interface DevelopmentConfig {
  features: {
    enableRedis: boolean;
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
}

export const developmentConfig: DevelopmentConfig = {
  // Features - mostly enabled for development
  features: {
    enableRedis: false, // Often disabled in development
    enableQueueSystem: true,
    enableHealthChecks: true,
    enableMetrics: true,
    enablePerformanceMonitoring: false, // Usually disabled in development
    enableAuditLogging: true,
    enableAnalytics: false, // Usually disabled in development
  },
  
  // Performance settings - relaxed for development
  performance: {
    maxConcurrentRequests: 25,
    requestTimeout: 60000, // Longer timeout for debugging
    keepAliveTimeout: 60000,
  },
  
  // Health checks - enabled but less frequent
  healthCheck: {
    enabled: true,
    interval: 120000, // 2 minutes
    timeout: 10000, // Longer timeout
    checks: ['database'],
  },
  
  // Redis configuration - often disabled in development
  redis: {
    enabled: false,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: true,
    connectTimeout: 10000,
  },
  
  // Memory settings - relaxed for development
  memory: {
    maxHeapUsagePercent: 90,
    gcInterval: 90000, // Run GC every 90 seconds
    preventMemoryLeaks: false,
  },
  
  // Logging - verbose for development
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    maxFiles: 1,
    console: true,
  }
};