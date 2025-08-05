import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle>;
let client: ReturnType<typeof postgres>;

function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!client) {
    // Create postgres client
    client = postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Create drizzle instance
    db = drizzle(client, { schema });
  }

  return { db, client };
}

// Export function to get database connection
export function getDb() {
  if (!db) {
    const { db: dbInstance } = initializeDatabase();
    return dbInstance;
  }
  return db;
}

// Export client for direct queries if needed
export function getClient() {
  if (!client) {
    const { client: clientInstance } = initializeDatabase();
    return clientInstance;
  }
  return client;
}

// For backward compatibility
export { getDb as db };