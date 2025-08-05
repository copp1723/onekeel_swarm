import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDb } from './client.js';
import { config } from 'dotenv';

config();

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    const db = getDb();
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('✅ Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
