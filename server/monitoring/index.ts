/**
 * Unified Monitoring Infrastructure - Main Export Module
 * 
 * This module provides a centralized monitoring infrastructure that integrates
 * health checking, metrics collection, database monitoring, and service monitoring
 * into a unified system for the OneKeel Swarm platform.
 */

export { HealthChecker } from './health-checker';
export { MetricsCollector } from './metrics-collector';
export { DatabaseMonitor } from './database-monitor';
export { EnhancedServiceMonitor } from './service-monitor';

// Re-export types for external use
export type {
  HealthCheckResult,
  SystemHealthStatus,
  HealthCheckOptions
} from './health-checker';

export type {
  SystemMetrics,
  PerformanceMetrics,
  BusinessMetrics,
  MetricsCollectionOptions
} from './metrics-collector';

export type {
  DatabaseHealthStatus,
  DatabasePerformanceMetrics,
  DatabaseMonitorOptions
} from './database-monitor';

export type {
  EnhancedServiceHealth,
  EnhancedServiceMonitorOptions
} from './service-monitor';

// Create singleton instances for application-wide use
import { HealthChecker } from './health-checker';
import { MetricsCollector } from './metrics-collector';
import { DatabaseMonitor } from './database-monitor';
import { EnhancedServiceMonitor } from './service-monitor';

// Initialize monitoring components
export const healthChecker = new HealthChecker();
export const metricsCollector = new MetricsCollector();
export const databaseMonitor = new DatabaseMonitor();
export const enhancedServiceMonitor = new EnhancedServiceMonitor();

/**
 * Unified monitoring interface that provides a single entry point
 * for all monitoring operations
 */
export class UnifiedMonitor {
  constructor(
    private health: HealthChecker = healthChecker,
    private metrics: MetricsCollector = metricsCollector,
    private database: DatabaseMonitor = databaseMonitor,
    private services: EnhancedServiceMonitor = enhancedServiceMonitor
  ) {}

  /**
   * Get comprehensive system status
   */
  async getSystemStatus() {
    const [healthStatus, systemMetrics, dbHealth, serviceHealth] = await Promise.allSettled([
      this.health.checkSystemHealth(),
      this.metrics.collectSystemMetrics(),
      this.database.checkHealth(),
      this.services.checkAllServices()
    ]);

    return {
      timestamp: new Date().toISOString(),
      health: healthStatus.status === 'fulfilled' ? healthStatus.value : { status: 'unhealthy', error: 'Health check failed' },
      metrics: systemMetrics.status === 'fulfilled' ? systemMetrics.value : null,
      database: dbHealth.status === 'fulfilled' ? dbHealth.value : { status: 'unhealthy', error: 'Database check failed' },
      services: serviceHealth.status === 'fulfilled' ? serviceHealth.value : { status: 'unhealthy', error: 'Service check failed' },
      overall: this.calculateOverallStatus([healthStatus, systemMetrics, dbHealth, serviceHealth])
    };
  }

  /**
   * Get performance dashboard data
   */
  async getDashboardData() {
    const [performance, business, health] = await Promise.allSettled([
      this.metrics.collectPerformanceMetrics(),
      this.metrics.collectBusinessMetrics(),
      this.health.checkSystemHealth()
    ]);

    return {
      timestamp: new Date().toISOString(),
      performance: performance.status === 'fulfilled' ? performance.value : null,
      business: business.status === 'fulfilled' ? business.value : null,
      health: health.status === 'fulfilled' ? health.value : null,
      uptime: process.uptime(),
      version: '1.0.0'
    };
  }

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring(callback: (data: any) => void, intervalMs: number = 5000) {
    const interval = setInterval(async () => {
      try {
        const data = await this.getSystemStatus();
        callback(data);
      } catch (error) {
        callback({ error: 'Failed to collect monitoring data', timestamp: new Date().toISOString() });
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }

  private calculateOverallStatus(results: PromiseSettledResult<any>[]): 'healthy' | 'degraded' | 'unhealthy' {
    const failures = results.filter(r => r.status === 'rejected').length;
    const total = results.length;

    if (failures === 0) return 'healthy';
    if (failures < total / 2) return 'degraded';
    return 'unhealthy';
  }
}

// Export singleton unified monitor
export const unifiedMonitor = new UnifiedMonitor();
