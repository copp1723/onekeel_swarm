/**
 * Health Checker Component
 * 
 * Provides comprehensive health checking capabilities that integrate with
 * existing health infrastructure and schema validation systems.
 */

import { logger } from '../utils/logger';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { redis } from '../utils/redis-client';
import { serviceMonitor } from '../utils/service-health/service-monitor';
import { schemaValidator } from '../utils/schema-validator';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: number;
  error?: string;
  details?: any;
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    schema: HealthCheckResult;
    services: HealthCheckResult;
    memory: HealthCheckResult;
    websocket: HealthCheckResult;
  };
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  recommendations: string[];
}

export interface HealthCheckOptions {
  includeDetails?: boolean;
  timeout?: number;
  skipSlowChecks?: boolean;
}

export class HealthChecker {
  private readonly defaultTimeout = 5000; // 5 seconds

  /**
   * Perform comprehensive system health check
   */
  async checkSystemHealth(options: HealthCheckOptions = {}): Promise<SystemHealthStatus> {
    const startTime = Date.now();
    const recommendations: string[] = [];

    logger.info('Starting comprehensive health check');

    // Run all health checks in parallel with timeout protection
    const healthChecks = await Promise.allSettled([
      this.checkDatabase(options),
      this.checkRedis(options),
      this.checkSchemaValidation(options),
      this.checkExternalServices(options),
      this.checkMemory(options),
      this.checkWebSocket(options)
    ]);

    // Process results
    const [database, redis, schema, services, memory, websocket] = healthChecks.map(
      (result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const checkNames = ['database', 'redis', 'schema', 'services', 'memory', 'websocket'];
          logger.error(`Health check failed for ${checkNames[index]}:`, result.reason);
          return {
            status: 'unhealthy' as const,
            timestamp: new Date().toISOString(),
            responseTime: 0,
            error: result.reason?.message || 'Health check failed'
          };
        }
      }
    );

    // Calculate summary
    const checks = { database, redis, schema, services, memory, websocket };
    const summary = this.calculateSummary(checks);

    // Generate recommendations
    if (summary.unhealthy > 0) {
      recommendations.push('Critical systems are unhealthy - immediate attention required');
    }
    if (summary.degraded > 0) {
      recommendations.push('Some systems are degraded - monitor closely');
    }
    if (memory.status !== 'healthy') {
      recommendations.push('Memory usage is high - consider scaling or optimization');
    }

    // Determine overall status
    const overallStatus = this.determineOverallStatus(summary);

    const healthStatus: SystemHealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      summary,
      recommendations
    };

    logger.info('Health check completed', {
      status: overallStatus,
      duration: Date.now() - startTime,
      summary
    });

    return healthStatus;
  }

  /**
   * Check database health and connectivity
   */
  async checkDatabase(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Basic connectivity test
      await Promise.race([
        db.execute(sql`SELECT 1 as health_check`),
        this.createTimeout(options.timeout || this.defaultTimeout)
      ]);

      // Additional checks if details requested
      let details = {};
      if (options.includeDetails) {
        const [connectionInfo] = await db.execute(sql`
          SELECT 
            current_database() as database_name,
            current_user as user_name,
            version() as version
        `);
        details = connectionInfo;
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
    }
  }

  /**
   * Check Redis health and connectivity
   */
  async checkRedis(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test Redis connectivity
      await Promise.race([
        redis.ping(),
        this.createTimeout(options.timeout || this.defaultTimeout)
      ]);

      let details = {};
      if (options.includeDetails) {
        const info = await redis.info('server');
        details = { info: info.split('\r\n').slice(0, 5).join('\n') };
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Redis connection failed'
      };
    }
  }

  /**
   * Check schema validation status
   */
  async checkSchemaValidation(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Run schema validation
      const validationResult = await Promise.race([
        schemaValidator.validateAll(),
        this.createTimeout(options.timeout || this.defaultTimeout)
      ]);

      const status = validationResult.isValid ? 'healthy' : 'degraded';
      
      return {
        status,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: options.includeDetails ? validationResult : undefined
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Schema validation failed'
      };
    }
  }

  /**
   * Check external services health
   */
  async checkExternalServices(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const serviceHealth = await Promise.race([
        serviceMonitor.checkAllServices(),
        this.createTimeout(options.timeout || this.defaultTimeout)
      ]);

      const status = serviceHealth.status;
      
      return {
        status,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: options.includeDetails ? serviceHealth : { summary: serviceHealth.summary }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'External services check failed'
      };
    }
  }

  /**
   * Check memory usage and system resources
   */
  async checkMemory(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const heapUsagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (heapUsagePercent > 90) {
        status = 'unhealthy';
      } else if (heapUsagePercent > 75) {
        status = 'degraded';
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: options.includeDetails ? {
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          heapUsagePercent,
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        } : { heapUsagePercent }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Memory check failed'
      };
    }
  }

  /**
   * Check WebSocket server health
   */
  async checkWebSocket(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // For now, we'll check if WebSocket is enabled and return basic status
      // In a real implementation, this would check active connections, etc.
      const isEnabled = process.env.ENABLE_WEBSOCKET !== 'false';
      
      return {
        status: isEnabled ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: options.includeDetails ? { enabled: isEnabled } : undefined
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'WebSocket check failed'
      };
    }
  }

  private calculateSummary(checks: Record<string, HealthCheckResult>) {
    const values = Object.values(checks);
    return {
      total: values.length,
      healthy: values.filter(c => c.status === 'healthy').length,
      degraded: values.filter(c => c.status === 'degraded').length,
      unhealthy: values.filter(c => c.status === 'unhealthy').length
    };
  }

  private determineOverallStatus(summary: { healthy: number; degraded: number; unhealthy: number; total: number }): 'healthy' | 'degraded' | 'unhealthy' {
    if (summary.unhealthy > 0) return 'unhealthy';
    if (summary.degraded > 0) return 'degraded';
    return 'healthy';
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Health check timeout after ${ms}ms`)), ms);
    });
  }
}
