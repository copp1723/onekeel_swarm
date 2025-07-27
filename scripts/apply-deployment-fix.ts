#!/usr/bin/env tsx
import { sql } from 'drizzle-orm';
import { db } from '../server/db';
import * as fs from 'fs';
import * as path from 'path';

async function applyDeploymentFix() {
  console.log('🔧 Applying deployment schema fixes...');
  
  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, '../migrations/0010_fix_deployment_schema.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    console.log('📝 Running migration: 0010_fix_deployment_schema.sql');
    await db.execute(sql.raw(migrationSql));
    
    // Update the applied migrations tracking
    const appliedPath = path.join(__dirname, '../migrations/applied.txt');
    const currentApplied = fs.readFileSync(appliedPath, 'utf-8').trim();
    if (!currentApplied.includes('0010_fix_deployment_schema')) {
      fs.appendFileSync(appliedPath, '\n0010_fix_deployment_schema');
    }
    
    console.log('✅ Migration applied successfully!');
    
    // Verify the changes
    console.log('\n🔍 Verifying schema changes...');
    
    // Check feature_flags table
    const featureFlagsCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'feature_flags'
    `);
    console.log(`✓ feature_flags table exists: ${featureFlagsCheck.rows[0].count > 0}`);
    
    // Check campaigns.description column
    const campaignDescCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_name = 'campaigns' AND column_name = 'description'
    `);
    console.log(`✓ campaigns.description column exists: ${campaignDescCheck.rows[0].count > 0}`);
    
    // Check agents.context_note column
    const agentContextCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'context_note'
    `);
    console.log(`✓ agents.context_note column exists: ${agentContextCheck.rows[0].count > 0}`);
    
    // Check feature flags data
    const flagsCount = await db.execute(sql`SELECT COUNT(*) as count FROM feature_flags`);
    console.log(`✓ Feature flags inserted: ${flagsCount.rows[0].count} flags`);
    
    console.log('\n🎉 All schema fixes applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyDeploymentFix();