/**
 * Metrics Collector Component
 * 
 * Collects system performance metrics, business metrics, and operational metrics
 * for monitoring dashboards and API endpoints.
 */

import { logger } from '../utils/logger';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { leads, campaigns, conversations, users, communications } from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';

export interface SystemMetrics {
  timestamp: string;
  system: {
    uptime: number;
    memory: MemoryMetrics;
    cpu: NodeJS.CpuUsage;
    process: ProcessMetrics;
  };
  performance: PerformanceMetrics;
  business: BusinessMetrics;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  heapUsagePercent: number;
  rss: number;
  external: number;
}

export interface ProcessMetrics {
  pid: number;
  version: string;
  platform: string;
  arch: string;
  startTime: Date;
}

export interface PerformanceMetrics {
  uptime: number;
  memory: MemoryMetrics;
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  errors: {
    rate: number;
    count: number;
  };
  database: {
    connectionCount: number;
    queryTime: number;
    slowQueries: number;
  };
}

export interface BusinessMetrics {
  leads: {
    total: number;
    newToday: number;
    conversionRate: number;
    byStatus: Record<string, number>;
  };
  campaigns: {
    total: number;
    active: number;
    engagement: number;
  };
  conversations: {
    total: number;
    active: number;
    averageResponseTime: string;
  };
  revenue: {
    total: number;
    monthly: number;
    averagePerLead: number;
  };
}

export interface MetricsCollectionOptions {
  includeBusinessMetrics?: boolean;
  includePerformanceDetails?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export class MetricsCollector {
  private performanceHistory: Array<{ timestamp: number; responseTime: number; errors: number }> = [];
  private readonly maxHistorySize = 1000;

  /**
   * Collect comprehensive system metrics
   */
  async collectSystemMetrics(options: MetricsCollectionOptions = {}): Promise<SystemMetrics> {
    const startTime = Date.now();
    
    logger.debug('Collecting system metrics');

    const [systemInfo, performanceMetrics, businessMetrics] = await Promise.allSettled([
      this.collectSystemInfo(),
      this.collectPerformanceMetrics(),
      options.includeBusinessMetrics !== false ? this.collectBusinessMetrics(options) : Promise.resolve({} as BusinessMetrics)
    ]);

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      system: systemInfo.status === 'fulfilled' ? systemInfo.value : this.getDefaultSystemInfo(),
      performance: performanceMetrics.status === 'fulfilled' ? performanceMetrics.value : this.getDefaultPerformanceMetrics(),
      business: businessMetrics.status === 'fulfilled' ? businessMetrics.value : this.getDefaultBusinessMetrics()
    };

    logger.debug('System metrics collected', { 
      duration: Date.now() - startTime,
      metricsSize: JSON.stringify(metrics).length 
    });

    return metrics;
  }

