/**
 * Enhanced Service Monitor Component
 * 
 * Enhances the existing service monitor to integrate with the new monitoring
 * infrastructure and provide comprehensive service health monitoring.
 */

import { logger } from '../utils/logger';
import { serviceMonitor as existingServiceMonitor } from '../utils/service-health/service-monitor';
import type { SystemServiceHealth, ServiceHealthResult } from '../utils/service-health/service-monitor';

// This interface is now defined at the bottom to avoid conflicts

export interface EnhancedServiceHealth extends SystemServiceHealth {
  monitoring: {
    lastCheck: string;
    checkInterval: number;
    failureCount: number;
    successCount: number;
  };
  alerts: Array<{
    service: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
  }>;
  trends: {
    responseTimeHistory: Array<{ timestamp: string; service: string; responseTime: number }>;
    availabilityHistory: Array<{ timestamp: string; service: string; available: boolean }>;
  };
}

export class EnhancedServiceMonitor {
  private checkHistory: Array<{
    timestamp: number;
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
  }> = [];
  
  private alertHistory: Array<{
    service: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
  }> = [];

  private readonly maxHistorySize = 1000;
  private readonly maxAlertHistory = 100;
  private lastCheckTime = 0;
  private failureCounts: Record<string, number> = {};
  private successCounts: Record<string, number> = {};

  /**
   * Enhanced service health check with monitoring features
   */
  async checkAllServices(options: EnhancedServiceMonitorOptions = {}): Promise<EnhancedServiceHealth> {
    const startTime = Date.now();
    
    logger.debug('Starting enhanced service health check');

    try {
      // Use existing service monitor for core functionality
      const baseHealth = await existingServiceMonitor.checkAllServices();
      
      // Update monitoring statistics
      this.updateMonitoringStats(baseHealth.services);
      
      // Generate alerts based on service status
      const alerts = this.generateAlerts(baseHealth.services);
      
      // Get trends from history
      const trends = this.getTrends();

      const enhancedHealth: EnhancedServiceHealth = {
        ...baseHealth,
        monitoring: {
          lastCheck: new Date().toISOString(),
          checkInterval: 30000, // 30 seconds default
          failureCount: Object.values(this.failureCounts).reduce((sum, count) => sum + count, 0),
          successCount: Object.values(this.successCounts).reduce((sum, count) => sum + count, 0)
        },
        alerts,
        trends
      };

      this.lastCheckTime = Date.now();

      logger.debug('Enhanced service health check completed', {
        duration: Date.now() - startTime,
        servicesChecked: baseHealth.services.length,
        alertsGenerated: alerts.length
      });

      return enhancedHealth;
    } catch (error) {
      logger.error('Enhanced service health check failed:', error);
      
      // Return degraded status with error information
      return this.getFailsafeHealth(error);
    }
  }

