import { db } from '../server/db/client';
import { sql } from 'drizzle-orm';

async function debugAPIErrors() {
  console.log('🔍 Debugging API Errors...\n');

  try {
    // Test database connection
    console.log('Testing database connection...');
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection successful\n');

    // Check if tables exist
    console.log('Checking tables...');
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Tables found:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    console.log('');

    // Check agent_configurations table structure
    console.log('Checking agent_configurations table...');
    const agentColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'agent_configurations'
      ORDER BY ordinal_position
    `);
    
    if (agentColumns.rows.length > 0) {
      console.log('agent_configurations columns:');
      agentColumns.rows.forEach(row => 
        console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`)
      );
    } else {
      console.log('❌ agent_configurations table not found!');
    }
    console.log('');

    // Check campaigns table structure
    console.log('Checking campaigns table...');
    const campaignColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'campaigns'
      ORDER BY ordinal_position
    `);
    
    if (campaignColumns.rows.length > 0) {
      console.log('campaigns columns:');
      campaignColumns.rows.forEach(row => 
        console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`)
      );
    } else {
      console.log('❌ campaigns table not found!');
    }
    console.log('');

    // Check feature_flags table
    console.log('Checking feature_flags table...');
    const flagColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'feature_flags'
      ORDER BY ordinal_position
    `);
    
    if (flagColumns.rows.length > 0) {
      console.log('feature_flags columns:');
      flagColumns.rows.forEach(row => 
        console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`)
      );
    } else {
      console.log('❌ feature_flags table not found!');
    }
    console.log('');

    // Check if feature flags exist
    console.log('Checking feature flags data...');
    const flags = await db.execute(sql`
      SELECT key, enabled, rollout_percentage 
      FROM feature_flags 
      WHERE key LIKE 'ui.%'
      LIMIT 5
    `);
    
    if (flags.rows.length > 0) {
      console.log('UI Feature flags found:');
      flags.rows.forEach(row => 
        console.log(`  - ${row.key}: enabled=${row.enabled}, rollout=${row.rollout_percentage}%`)
      );
    } else {
      console.log('❌ No UI feature flags found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

debugAPIErrors();