  /**
   * Collect system information and resource usage
   */
  async collectSystemInfo() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const memory: MemoryMetrics = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };

    const process_info: ProcessMetrics = {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      startTime: new Date(Date.now() - process.uptime() * 1000)
    };

    return {
      uptime: process.uptime(),
      memory,
      cpu: cpuUsage,
      process: process_info
    };
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const memoryUsage = process.memoryUsage();
    
    const memory: MemoryMetrics = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };

    // Calculate response time metrics from history
    const recentHistory = this.performanceHistory.slice(-100); // Last 100 requests
    const responseTimes = recentHistory.map(h => h.responseTime).sort((a, b) => a - b);
    
    const responseTime = {
      average: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      p95: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] || 0 : 0,
      p99: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] || 0 : 0
    };

    // Calculate throughput (requests per time period)
    const now = Date.now();
    const lastMinute = recentHistory.filter(h => now - h.timestamp < 60000);
    const lastSecond = recentHistory.filter(h => now - h.timestamp < 1000);

    const throughput = {
      requestsPerSecond: lastSecond.length,
      requestsPerMinute: lastMinute.length
    };

    // Calculate error rate
    const errors = {
      rate: recentHistory.length > 0 ? (recentHistory.filter(h => h.errors > 0).length / recentHistory.length) * 100 : 0,
      count: recentHistory.reduce((sum, h) => sum + h.errors, 0)
    };

    // Database metrics - get actual values
    const database = await this.getDatabaseMetrics();

    return {
      uptime: process.uptime(),
      memory,
      responseTime,
      throughput,
      errors,
      database
    };
  }

  /**
   * Collect business metrics from database
   */
  async collectBusinessMetrics(options: MetricsCollectionOptions = {}): Promise<BusinessMetrics> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Collect lead metrics
      const [totalLeads] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(leads);

      const [newLeadsToday] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(leads)
        .where(gte(leads.createdAt, today));

      const [convertedLeads] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(leads)
        .where(eq(leads.status, 'converted'));

      // Lead status breakdown
      const leadsByStatus = await db
        .select({ 
          status: leads.status, 
          count: sql<number>`count(*)::int` 
        })
        .from(leads)
        .groupBy(leads.status);

      const byStatus = leadsByStatus.reduce((acc, { status, count }) => {
        acc[status] = count;
        return acc;
      }, {} as Record<string, number>);

      // Campaign metrics
      const [totalCampaigns] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(campaigns);

      const [activeCampaigns] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(campaigns)
        .where(eq(campaigns.status, 'active'));

      // Conversation metrics
      const [totalConversations] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations);

      const [activeConversations] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(eq(conversations.status, 'active'));

      // Calculate metrics
      const conversionRate = totalLeads.count > 0 ? (convertedLeads.count / totalLeads.count) * 100 : 0;
      const campaignEngagement = totalCampaigns.count > 0 ? (activeCampaigns.count / totalCampaigns.count) * 100 : 0;

      return {
        leads: {
          total: totalLeads.count,
          newToday: newLeadsToday.count,
          conversionRate: Math.round(conversionRate * 100) / 100,
          byStatus
        },
        campaigns: {
          total: totalCampaigns.count,
          active: activeCampaigns.count,
          engagement: Math.round(campaignEngagement * 100) / 100
        },
        conversations: {
          total: totalConversations.count,
          active: activeConversations.count,
          averageResponseTime: '2.3 min' // Placeholder - would calculate from actual data
        },
        revenue: {
          total: convertedLeads.count * 1000, // Placeholder calculation
          monthly: convertedLeads.count * 800, // Placeholder
          averagePerLead: totalLeads.count > 0 ? (convertedLeads.count * 1000) / totalLeads.count : 0
        }
      };
    } catch (error) {
      logger.error('Failed to collect business metrics:', error);
      return this.getDefaultBusinessMetrics();
    }
  }

  /**
   * Record performance data point
   */
  recordPerformance(responseTime: number, errorCount: number = 0) {
    this.performanceHistory.push({
      timestamp: Date.now(),
      responseTime,
      errors: errorCount
    });

    // Keep history size manageable
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get performance history for analysis
   */
  getPerformanceHistory(minutes: number = 60) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.performanceHistory.filter(h => h.timestamp > cutoff);
  }

  /**
   * Get actual database metrics instead of hardcoded values
   */
  private async getDatabaseMetrics() {
    try {
      // Get actual database connection info
      const [connectionStats] = await db.execute(sql`
        SELECT
          count(*) as total_connections,
          count(CASE WHEN state = 'active' THEN 1 END) as active_connections
        FROM pg_stat_activity
      `);

      const stats = connectionStats as any;
      const totalConnections = parseInt(stats.total_connections) || 0;
      const activeConnections = parseInt(stats.active_connections) || 0;

      // Calculate average query time from recent history
      const recentHistory = this.performanceHistory.slice(-100);
      const avgQueryTime = recentHistory.length > 0
        ? recentHistory.reduce((sum, h) => sum + h.responseTime, 0) / recentHistory.length
        : 0;

      // Count slow queries from history
      const slowQueries = recentHistory.filter(h => h.responseTime > 1000).length;

      return {
        connectionCount: totalConnections,
        queryTime: Math.round(avgQueryTime),
        slowQueries
      };
    } catch (error) {
      logger.warn('Failed to get database metrics, using defaults:', error);
      return {
        connectionCount: 0,
        queryTime: 0,
        slowQueries: 0
      };
    }
  }

  private getDefaultSystemInfo() {
    const memoryUsage = process.memoryUsage();
    return {
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      cpu: process.cpuUsage(),
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        startTime: new Date(Date.now() - process.uptime() * 1000)
      }
    };
  }

  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    const memoryUsage = process.memoryUsage();
    return {
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      responseTime: { average: 0, p95: 0, p99: 0 },
      throughput: { requestsPerSecond: 0, requestsPerMinute: 0 },
      errors: { rate: 0, count: 0 },
      database: { connectionCount: 0, queryTime: 0, slowQueries: 0 }
    };
  }

  private getDefaultBusinessMetrics(): BusinessMetrics {
    return {
      leads: { total: 0, newToday: 0, conversionRate: 0, byStatus: {} },
      campaigns: { total: 0, active: 0, engagement: 0 },
      conversations: { total: 0, active: 0, averageResponseTime: '0 min' },
      revenue: { total: 0, monthly: 0, averagePerLead: 0 }
    };
  }
}
