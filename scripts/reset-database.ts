import { config } from 'dotenv';
import { getClient } from '../server/db/client.js';

config();

async function resetDatabase() {
  console.log('🔥 NUCLEAR DATABASE RESET - This will delete ALL data!');
  
  try {
    const client = getClient();
    
    console.log('📡 Testing database connection...');
    await client`SELECT 1`;
    console.log('✅ Database connection successful');

    console.log('🗑️  Dropping all tables...');
    
    // Drop all tables in the correct order (respecting foreign keys)
    const dropStatements = [
      'DROP TABLE IF EXISTS sessions CASCADE',
      'DROP TABLE IF EXISTS leads CASCADE', 
      'DROP TABLE IF EXISTS campaigns CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      'DROP TABLE IF EXISTS agent_templates CASCADE',
      'DROP TABLE IF EXISTS lead_campaign_enrollments CASCADE',
      'DROP TABLE IF EXISTS conversations CASCADE',
      'DROP TABLE IF EXISTS communications CASCADE',
      'DROP TABLE IF EXISTS agent_decisions CASCADE',
      'DROP TABLE IF EXISTS clients CASCADE',
      'DROP TABLE IF EXISTS audit_logs CASCADE',
      'DROP TABLE IF EXISTS analytics_events CASCADE',
      'DROP TABLE IF EXISTS agent_configurations CASCADE',
      'DROP TABLE IF EXISTS drizzle_migrations CASCADE',
      'DROP TABLE IF EXISTS templates CASCADE',
      'DROP TABLE IF EXISTS jobs CASCADE',
      'DROP TABLE IF EXISTS feature_flags CASCADE',
      'DROP TABLE IF EXISTS feature_flag_evaluations CASCADE',
      'DROP TABLE IF EXISTS api_keys CASCADE',
      'DROP TABLE IF EXISTS feature_flag_user_overrides CASCADE',
      'DROP TYPE IF EXISTS agent_type CASCADE',
      'DROP TYPE IF EXISTS campaign_type CASCADE',
      'DROP TYPE IF EXISTS channel CASCADE',
      'DROP TYPE IF EXISTS lead_status CASCADE',
      'DROP TYPE IF EXISTS user_role CASCADE'
    ];

    for (const statement of dropStatements) {
      try {
        await client.unsafe(statement);
        console.log(`✅ ${statement}`);
      } catch (error) {
        console.log(`⚠️  ${statement} - ${error.message}`);
      }
    }

    console.log('🏗️  Creating fresh tables from schema...');
    
    // Create the tables as defined in our schema
    await client`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username text NOT NULL UNIQUE,
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        role text NOT NULL DEFAULT 'user',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `;
    console.log('✅ Created users table');

    await client`
      CREATE TABLE sessions (
        id text PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamp NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `;
    console.log('✅ Created sessions table');

    await client`
      CREATE TABLE campaigns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text,
        status text NOT NULL DEFAULT 'draft',
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `;
    console.log('✅ Created campaigns table');

    await client`
      CREATE TABLE leads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL,
        first_name text,
        last_name text,
        campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
        status text NOT NULL DEFAULT 'new',
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `;
    console.log('✅ Created leads table');

    console.log('🎉 Database reset completed successfully!');
    console.log('📊 Fresh database with clean schema is ready');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
