#!/usr/bin/env tsx
import { sql } from 'drizzle-orm';
import { db } from '../server/db';
import * as fs from 'fs';
import * as path from 'path';
import { tableExists, columnExists } from '../shared/dbSchemaVerifier';

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
    const featureFlagsExists = await tableExists(db, 'feature_flags');
    console.log(`✓ feature_flags table exists: ${featureFlagsExists}`);

    // Check campaigns.description column
    const campaignDescExists = await columnExists(db, 'campaigns', 'description');
    console.log(`✓ campaigns.description column exists: ${campaignDescExists}`);

    // Check agents.context_note column
    const agentContextExists = await columnExists(db, 'agents', 'context_note');
    console.log(`✓ agents.context_note column exists: ${agentContextExists}`);
    
    // Check feature flags data
    const flagsCount = await db.execute(sql`SELECT COUNT(*) as count FROM feature_flags`);
    let flagCountValue = 0;
    if (Array.isArray(flagsCount) && flagsCount.length > 0 && 'count' in flagsCount[0]) {
      flagCountValue = Number(flagsCount[0].count);
    }
    console.log(`✓ Feature flags inserted: ${flagCountValue} flags`);
    
    console.log('\n🎉 All schema fixes applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyDeploymentFix();