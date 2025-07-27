import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { logger } from '../utils/logger';

// Validate database URL on startup
function validateDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    const errorMsg = 'DATABASE_URL environment variable is required. Please set it in your .env file.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  // Ensure no hardcoded localhost URLs in production
  if (process.env.NODE_ENV === 'production' && databaseUrl.includes('localhost')) {
    const errorMsg = 'DATABASE_URL cannot contain localhost in production environment';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  // Basic URL validation
  try {
    const url = new URL(databaseUrl);
    if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
      throw new Error('DATABASE_URL must use postgresql:// or postgres:// protocol');
    }
  } catch (error) {
    logger.error('Invalid DATABASE_URL format', { error: (error as Error).message });
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }
  
  return databaseUrl;
}

// Create postgres connection with validation
const connectionString = validateDatabaseUrl();

// Configure SSL for production databases
const isProduction = process.env.NODE_ENV === 'production';
const isExternalDatabase = connectionString.includes('render.com') || 
                          connectionString.includes('amazonaws.com') || 
                          connectionString.includes('supabase.com') ||
                          connectionString.includes('neon.tech');

const sql = postgres(connectionString, {
  ssl: (isProduction || isExternalDatabase) ? 'require' : false,
  transform: {
    undefined: null,
  },
  connection: {
    application_name: 'ccl3_swarm',
  },
  onnotice: () => {}, // Suppress notices
});

// Create drizzle instance with schema
export const db = drizzle(sql, { schema });

// Export for graceful shutdown
export const closeConnection = async () => {
  await sql.end();
};

// Helper type for database transactions
export type DbTransaction = typeof db;