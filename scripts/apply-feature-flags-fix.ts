#!/usr/bin/env tsx
/**
 * Apply Feature Flags ID Column Fix
 * This script safely applies the fix for the missing id column in feature_flags table
 */

import { db } from '../server/db/client';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { tableExists, columnExists } from '../shared/dbSchemaVerifier';

async function applyFeatureFlagsFix() {
  console.log('🔧 Starting Feature Flags ID Column Fix...\n');

  try {
    // Step 1: Check current database state
    console.log('📊 Checking current database state...');

    const has_table = await tableExists(db, 'feature_flags');
    const has_id_column = await columnExists(db, 'feature_flags', 'id');
    console.log(`- Feature flags table exists: ${has_table}`);
    console.log(`- ID column exists: ${has_id_column}`);

    if (has_table && has_id_column) {
      console.log('\n✅ Database structure is already correct!');

      // Show current flags
      const flags = await db.execute(sql`
        SELECT key, name, enabled, rollout_percentage 
        FROM feature_flags 
        WHERE key IN ('ui.contacts-terminology', 'ui.new-navigation', 'ui.enhanced-dashboard')
        ORDER BY key
      `);
      console.log('\n📋 Current feature flags:');
      (Array.isArray(flags) ? flags : []).forEach((flag: any) => {
        console.log(
          `  - ${flag.key}: ${flag.enabled ? 'Enabled' : 'Disabled'} (${flag.rollout_percentage}%)`
        );
      });
      return;
    }

    // Step 2: Read and execute the fix SQL
    console.log('\n🚀 Applying database fix...');
    const fixSqlPath = path.join(__dirname, 'fix-feature-flags-id-column.sql');
    const fixSql = fs.readFileSync(fixSqlPath, 'utf-8');

    // Execute the fix
    await db.execute(sql.raw(fixSql));

    console.log('✅ Fix applied successfully!');

    // Step 3: Verify the fix
    console.log('\n🔍 Verifying fix...');

    const id_exists = await columnExists(db, 'feature_flags', 'id');
    const flagsCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM feature_flags`
    );
    let flag_count = 0;
    if (
      Array.isArray(flagsCount) &&
      flagsCount.length > 0 &&
      'count' in flagsCount[0]
    ) {
      flag_count = Number(flagsCount[0].count);
    }
    if (!id_exists) {
      throw new Error('ID column still missing after fix!');
    }
    console.log(`✅ ID column verified: exists`);
    console.log(`✅ Total feature flags: ${flag_count}`);

    // Show enabled flags
    const enabledFlags = await db.execute(sql`
      SELECT key, name, enabled, rollout_percentage, environments
      FROM feature_flags
      WHERE key IN ('ui.contacts-terminology', 'ui.new-navigation', 'ui.enhanced-dashboard')
      ORDER BY key
    `);
    console.log('\n📋 UI Feature Flags Status:');
    (Array.isArray(enabledFlags) ? enabledFlags : []).forEach((flag: any) => {
      console.log(`  - ${flag.key}:`);
      console.log(`    Enabled: ${flag.enabled}`);
      console.log(`    Rollout: ${flag.rollout_percentage}%`);
      console.log(`    Environments: ${JSON.stringify(flag.environments)}`);
    });

    // Test a query to ensure it works
    console.log('\n🧪 Testing feature flag query...');
    const testQuery = await db.execute(sql`
      SELECT id, key, name 
      FROM feature_flags 
      WHERE key = 'ui.contacts-terminology'
      LIMIT 1
    `);
    if (Array.isArray(testQuery) && testQuery.length > 0) {
      const testFlag = testQuery[0] as any;
      console.log(`✅ Query successful! Flag ID: ${testFlag.id}`);
    }

    console.log('\n🎉 Feature flags fix completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('1. Restart your application server');
    console.log('2. The feature flags should now work without errors');
    console.log('3. Monitor logs to ensure no more "id column" errors');
  } catch (error) {
    console.error('\n❌ Error applying fix:', error);
    console.error('\nPlease check the database logs for more details.');
    process.exit(1);
  } finally {
    await db.$client.end();
  }
}

// Run the fix
import { fileURLToPath } from 'url';
import { argv } from 'process';

if (
  import.meta.url === `file://${argv[1]}` ||
  fileURLToPath(import.meta.url) === argv[1]
) {
  applyFeatureFlagsFix().catch(console.error);
}

export { applyFeatureFlagsFix };
