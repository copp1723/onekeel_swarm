import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

let dbInstance: ReturnType<typeof drizzle>;
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
    dbInstance = drizzle(client, { schema });
  }

  return { db: dbInstance, client };
}

// Export function to get database connection
export function getDb() {
  if (!dbInstance) {
    const { db: db } = initializeDatabase();
    return db;
  }
  return dbInstance;
}

// Export client for direct queries if needed
export function getClient() {
  if (!client) {
    const { client: clientInstance } = initializeDatabase();
    return clientInstance;
  }
  return client;
}

// Export db instance with lazy initialization
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    if (!dbInstance) {
      const { db } = initializeDatabase();
      Object.assign(target, db);
      return db[prop as keyof typeof db];
    }
    return dbInstance[prop as keyof typeof dbInstance];
  }
});