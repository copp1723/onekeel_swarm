import { logger } from '../logger';
import { mailgunHealthChecker, MailgunHealthStatus } from './mailgun-health';
import { twilioHealthChecker, TwilioHealthStatus } from './twilio-health';
import { openRouterHealthChecker, OpenRouterHealthStatus } from './openrouter-health';

export interface ServiceHealthResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: number;
  configured: boolean;
  connected: boolean;
  error?: string;
  details?: any;
}

export interface SystemServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: ServiceHealthResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    configured: number;
    connected: number;
  };
  performance: {
    averageResponseTime: number;
    slowestService: string;
    fastestService: string;
  };
  recommendations: string[];
}

interface HealthChecker {
  checkHealth(): Promise<any>;
  getConfigurationSummary(): any;
}

export class ServiceMonitor {
  private healthCheckers: Record<string, HealthChecker> = {
    mailgun: mailgunHealthChecker,
    twilio: twilioHealthChecker,
    openrouter: openRouterHealthChecker
  };

  async checkAllServices(): Promise<SystemServiceHealth> {
    const startTime = Date.now();
    const services: ServiceHealthResult[] = [];
    const recommendations: string[] = [];

    // Run all service health checks in parallel
    const healthCheckPromises = Object.entries(this.healthCheckers).map(
      async ([serviceName, checker]) => {
        const serviceStartTime = Date.now();
        try {
          const healthStatus = await checker.checkHealth();

          let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
          if (!healthStatus.configured) {
            status = 'degraded';
            recommendations.push(`Configure ${serviceName} credentials for full functionality`);
          } else if (!healthStatus.connected) {
            status = 'unhealthy';
          }

          return {
            name: serviceName,
            status,
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - serviceStartTime,
            configured: healthStatus.configured,
            connected: healthStatus.connected,
            error: healthStatus.error,
            details: healthStatus.details
          };

        } catch (error) {
          return {
            name: serviceName,
            status: 'unhealthy' as const,
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - serviceStartTime,
            configured: false,
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            details: {}
          };
        }
      }
    );

    const results = await Promise.allSettled(healthCheckPromises);
    
    results.forEach((result, index) => {
      const serviceName = Object.keys(this.healthCheckers)[index];
      if (result.status === 'fulfilled') {
        services.push(result.value);
      } else {
        services.push({
          name: serviceName,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          responseTime: 0,
          configured: false,
          connected: false,
          error: 'Health check promise rejected',
          details: {}
        });
      }
    });

    // Calculate summary statistics
    const summary = {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
      configured: services.filter(s => s.configured).length,
      connected: services.filter(s => s.connected).length
    };

    // Determine overall system status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    // Calculate performance metrics
    const responseTimes = services.map(s => s.responseTime);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const slowestService = services.reduce((a, b) => a.responseTime > b.responseTime ? a : b).name;
    const fastestService = services.reduce((a, b) => a.responseTime < b.responseTime ? a : b).name;

    // Add general recommendations
    if (summary.configured < summary.total) {
      recommendations.push('Some external services are not configured - system will use fallback/mock modes');
    }
    
    if (summary.connected < summary.configured) {
      recommendations.push('Some configured services are not responding - check network connectivity and credentials');
    }

    const systemHealth: SystemServiceHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
      summary,
      performance: {
        averageResponseTime,
        slowestService,
        fastestService
      },
      recommendations: [...new Set(recommendations)] // Remove duplicates
    };

    // Log the health check results
    logger.info('Service health check completed', {
      status: overallStatus,
      duration: Date.now() - startTime,
      summary,
      performance: systemHealth.performance
    });

    return systemHealth;
  }

  async checkService(serviceName: string): Promise<ServiceHealthResult | null> {
    const checker = this.healthCheckers[serviceName];
    if (!checker) {
      return null;
    }

    const startTime = Date.now();
    try {
      const healthStatus = await checker.checkHealth();

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!healthStatus.configured) {
        status = 'degraded';
      } else if (!healthStatus.connected) {
        status = 'unhealthy';
      }

      return {
        name: serviceName,
        status,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        configured: healthStatus.configured,
        connected: healthStatus.connected,
        error: healthStatus.error,
        details: healthStatus.details
      };

    } catch (error) {
      return {
        name: serviceName,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        configured: false,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {}
      };
    }
  }

  getServiceNames(): string[] {
    return Object.keys(this.healthCheckers);
  }

  async getServiceConfigurations(): Promise<Record<string, any>> {
    const configurations: Record<string, any> = {};
    
    for (const [serviceName, checker] of Object.entries(this.healthCheckers)) {
      configurations[serviceName] = checker.getConfigurationSummary();
    }

    return configurations;
  }
}

// Export singleton instance
export const serviceMonitor = new ServiceMonitor();
