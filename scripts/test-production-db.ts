#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production database URL from Render
const PROD_DATABASE_URL =
  'postgresql://ccl_3_user:P8LUqfkbIB4noaUDthVtZETTWZR668nI@dpg-d1lvpq6r433s73e9vfu0-a.oregon-postgres.render.com/ccl_3';

async function testProductionDatabase() {
  console.log('🚀 Testing Production Database Connection...\n');

  try {
    // Create connection with SSL required for Render
    const sql = postgres(PROD_DATABASE_URL, {
      ssl: 'require',
      connection: {
        application_name: 'onekeel_swarm_test',
      },
    });

    // Test basic connection
    console.log('📡 Connecting to Render PostgreSQL...');
    const versionResult = await sql`SELECT version()`;
    console.log('✅ Connected successfully!');
    console.log(`   PostgreSQL ${versionResult[0].version.split(' ')[1]}`);

    // Get database info
    const dbInfo = await sql`
      SELECT 
        current_database() as database,
        current_user as user,
        inet_server_addr() as server,
        pg_database_size(current_database()) as size
    `;
    console.log(`\n📊 Database Info:`);
    console.log(`   Database: ${dbInfo[0].database}`);
    console.log(`   User: ${dbInfo[0].user}`);
    console.log(
      `   Size: ${(Number(dbInfo[0].size) / 1024 / 1024).toFixed(2)} MB`
    );

    // Check existing tables
    console.log('\n📋 Checking Tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`   Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    // Check for missing tables from schema
    const expectedTables = [
      'users',
      'campaigns',
      'leads',
      'agent_configurations',
      'feature_flags',
      'communications',
      'templates',
      'jobs',
      'whatsapp_messages',
      'feature_flag_evaluations',
      'api_keys',
    ];

    const existingTables = new Set(tables.map(t => t.table_name));
    const missingTables = expectedTables.filter(t => !existingTables.has(t));

    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing tables:');
      missingTables.forEach(t => console.log(`   - ${t}`));
    }

    // Check specific columns that were problematic
    console.log('\n🔍 Checking Problem Columns...');

    // Check campaigns.description
    const campaignsCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'campaigns'
      AND column_name = 'description'
    `;
    console.log(
      `   campaigns.description: ${campaignsCols.length > 0 ? '✅ exists' : '❌ missing'}`
    );

    // Check agent_configurations.context_note
    const agentCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'agent_configurations'
      AND column_name = 'context_note'
    `;
    console.log(
      `   agent_configurations.context_note: ${agentCols.length > 0 ? '✅ exists' : '❌ missing'}`
    );

    // Check for feature_flags table
    const featureFlagsExists = existingTables.has('feature_flags');
    console.log(
      `   feature_flags table: ${featureFlagsExists ? '✅ exists' : '❌ missing'}`
    );

    // Check migrations
    console.log('\n📜 Migration Status:');
    const hasMigrationsTable = existingTables.has('drizzle_migrations');

    if (hasMigrationsTable) {
      const migrations = await sql`
        SELECT id, hash, created_at 
        FROM drizzle_migrations 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      console.log(`   Found ${migrations.length} migrations`);
      if (migrations.length > 0) {
        console.log('   Latest migrations:');
        migrations.slice(0, 5).forEach(m => {
          console.log(
            `   - ${m.id} (${new Date(m.created_at).toLocaleString()})`
          );
        });
      }
    } else {
      console.log('   ❌ No drizzle_migrations table found');
    }

    // Check for data in key tables
    console.log('\n📊 Data Summary:');
    const dataCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM campaigns) as campaigns_count,
        (SELECT COUNT(*) FROM leads) as leads_count,
        (SELECT COUNT(*) FROM agent_configurations) as agents_count
    `;

    console.log(`   Users: ${dataCounts[0].users_count}`);
    console.log(`   Campaigns: ${dataCounts[0].campaigns_count}`);
    console.log(`   Leads: ${dataCounts[0].leads_count}`);
    console.log(`   Agent Configurations: ${dataCounts[0].agents_count}`);

    // Generate fix script if needed
    if (
      missingTables.length > 0 ||
      !campaignsCols.length ||
      !agentCols.length ||
      !featureFlagsExists
    ) {
      console.log('\n⚠️  Schema issues detected!');
      console.log('   Creating fix script...');

      await createProductionFixScript({
        missingTables,
        missingCampaignDescription: campaignsCols.length === 0,
        missingAgentContextNote: agentCols.length === 0,
        missingFeatureFlags: !featureFlagsExists,
      });
    } else {
      console.log('\n✅ Database schema looks good!');
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n📝 Troubleshooting:');
    console.log('   1. Check if the database is active on Render');
    console.log('   2. Verify the connection string is correct');
    console.log(
      '   3. Ensure your IP is allowed (Render allows all IPs by default)'
    );
  }
}

async function createProductionFixScript(issues: any) {
  const fixCommands: string[] = [];

  if (issues.missingFeatureFlags) {
    fixCommands.push(`
-- Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT FALSE NOT NULL,
  rollout_percentage INTEGER DEFAULT 0 NOT NULL,
  user_roles JSONB DEFAULT '["admin"]'::jsonb,
  environments JSONB DEFAULT '["development"]'::jsonb,
  conditions JSONB DEFAULT '{}'::jsonb,
  category VARCHAR(50) DEFAULT 'experimental' NOT NULL,
  complexity VARCHAR(50) DEFAULT 'basic' NOT NULL,
  risk_level VARCHAR(50) DEFAULT 'low' NOT NULL,
  created_by UUID,
  last_modified_by UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert default feature flags
INSERT INTO feature_flags (key, name, description, enabled) VALUES
('ui.new-navigation', 'New Navigation', 'New navigation UI', false),
('ui.contacts-terminology', 'Contacts Terminology', 'Use Contacts instead of Leads', false),
('ui.enhanced-dashboard', 'Enhanced Dashboard', 'Enhanced dashboard features', false)
ON CONFLICT (key) DO NOTHING;`);
  }

  if (issues.missingCampaignDescription) {
    fixCommands.push(`
-- Add description column to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS description TEXT;`);
  }

  if (issues.missingAgentContextNote) {
    fixCommands.push(`
-- Add context_note column to agent_configurations
ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS context_note TEXT;`);
  }

  const fixScript = `-- Production Database Fix Script
-- Generated: ${new Date().toISOString()}
-- Run this in the Render dashboard SQL console

${fixCommands.join('\n')}

-- Verify fixes
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags') as has_feature_flags,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'description') as has_campaign_description,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_configurations' AND column_name = 'context_note') as has_agent_context_note;
`;

  const scriptPath = path.join(__dirname, 'production-db-fix.sql');
  fs.writeFileSync(scriptPath, fixScript);

  console.log(`\n📄 Fix script created: ${scriptPath}`);
  console.log('   Copy the contents and run in Render SQL console');
}

// Run the test
testProductionDatabase();
