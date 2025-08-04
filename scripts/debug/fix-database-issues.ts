#!/usr/bin/env node

// Fix critical database issues preventing campaign launches
import { db } from './server/db/client.js';
import { sql } from 'drizzle-orm';

async function fixDatabaseIssues() {
  console.log('🔧 Fixing critical database issues...\n');

  try {
    // 1. Fix sessions table - add missing token column if it doesn't exist
    console.log('1. Checking sessions table...');
    await db.execute(sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'token') THEN
              ALTER TABLE sessions ADD COLUMN token VARCHAR(255) UNIQUE;
              UPDATE sessions SET token = gen_random_uuid()::text WHERE token IS NULL;
          END IF;
      END $$;
    `);
    console.log('✅ Sessions table fixed');

    // 2. Fix leads table - rename last_contacted to last_contacted_at
    console.log('2. Checking leads table...');
    await db.execute(sql`
      DO $$ 
      BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_contacted') THEN
              ALTER TABLE leads RENAME COLUMN last_contacted TO last_contacted_at;
          END IF;
      END $$;
    `);
    console.log('✅ Leads table fixed');

    // 3. Fix campaigns table - ensure target_criteria is properly formatted as JSONB
    console.log('3. Fixing campaigns target_criteria...');
    await db.execute(sql`
      UPDATE campaigns 
      SET target_criteria = '{}'::jsonb 
      WHERE target_criteria IS NULL OR target_criteria::text = 'null';
    `);

    // Fix malformed array literals in campaigns
    await db.execute(sql`
      UPDATE campaigns 
      SET target_criteria = '{}'::jsonb 
      WHERE target_criteria::text ~ '^"[^"]*"$';
    `);
    console.log('✅ Campaigns target_criteria fixed');

    // 4. Add missing audit_logs metadata column if needed
    console.log('4. Checking audit_logs table...');
    await db.execute(sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'metadata') THEN
              ALTER TABLE audit_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
          END IF;
      END $$;
    `);

    // Update audit_logs to use metadata instead of changes for consistency
    await db.execute(sql`
      DO $$ 
      BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'changes') THEN
              UPDATE audit_logs SET metadata = changes WHERE metadata IS NULL AND changes IS NOT NULL;
          END IF;
      END $$;
    `);
    console.log('✅ Audit logs table fixed');

    // 5. Fix any missing columns in leads table
    console.log('5. Ensuring all required columns exist...');
    await db.execute(sql`
      DO $$ 
      BEGIN
          -- Add custom_data column if missing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'custom_data') THEN
              ALTER TABLE leads ADD COLUMN custom_data JSONB DEFAULT '{}'::jsonb;
          END IF;
          
          -- Add campaign_id column if missing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'campaign_id') THEN
              ALTER TABLE leads ADD COLUMN campaign_id UUID REFERENCES campaigns(id);
          END IF;
      END $$;
    `);
    console.log('✅ All required columns ensured');

    console.log('\n🎉 Database issues fixed successfully!');
    console.log('Campaign launches should now work properly.');
  } catch (error) {
    console.error('❌ Error fixing database issues:', error);
    process.exit(1);
  }
}

// Run the fixes
fixDatabaseIssues().catch(console.error);
