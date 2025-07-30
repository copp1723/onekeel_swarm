/**
 * Database Monitor Component
 * 
 * Monitors database performance, connection health, query performance,
 * and integrates with existing database health checks.
 */

import { logger } from '../utils/logger';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface DatabaseHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: number;
  connections: DatabaseConnectionInfo;
  performance: DatabasePerformanceMetrics;
  storage: DatabaseStorageInfo;
  replication?: DatabaseReplicationInfo;
  error?: string;
}

export interface DatabaseConnectionInfo {
  total: number;
  active: number;
  idle: number;
  waiting: number;
  maxConnections: number;
  connectionUtilization: number;
}

export interface DatabasePerformanceMetrics {
  averageQueryTime: number;
  slowQueries: number;
  queriesPerSecond: number;
  cacheHitRatio: number;
  indexUsage: number;
  lockWaits: number;
  deadlocks: number;
}

export interface DatabaseStorageInfo {
  totalSize: string;
  usedSize: string;
  freeSize: string;
  utilizationPercent: number;
  largestTables: Array<{
    name: string;
    size: string;
    rows: number;
  }>;
}

export interface DatabaseReplicationInfo {
  isReplicated: boolean;
  replicationLag?: number;
  replicaStatus?: string;
}

export interface DatabaseMonitorOptions {
  includePerformanceDetails?: boolean;
  includeStorageInfo?: boolean;
  includeReplicationInfo?: boolean;
  timeout?: number;
}

export class DatabaseMonitor {
  private readonly defaultTimeout = 10000; // 10 seconds
  private queryHistory: Array<{ timestamp: number; duration: number; query: string }> = [];
  private readonly maxHistorySize = 1000;

  /**
   * Comprehensive database health check
   */
  async checkHealth(options: DatabaseMonitorOptions = {}): Promise<DatabaseHealthStatus> {
    const startTime = Date.now();
    
    logger.debug('Starting database health check');

    try {
      // Run health checks in parallel
      const [connectionInfo, performanceMetrics, storageInfo] = await Promise.allSettled([
        this.getConnectionInfo(),
        this.getPerformanceMetrics(options),
        options.includeStorageInfo ? this.getStorageInfo() : Promise.resolve(this.getDefaultStorageInfo())
      ]);

      const connections = connectionInfo.status === 'fulfilled' ? connectionInfo.value : this.getDefaultConnectionInfo();
      const performance = performanceMetrics.status === 'fulfilled' ? performanceMetrics.value : this.getDefaultPerformanceMetrics();
      const storage = storageInfo.status === 'fulfilled' ? storageInfo.value : this.getDefaultStorageInfo();

      // Determine overall health status
      const status = this.determineHealthStatus(connections, performance, storage);

      const healthStatus: DatabaseHealthStatus = {
        status,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        connections,
        performance,
        storage
      };

      logger.debug('Database health check completed', {
        status,
        duration: Date.now() - startTime,
        connectionUtilization: connections.connectionUtilization,
        avgQueryTime: performance.averageQueryTime
      });

      return healthStatus;
    } catch (error) {
      logger.error('Database health check failed:', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        connections: this.getDefaultConnectionInfo(),
        performance: this.getDefaultPerformanceMetrics(),
        storage: this.getDefaultStorageInfo(),
        error: error instanceof Error ? error.message : 'Database health check failed'
      };
    }
  }

