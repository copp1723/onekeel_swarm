import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { logger } from '../utils/logger';

// Create postgres connection with connection pooling
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/ccl3_swarm';

// Configure SSL for production databases
const isProduction = process.env.NODE_ENV === 'production';
const isExternalDatabase = connectionString.includes('render.com') || connectionString.includes('amazonaws.com') || connectionString.includes('supabase.com');

// Connection pool configuration
const poolConfig = {
  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections in pool
  min: parseInt(process.env.DB_POOL_MIN || '2'),  // Minimum connections to maintain
  
  // Connection timeout settings
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '30'), // 30 seconds
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300'), // 5 minutes
  max_lifetime: parseInt(process.env.DB_MAX_LIFETIME || '3600'), // 1 hour
  
  // SSL configuration
  ssl: (isProduction || isExternalDatabase) ? 'require' : false,
  
  // Transform and connection settings
  transform: {
    undefined: null,
  },
  connection: {
    application_name: 'ccl3_swarm',
  },
  
  // Error handling and logging
  onnotice: () => {}, // Suppress notices
  onparameter: (key: string, value: any) => {
    logger.debug('Database parameter changed', { key, value });
  },
  
  // Performance settings
  prepare: false, // Disable prepared statements for better connection pooling
  fetch_types: false, // Disable automatic type fetching for performance
  
  // Connection lifecycle hooks
  onclose: (connectionId: number) => {
    logger.debug('Database connection closed', { connectionId });
  },
  
  // Debug settings (only in development)
  ...(process.env.NODE_ENV === 'development' && {
    debug: (connection: number, query: string, parameters: any[]) => {
      logger.debug('Database query', { connection, query, parameters });
    }
  })
};

const sql = postgres(connectionString, poolConfig);

// Connection pool monitoring
let connectionStatsInterval: NodeJS.Timeout;

// Monitor connection pool health
if (process.env.ENABLE_DB_MONITORING !== 'false') {
  connectionStatsInterval = setInterval(() => {
    const stats = {
      totalConnections: sql.options.max,
      activeConnections: sql.options.connection.count || 0,
      idleConnections: (sql.options.max || 20) - (sql.options.connection.count || 0)
    };
    
    logger.debug('Database connection pool stats', stats);
    
    // Warn if pool is getting full
    if (stats.activeConnections > (stats.totalConnections * 0.8)) {
      logger.warn('Database connection pool utilization high', {
        utilization: `${Math.round((stats.activeConnections / stats.totalConnections) * 100)}%`,
        ...stats
      });
    }
  }, 60000); // Check every minute
}

// Create drizzle instance with schema
export const db = drizzle(sql, { schema });

// Export for graceful shutdown
export const closeConnection = async () => {
  try {
    // Clear monitoring interval
    if (connectionStatsInterval) {
      clearInterval(connectionStatsInterval);
    }
    
    // Log final connection stats
    logger.info('Closing database connection pool', {
      totalConnections: sql.options.max,
      activeConnections: sql.options.connection.count || 0
    });
    
    // Close all connections in the pool
    await sql.end({ timeout: 5 });
    
    logger.info('Database connection pool closed successfully');
  } catch (error) {
    logger.error('Error closing database connection pool', error as Error);
    throw error;
  }
};

// Connection health check function
export const checkConnectionHealth = async (): Promise<boolean> => {
  try {
    await sql`SELECT 1 as health_check`;
    return true;
  } catch (error) {
    logger.error('Database health check failed', error as Error);
    return false;
  }
};

// Get connection pool statistics
export const getPoolStats = () => {
  return {
    maxConnections: sql.options.max,
    activeConnections: sql.options.connection.count || 0,
    idleConnections: (sql.options.max || 20) - (sql.options.connection.count || 0),
    totalQueries: sql.options.connection.queries || 0
  };
};

// Helper type for database transactions
export type DbTransaction = typeof db;