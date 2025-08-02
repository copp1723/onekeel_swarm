import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create postgres connection
const connectionString =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/ccl3_swarm';

// Configure SSL for production databases
const isProduction = process.env.NODE_ENV === 'production';
const isExternalDatabase =
  connectionString.includes('render.com') ||
  connectionString.includes('amazonaws.com') ||
  connectionString.includes('supabase.com');

// Determine SSL configuration
let sslConfig: boolean | 'require' | 'prefer' = false;
if (isExternalDatabase) {
  sslConfig = 'require';
} else if (isProduction) {
  // For production but not external databases, try to prefer SSL but don't require it
  sslConfig = 'prefer';
}

const sql = postgres(connectionString, {
  ssl: sslConfig,
  transform: {
    undefined: null,
  },
  connection: {
    application_name: 'ccl3_swarm',
  },
  onnotice: () => {}, // Suppress notices
  // Add connection timeout and retry settings
  connect_timeout: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30, // 30 minutes
});

// Create drizzle instance with schema
export const db = drizzle(sql, { schema });

// Export for graceful shutdown
export const closeConnection = async () => {
  await sql.end();
};

// Helper type for database transactions
export type DbTransaction = typeof db;