  /**
   * Get database connection information
   */
  async getConnectionInfo(): Promise<DatabaseConnectionInfo> {
    try {
      // Get connection statistics from PostgreSQL
      const [connectionStats] = await db.execute(sql`
        SELECT 
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
          (SELECT count(*) FROM pg_stat_activity) as total_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL) as waiting_connections
      `);

      const stats = connectionStats as any;
      const total = parseInt(stats.total_connections) || 0;
      const active = parseInt(stats.active_connections) || 0;
      const idle = parseInt(stats.idle_connections) || 0;
      const waiting = parseInt(stats.waiting_connections) || 0;
      const maxConnections = parseInt(stats.max_connections) || 100;

      return {
        total,
        active,
        idle,
        waiting,
        maxConnections,
        connectionUtilization: Math.round((total / maxConnections) * 100)
      };
    } catch (error) {
      logger.warn('Failed to get connection info, using defaults:', error);
      return this.getDefaultConnectionInfo();
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics(options: DatabaseMonitorOptions = {}): Promise<DatabasePerformanceMetrics> {
    try {
      // Check if pg_stat_statements extension is available
      const [extensionCheck] = await db.execute(sql`
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
        ) as has_pg_stat_statements
      `);

      let performanceStats: any = { avg_query_time: 0, total_queries: 0, slow_queries: 0 };

      if ((extensionCheck as any).has_pg_stat_statements) {
        // Get performance statistics from pg_stat_statements if available
        const [stats] = await db.execute(sql`
          SELECT
            COALESCE(AVG(mean_exec_time), 0) as avg_query_time,
            COALESCE(SUM(calls), 0) as total_queries,
            COALESCE(COUNT(CASE WHEN mean_exec_time > 1000 THEN 1 END), 0) as slow_queries
          FROM pg_stat_statements
          LIMIT 1
        `);
        performanceStats = stats;
      } else {
        // Fallback: Use basic database statistics
        logger.warn('pg_stat_statements extension not available, using basic metrics');
        performanceStats = {
          avg_query_time: 0,
          total_queries: 0,
          slow_queries: 0
        };
      }

      // Calculate queries per second from recent history
      const recentQueries = this.queryHistory.filter(q => Date.now() - q.timestamp < 60000);
      const queriesPerSecond = recentQueries.length / 60;

      // Get cache hit ratio with error handling
      let cacheStats: any = { cache_hit_ratio: 0 };
      try {
        const [stats] = await db.execute(sql`
          SELECT
            CASE
              WHEN (blks_hit + blks_read) > 0
              THEN ROUND((blks_hit::float / (blks_hit + blks_read)) * 100, 2)
              ELSE 0
            END as cache_hit_ratio
          FROM pg_stat_database
          WHERE datname = current_database()
        `);
        cacheStats = stats;
      } catch (error) {
        logger.warn('Failed to get cache hit ratio, using default:', error);
        cacheStats = { cache_hit_ratio: 0 };
      }

      const stats = performanceStats as any;
      const cache = cacheStats as any;

      return {
        averageQueryTime: parseFloat(stats.avg_query_time) || 0,
        slowQueries: parseInt(stats.slow_queries) || 0,
        queriesPerSecond: Math.round(queriesPerSecond * 100) / 100,
        cacheHitRatio: parseFloat(cache.cache_hit_ratio) || 0,
        indexUsage: 95, // Placeholder - would calculate from pg_stat_user_indexes
        lockWaits: 0, // Placeholder - would get from pg_locks
        deadlocks: 0 // Placeholder - would get from pg_stat_database
      };
    } catch (error) {
      logger.warn('Failed to get performance metrics, using defaults:', error);
      return this.getDefaultPerformanceMetrics();
    }
  }

  /**
   * Get database storage information
   */
  async getStorageInfo(): Promise<DatabaseStorageInfo> {
    try {
      // Get database size information
      const [sizeInfo] = await db.execute(sql`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as total_size,
          pg_database_size(current_database()) as total_size_bytes
      `);

      // Get largest tables
      const largestTables = await db.execute(sql`
        SELECT 
          schemaname || '.' || tablename as table_name,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
          n_tup_ins + n_tup_upd + n_tup_del as total_rows
        FROM pg_tables t
        LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 5
      `);

      const size = sizeInfo as any;
      const totalSizeBytes = parseInt(size.total_size_bytes) || 0;

      // Estimate free space (simplified)
      const utilizationPercent = Math.min(Math.round((totalSizeBytes / (1024 * 1024 * 1024)) * 10), 100); // Rough estimate

      return {
        totalSize: size.total_size || '0 bytes',
        usedSize: size.total_size || '0 bytes',
        freeSize: 'Unknown', // Would need filesystem info
        utilizationPercent,
        largestTables: (largestTables as any[]).map(table => ({
          name: table.table_name,
          size: table.size,
          rows: parseInt(table.total_rows) || 0
        }))
      };
    } catch (error) {
      logger.warn('Failed to get storage info, using defaults:', error);
      return this.getDefaultStorageInfo();
    }
  }

  /**
   * Record query execution for performance tracking
   */
  recordQuery(query: string, duration: number) {
    this.queryHistory.push({
      timestamp: Date.now(),
      duration,
      query: query.substring(0, 100) // Truncate for storage
    });

    // Keep history size manageable
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory = this.queryHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get slow queries from history
   */
  getSlowQueries(thresholdMs: number = 1000, limit: number = 10) {
    return this.queryHistory
      .filter(q => q.duration > thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(q => ({
        query: q.query,
        duration: q.duration,
        timestamp: new Date(q.timestamp).toISOString()
      }));
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(minutes: number = 60) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recentQueries = this.queryHistory.filter(q => q.timestamp > cutoff);
    
    if (recentQueries.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        queriesPerMinute: 0
      };
    }

    const durations = recentQueries.map(q => q.duration);
    const slowQueries = recentQueries.filter(q => q.duration > 1000).length;

    return {
      totalQueries: recentQueries.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      slowQueries,
      queriesPerMinute: recentQueries.length / minutes
    };
  }

  private determineHealthStatus(
    connections: DatabaseConnectionInfo,
    performance: DatabasePerformanceMetrics,
    storage: DatabaseStorageInfo
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Check for unhealthy conditions
    if (connections.connectionUtilization > 90) return 'unhealthy';
    if (performance.averageQueryTime > 5000) return 'unhealthy';
    if (storage.utilizationPercent > 95) return 'unhealthy';

    // Check for degraded conditions
    if (connections.connectionUtilization > 75) return 'degraded';
    if (performance.averageQueryTime > 1000) return 'degraded';
    if (performance.slowQueries > 10) return 'degraded';
    if (storage.utilizationPercent > 85) return 'degraded';

    return 'healthy';
  }

  private getDefaultConnectionInfo(): DatabaseConnectionInfo {
    return {
      total: 0,
      active: 0,
      idle: 0,
      waiting: 0,
      maxConnections: 100,
      connectionUtilization: 0
    };
  }

  private getDefaultPerformanceMetrics(): DatabasePerformanceMetrics {
    return {
      averageQueryTime: 0,
      slowQueries: 0,
      queriesPerSecond: 0,
      cacheHitRatio: 0,
      indexUsage: 0,
      lockWaits: 0,
      deadlocks: 0
    };
  }

  private getDefaultStorageInfo(): DatabaseStorageInfo {
    return {
      totalSize: '0 bytes',
      usedSize: '0 bytes',
      freeSize: 'Unknown',
      utilizationPercent: 0,
      largestTables: []
    };
  }
}
