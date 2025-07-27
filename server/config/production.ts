// Production configuration for ultra-low-memory environments
export const productionConfig = {
  // Disable ALL non-essential features to save memory
  features: {
    enableRedis: false, // Disable Redis completely
    enableQueueSystem: false, // Disable queue system
    enableHealthChecks: false, // Disable health checks completely
    enableMetrics: false, // Disable metrics
    enablePerformanceMonitoring: false, // Disable performance monitoring
    enableAuditLogging: false, // Disable audit logging
    enableAnalytics: false, // Disable analytics
  },
  
  // Minimal performance settings
  performance: {
    maxConcurrentRequests: 20, // Reduced significantly
    requestTimeout: 30000,
    keepAliveTimeout: 65000,
  },
  
  // Disable health checks completely
  healthCheck: {
    enabled: false,
    interval: 0, // Disabled
    timeout: 0,
    checks: [], // No checks
  },
  
  // Redis configuration - disabled
  redis: {
    enabled: false,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
    connectTimeout: 0,
  },
  
  // Aggressive memory limits
  memory: {
    maxHeapUsagePercent: 75, // Lower threshold
    gcInterval: 30000, // Run GC every 30 seconds
    preventMemoryLeaks: true,
  },
  
  // Logging - minimal
  logging: {
    level: process.env.LOG_LEVEL || 'error',
    maxFiles: 0, // No file logging
    console: true,
  }
};