  /**
   * Check individual service health
   */
  async checkService(serviceName: string, options: EnhancedServiceMonitorOptions = {}): Promise<ServiceHealthResult | null> {
    try {
      const result = await existingServiceMonitor.checkService(serviceName);
      
      if (result) {
        // Record the check result
        this.recordServiceCheck(result);
        
        // Update counters
        if (result.status === 'healthy') {
          this.successCounts[serviceName] = (this.successCounts[serviceName] || 0) + 1;
        } else {
          this.failureCounts[serviceName] = (this.failureCounts[serviceName] || 0) + 1;
        }
      }
      
      return result;
    } catch (error) {
      logger.error(`Service check failed for ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * Get service monitoring statistics
   */
  getMonitoringStats() {
    return {
      lastCheck: new Date(this.lastCheckTime).toISOString(),
      totalChecks: this.checkHistory.length,
      failureCount: Object.values(this.failureCounts).reduce((sum, count) => sum + count, 0),
      successCount: Object.values(this.successCounts).reduce((sum, count) => sum + count, 0),
      alertCount: this.alertHistory.length,
      services: Object.keys({ ...this.failureCounts, ...this.successCounts })
    };
  }

  /**
   * Get service availability over time
   */
  getServiceAvailability(serviceName: string, hours: number = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const serviceHistory = this.checkHistory.filter(
      check => check.service === serviceName && check.timestamp > cutoff
    );

    if (serviceHistory.length === 0) {
      return { availability: 0, totalChecks: 0, uptime: 0 };
    }

    const healthyChecks = serviceHistory.filter(check => check.status === 'healthy').length;
    const availability = (healthyChecks / serviceHistory.length) * 100;

    return {
      availability: Math.round(availability * 100) / 100,
      totalChecks: serviceHistory.length,
      uptime: Math.round(availability * 100) / 100
    };
  }

  /**
   * Get response time trends for a service
   */
  getResponseTimeTrends(serviceName: string, hours: number = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const serviceHistory = this.checkHistory.filter(
      check => check.service === serviceName && check.timestamp > cutoff
    );

    const responseTimes = serviceHistory.map(check => check.responseTime);
    
    if (responseTimes.length === 0) {
      return { average: 0, min: 0, max: 0, trend: 'stable' };
    }

    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const min = Math.min(...responseTimes);
    const max = Math.max(...responseTimes);

    // Simple trend calculation (comparing first half vs second half)
    const midpoint = Math.floor(responseTimes.length / 2);
    const firstHalf = responseTimes.slice(0, midpoint);
    const secondHalf = responseTimes.slice(midpoint);
    
    const firstAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
    
    let trend = 'stable';
    if (secondAvg > firstAvg * 1.1) trend = 'increasing';
    else if (secondAvg < firstAvg * 0.9) trend = 'decreasing';

    return {
      average: Math.round(average),
      min,
      max,
      trend
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(severity?: 'low' | 'medium' | 'high' | 'critical') {
    let alerts = this.alertHistory;
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Return recent alerts (last 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return alerts.filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Clear old monitoring data
   */
  clearOldData(hours: number = 168) { // Default 7 days
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    
    this.checkHistory = this.checkHistory.filter(check => check.timestamp > cutoff);
    
    const cutoffISO = new Date(cutoff).toISOString();
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoffISO);
  }

  private updateMonitoringStats(services: ServiceHealthResult[]) {
    services.forEach(service => {
      this.recordServiceCheck(service);
      
      if (service.status === 'healthy') {
        this.successCounts[service.name] = (this.successCounts[service.name] || 0) + 1;
      } else {
        this.failureCounts[service.name] = (this.failureCounts[service.name] || 0) + 1;
      }
    });
  }

  private recordServiceCheck(service: ServiceHealthResult) {
    this.checkHistory.push({
      timestamp: Date.now(),
      service: service.name,
      status: service.status,
      responseTime: service.responseTime
    });

    // Keep history size manageable
    if (this.checkHistory.length > this.maxHistorySize) {
      this.checkHistory = this.checkHistory.slice(-this.maxHistorySize);
    }
  }

  private generateAlerts(services: ServiceHealthResult[]) {
    const alerts: Array<{
      service: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      timestamp: string;
    }> = [];

    services.forEach(service => {
      if (service.status === 'unhealthy') {
        alerts.push({
          service: service.name,
          severity: 'critical',
          message: `Service ${service.name} is unhealthy: ${service.error || 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
      } else if (service.status === 'degraded') {
        alerts.push({
          service: service.name,
          severity: 'medium',
          message: `Service ${service.name} is degraded: ${service.error || 'Performance issues detected'}`,
          timestamp: new Date().toISOString()
        });
      } else if (service.responseTime > 5000) {
        alerts.push({
          service: service.name,
          severity: 'low',
          message: `Service ${service.name} has high response time: ${service.responseTime}ms`,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Add new alerts to history
    alerts.forEach(alert => {
      this.alertHistory.push(alert);
    });

    // Keep alert history size manageable
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory = this.alertHistory.slice(-this.maxAlertHistory);
    }

    return alerts;
  }

  private getTrends() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // Last 24 hours
    const recentHistory = this.checkHistory.filter(check => check.timestamp > cutoff);

    return {
      responseTimeHistory: recentHistory.map(check => ({
        timestamp: new Date(check.timestamp).toISOString(),
        service: check.service,
        responseTime: check.responseTime
      })),
      availabilityHistory: recentHistory.map(check => ({
        timestamp: new Date(check.timestamp).toISOString(),
        service: check.service,
        available: check.status === 'healthy'
      }))
    };
  }

  private getFailsafeHealth(error: any): EnhancedServiceHealth {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: [],
      summary: {
        total: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        configured: 0,
        connected: 0
      },
      performance: {
        averageResponseTime: 0,
        slowestService: 'unknown',
        fastestService: 'unknown'
      },
      recommendations: ['Service monitoring system is experiencing issues'],
      monitoring: {
        lastCheck: new Date().toISOString(),
        checkInterval: 30000,
        failureCount: 1,
        successCount: 0
      },
      alerts: [{
        service: 'monitoring',
        severity: 'critical',
        message: `Service monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }],
      trends: {
        responseTimeHistory: [],
        availabilityHistory: []
      }
    };
  }
}

// Export types for external use
export type { ServiceHealthResult, SystemServiceHealth } from '../utils/service-health/service-monitor';
export type { EnhancedServiceHealth };

// Rename interface to avoid confusion
export interface EnhancedServiceMonitorOptions {
  includeDetails?: boolean;
  timeout?: number;
  skipSlowServices?: boolean;
}
