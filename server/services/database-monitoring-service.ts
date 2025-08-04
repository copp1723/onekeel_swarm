import { db } from '../db/client';
import { logger } from '../utils/logger';
import { cacheService } from './cache-service';
import { sql } from 'drizzle-orm';

/**
 * Database monitoring service for performance tracking and alerting
 */
export class DatabaseMonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private metrics: DatabaseMetrics = {
    queryCount: 0,
    slowQueries: 0,
    connectionCount: 0,
    averageResponseTime: 0,
    errorCount: 0,
    cacheHitRate: 0
  };

  private readonly thresholds = {
    slowQueryTime: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'), // 1 second
    maxConnections: parseInt(process.env.MAX_DB_CONNECTIONS || '15'),
    maxResponseTime: parseInt(process.env.MAX_RESPONSE_TIME || '2000'), // 2 seconds
    minCacheHitRate: parseFloat(process.env.MIN_CACHE_HIT_RATE || '0.8') // 80%
  };

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start database monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Database monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    const interval = parseInt(process.env.DB_MONITORING_INTERVAL || '60000'); // 1 minute

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkThresholds();
        await this.updateHealthStatus();
      } catch (error) {
        logger.error('Database monitoring error', error as Error);
      }
    }, interval);

    logger.info('Database monitoring started', { 
      interval: `${interval}ms`,
      thresholds: this.thresholds
    });
  }

  /**
   * Stop database monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Database monitoring stopped');
  }

  /**
   * Collect comprehensive database metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const startTime = Date.now();

      // Test basic connectivity and measure response time
      await db.execute(sql`SELECT 1 as health_check`);
      const responseTime = Date.now() - startTime;

      // Collect database statistics
      const stats = await this.getDetailedStats();
      
      // Update metrics
      this.metrics = {
        queryCount: stats.queryCount || 0,
        slowQueries: stats.slowQueries || 0,
        connectionCount: stats.connectionCount || 0,
        averageResponseTime: responseTime,
        errorCount: stats.errorCount || 0,
        cacheHitRate: await this.getCacheHitRate()
      };

      // Cache metrics for dashboard
      await cacheService.set('db_monitoring_metrics', this.metrics, 120);

      logger.debug('Database metrics collected', this.metrics);

    } catch (error) {
      logger.error('Failed to collect database metrics', error as Error);
      this.metrics.errorCount++;
    }
  }

  /**
   * Get detailed database statistics
   */
  private async getDetailedStats(): Promise<any> {
    try {
      const [stats] = await db
        .select({
          // Connection statistics
          connectionStats: sql`
            (SELECT json_build_object(
              'active_connections', (
                SELECT COUNT(*) 
                FROM pg_stat_activity 
                WHERE state = 'active'
              ),
              'idle_connections', (
                SELECT COUNT(*) 
                FROM pg_stat_activity 
                WHERE state = 'idle'
              ),
              'total_connections', (
                SELECT COUNT(*) 
                FROM pg_stat_activity
              )
            ))
          `.as('connectionStats'),
          
          // Query statistics
          queryStats: sql`
            (SELECT json_build_object(
              'total_queries', COALESCE(SUM(calls), 0),
              'slow_queries', COALESCE(SUM(CASE WHEN mean_time > ${this.thresholds.slowQueryTime} THEN calls ELSE 0 END), 0),
              'average_time', COALESCE(AVG(mean_time), 0),
              'total_time', COALESCE(SUM(total_time), 0)
            )
            FROM pg_stat_statements 
            WHERE query NOT LIKE '%pg_stat_statements%')
          `.as('queryStats'),

          // Database size and performance
          databaseStats: sql`
            (SELECT json_build_object(
              'database_size', pg_database_size(current_database()),
              'cache_hit_ratio', (
                SELECT ROUND(
                  (sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0)), 2
                ) 
                FROM pg_stat_database 
                WHERE datname = current_database()
              ),
              'transactions_per_second', (
                SELECT ROUND(
                  (xact_commit + xact_rollback) / 
                  GREATEST(EXTRACT(epoch FROM (now() - stats_reset)), 1), 2
                )
                FROM pg_stat_database 
                WHERE datname = current_database()
              )
            ))
          `.as('databaseStats'),

          // Lock statistics
          lockStats: sql`
            (SELECT json_build_object(
              'active_locks', COUNT(*),
              'waiting_locks', COUNT(CASE WHEN NOT granted THEN 1 END),
              'blocking_queries', COUNT(DISTINCT pid)
            )
            FROM pg_locks)
          `.as('lockStats'),

          // Table statistics for top tables
          tableStats: sql`
            (SELECT json_agg(
              json_build_object(
                'table_name', schemaname || '.' || relname,
                'size_bytes', pg_total_relation_size(schemaname||'.'||relname),
                'seq_scans', seq_scan,
                'seq_tup_read', seq_tup_read,
                'idx_scans', idx_scan,
                'idx_tup_fetch', idx_tup_fetch,
                'n_tup_ins', n_tup_ins,
                'n_tup_upd', n_tup_upd,
                'n_tup_del', n_tup_del
              )
            )
            FROM pg_stat_user_tables
            ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC
            LIMIT 10)
          `.as('tableStats')
        })
        .from(sql`(SELECT 1) as dummy`);

      return {
        queryCount: stats?.queryStats?.total_queries || 0,
        slowQueries: stats?.queryStats?.slow_queries || 0,
        connectionCount: stats?.connectionStats?.total_connections || 0,
        errorCount: 0, // This would be tracked separately
        cacheHitRatio: stats?.databaseStats?.cache_hit_ratio || 0,
        detailed: stats
      };

    } catch (error) {
      logger.error('Failed to get detailed database stats', error as Error);
      return {};
    }
  }

  /**
   * Get cache hit rate from Redis
   */
  private async getCacheHitRate(): Promise<number> {
    try {
      const stats = await cacheService.getStats();
      if (stats.enabled && stats.keyspace) {
        // Parse Redis INFO output to get hit rate
        const info = stats.keyspace;
        const hitRateMatch = info.match(/keyspace_hits:(\d+)/);
        const missRateMatch = info.match(/keyspace_misses:(\d+)/);
        
        if (hitRateMatch && missRateMatch) {
          const hits = parseInt(hitRateMatch[1]);
          const misses = parseInt(missRateMatch[1]);
          const total = hits + misses;
          return total > 0 ? (hits / total) : 0;
        }
      }
      return 0;
    } catch (error) {
      logger.error('Failed to get cache hit rate', error as Error);
      return 0;
    }
  }

  /**
   * Check performance thresholds and send alerts
   */
  private async checkThresholds(): Promise<void> {
    const alerts = [];

    // Check slow queries
    if (this.metrics.slowQueries > 10) {
      alerts.push({
        type: 'slow_queries',
        severity: 'warning',
        message: `High number of slow queries detected: ${this.metrics.slowQueries}`,
        threshold: 10,
        current: this.metrics.slowQueries
      });
    }

    // Check connection count
    if (this.metrics.connectionCount > this.thresholds.maxConnections) {
      alerts.push({
        type: 'high_connections',
        severity: 'critical',
        message: `High connection count: ${this.metrics.connectionCount}`,
        threshold: this.thresholds.maxConnections,
        current: this.metrics.connectionCount
      });
    }

    // Check response time
    if (this.metrics.averageResponseTime > this.thresholds.maxResponseTime) {
      alerts.push({
        type: 'high_response_time',
        severity: 'warning',
        message: `High database response time: ${this.metrics.averageResponseTime}ms`,
        threshold: this.thresholds.maxResponseTime,
        current: this.metrics.averageResponseTime
      });
    }

    // Check cache hit rate
    if (this.metrics.cacheHitRate < this.thresholds.minCacheHitRate && this.metrics.cacheHitRate > 0) {
      alerts.push({
        type: 'low_cache_hit_rate',
        severity: 'warning',
        message: `Low cache hit rate: ${(this.metrics.cacheHitRate * 100).toFixed(1)}%`,
        threshold: this.thresholds.minCacheHitRate * 100,
        current: this.metrics.cacheHitRate * 100
      });
    }

    // Log and store alerts
    if (alerts.length > 0) {
      logger.warn('Database performance alerts', { alerts });
      await cacheService.set('db_monitoring_alerts', alerts, 300);
      
      // Send notifications if configured
      await this.sendAlerts(alerts);
    }
  }

  /**
   * Update overall health status
   */
  private async updateHealthStatus(): Promise<void> {
    let status = 'healthy';
    const issues = [];

    if (this.metrics.errorCount > 5) {
      status = 'unhealthy';
      issues.push('High error count');
    } else if (this.metrics.slowQueries > 20) {
      status = 'degraded';
      issues.push('Too many slow queries');
    } else if (this.metrics.connectionCount > this.thresholds.maxConnections * 0.8) {
      status = 'degraded';
      issues.push('High connection usage');
    } else if (this.metrics.averageResponseTime > this.thresholds.maxResponseTime * 0.8) {
      status = 'degraded';
      issues.push('Slow response times');
    }

    const healthStatus = {
      status,
      issues,
      lastCheck: new Date().toISOString(),
      metrics: this.metrics
    };

    await cacheService.set('db_health_status', healthStatus, 180);
    
    if (status !== 'healthy') {
      logger.warn('Database health degraded', healthStatus);
    }
  }

  /**
   * Send alerts to configured channels
   */
  private async sendAlerts(alerts: any[]): Promise<void> {
    // This would integrate with your notification system
    // For now, just log critical alerts
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
    
    if (criticalAlerts.length > 0) {
      logger.error('CRITICAL DATABASE ALERTS', { alerts: criticalAlerts });
      
      // Here you could integrate with:
      // - Email notifications
      // - Slack/Teams webhooks
      // - PagerDuty/incident management
      // - SMS alerts
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  /**
   * Get slow queries report
   */
  public async getSlowQueriesReport(): Promise<SlowQuery[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          stddev_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > ${this.thresholds.slowQueryTime}
        ORDER BY mean_time DESC 
        LIMIT 50
      `);

      return result.rows.map(row => ({
        query: row.query as string,
        calls: row.calls as number,
        totalTime: row.total_time as number,
        meanTime: row.mean_time as number,
        stddevTime: row.stddev_time as number,
        rows: row.rows as number
      }));
    } catch (error) {
      logger.error('Failed to get slow queries report', error as Error);
      return [];
    }
  }

  /**
   * Get blocking queries report
   */
  public async getBlockingQueries(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          bl.pid as blocked_pid,
          bl.usename as blocked_user,
          bl.query as blocked_query,
          kl.pid as blocking_pid,
          kl.usename as blocking_user,
          kl.query as blocking_query,
          NOW() - bl.query_start as blocked_duration
        FROM pg_stat_activity bl
        JOIN pg_locks l ON bl.pid = l.pid
        JOIN pg_locks kl ON l.transactionid = kl.transactionid
        JOIN pg_stat_activity ka ON kl.pid = ka.pid
        WHERE bl.pid != kl.pid
        AND NOT l.granted
        AND kl.granted
        ORDER BY blocked_duration DESC
      `);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get blocking queries', error as Error);
      return [];
    }
  }

  /**
   * Get table statistics report
   */
  public async getTableStatsReport(limit: number = 20): Promise<any[]> {
    const cacheKey = `table_stats_report:${limit}`;
    
    return await cacheService.getOrSet(cacheKey, async () => {
      const result = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT ${limit}
      `);

      return result.rows;
    }, 300); // 5 minutes cache
  }

  /**
   * Generate database health report
   */
  public async generateHealthReport(): Promise<DatabaseHealthReport> {
    const slowQueries = await this.getSlowQueriesReport();
    const blockingQueries = await this.getBlockingQueries();
    const tableStats = await this.getTableStatsReport();
    const detailedStats = await this.getDetailedStats();

    return {
      timestamp: new Date().toISOString(),
      status: this.metrics.errorCount > 0 ? 'degraded' : 'healthy',
      metrics: this.metrics,
      slowQueries: slowQueries.slice(0, 10),
      blockingQueries,
      tableStats: tableStats.slice(0, 10),
      recommendations: this.generateRecommendations(slowQueries, tableStats),
      detailedStats
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(slowQueries: SlowQuery[], tableStats: any[]): string[] {
    const recommendations = [];

    // Slow query recommendations
    if (slowQueries.length > 0) {
      recommendations.push('Consider optimizing slow queries or adding appropriate indexes');
      
      const selectQueries = slowQueries.filter(q => q.query.toLowerCase().includes('select'));
      if (selectQueries.length > 0) {
        recommendations.push('Review SELECT queries for missing indexes or inefficient WHERE clauses');
      }
    }

    // Table statistics recommendations
    const largeSeqScans = tableStats.filter(t => t.seq_scan > 1000 && t.idx_scan < t.seq_scan);
    if (largeSeqScans.length > 0) {
      recommendations.push(`Tables with high sequential scans: ${largeSeqScans.map(t => t.tablename).join(', ')}`);
    }

    const deadTuples = tableStats.filter(t => t.dead_tuples > t.live_tuples * 0.1);
    if (deadTuples.length > 0) {
      recommendations.push('Some tables need VACUUM to clean up dead tuples');
    }

    // Connection recommendations
    if (this.metrics.connectionCount > this.thresholds.maxConnections * 0.7) {
      recommendations.push('Consider implementing connection pooling or reducing connection count');
    }

    // Cache recommendations
    if (this.metrics.cacheHitRate < 0.9 && this.metrics.cacheHitRate > 0) {
      recommendations.push('Cache hit rate is below optimal, consider warming up caches or increasing cache TTLs');
    }

    return recommendations;
  }
}

// Types
interface DatabaseMetrics {
  queryCount: number;
  slowQueries: number;
  connectionCount: number;
  averageResponseTime: number;
  errorCount: number;
  cacheHitRate: number;
}

interface SlowQuery {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  stddevTime: number;
  rows: number;
}

interface DatabaseHealthReport {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: DatabaseMetrics;
  slowQueries: SlowQuery[];
  blockingQueries: any[];
  tableStats: any[];
  recommendations: string[];
  detailedStats: any;
}

// Create singleton instance
export const databaseMonitoringService = new DatabaseMonitoringService();

// Export for dependency injection
export { DatabaseMonitoringService };