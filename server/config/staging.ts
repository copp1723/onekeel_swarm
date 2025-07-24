// Staging configuration
interface StagingConfig {
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

export const stagingConfig: StagingConfig = {
  // Features - mostly enabled but with some limitations
  features: {
    enableRedis: true,
    enableQueueSystem: true,
    enableHealthChecks: true,
    enableMetrics: true,
    enablePerformanceMonitoring: true,
    enableAuditLogging: true,
    enableAnalytics: true,
  },
  
  // Performance settings - moderate
  performance: {
    maxConcurrentRequests: 50,
    requestTimeout: 30000,
    keepAliveTimeout: 30000,
  },
  
  // Health checks - enabled with moderate frequency
  healthCheck: {
    enabled: true,
    interval: 60000, // 1 minute
    timeout: 5000,
    checks: ['database', 'redis', 'external'],
  },
  
  // Redis configuration - enabled
  redis: {
    enabled: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: true,
    connectTimeout: 5000,
  },
  
  // Memory settings - moderate
  memory: {
    maxHeapUsagePercent: 80,
    gcInterval: 45000, // Run GC every 45 seconds
    preventMemoryLeaks: true,
  },
  
  // Logging - detailed but not excessive
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: 3,
    console: true,
  }
};