import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create postgres connection
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/ccl3_swarm';

// Configure SSL for production databases
const isProduction = process.env.NODE_ENV === 'production';
const isExternalDatabase = connectionString.includes('render.com') || connectionString.includes('amazonaws.com') || connectionString.includes('supabase.com');

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