#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixMigrationNumbering() {
  console.log('🔧 Fixing migration numbering conflicts...\n');

  const migrationsDir = path.join(__dirname, '../migrations');
  const journalPath = path.join(migrationsDir, 'meta/_journal.json');

  // Read current journal
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));

  // Check for conflicts
  const migrations = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('Current migrations:');
  migrations.forEach(m => console.log(`  - ${m}`));

  // Update journal to include all migrations in correct order
  const migrationEntries = [
    { tag: '0000_large_carnage', idx: 0 },
    { tag: '0001_new_zaladane', idx: 1 },
    { tag: '0002_closed_shooting_star', idx: 2 },
    { tag: '0003_add_agent_configurations', idx: 3 },
    { tag: '0004_feature_flags', idx: 4 },
    { tag: '0005_last_activity_campaigns', idx: 5 },
    { tag: '0006_add_campaign_status', idx: 6 },
    { tag: '0007_add_job_metadata', idx: 7 },
    { tag: '0008_update_campaign_stats', idx: 8 },
    { tag: '0009_fix_schema_mismatches', idx: 9 },
    { tag: '0010_fix_deployment_schema', idx: 10 },
  ];

  // Update journal entries
  journal.entries = migrationEntries.map((entry, idx) => ({
    idx: entry.idx,
    version: '7',
    when: Date.now() + idx * 1000,
    tag: entry.tag,
    breakpoints: true,
  }));

  // Write updated journal
  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));
  console.log('\n✅ Updated migration journal');

  // Create a comprehensive migration status file
  const statusReport = `# Migration Status Report
Generated: ${new Date().toISOString()}

## Current Migrations:
${migrations.map(m => `- ${m}`).join('\n')}

## Journal Entries:
${journal.entries.map(e => `- ${e.idx}: ${e.tag}`).join('\n')}

## Next Steps:
1. Verify all migrations are in correct order
2. Run 'npm run db:migrate' to apply migrations
3. Use 'npm run db:verify' to check schema integrity
`;

  fs.writeFileSync(
    path.join(migrationsDir, 'MIGRATION_STATUS.md'),
    statusReport
  );
  console.log('✅ Created migration status report');
}

function createVerificationScript() {
  console.log('\n📝 Creating schema verification script...');

  const verifyScript = `#!/usr/bin/env tsx
import { db } from '../server/db/index.js';
import { sql } from 'drizzle-orm';
import * as schema from '../server/db/schema.js';

async function verifySchema() {
  console.log('🔍 Verifying database schema integrity...\\n');
  
  let hasErrors = false;
  
  try {
    // Get all tables from database
    const dbTables = await db.execute(sql\`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    \`);
    
    const existingTables = new Set(dbTables.rows.map(r => r.table_name as string));
    
    // Get all tables from schema
    const schemaTables = Object.keys(schema).filter(key => 
      typeof schema[key] === 'object' && 
      schema[key]?.constructor?.name === 'PgTable'
    );
    
    console.log('📊 Table Verification:');
    for (const table of schemaTables) {
      const tableName = schema[table]._.name;
      if (existingTables.has(tableName)) {
        console.log(\`  ✅ \${tableName}\`);
      } else {
        console.log(\`  ❌ \${tableName} (missing)\`);
        hasErrors = true;
      }
    }
    
    // Check for extra tables not in schema
    console.log('\\n🔍 Extra Tables Check:');
    for (const tableName of existingTables) {
      if (!schemaTables.some(t => schema[t]._.name === tableName) && 
          !['drizzle_migrations', 'drizzle_migrations_old'].includes(tableName)) {
        console.log(\`  ⚠️  \${tableName} (not in schema)\`);
      }
    }
    
    // Check specific columns that were problematic
    console.log('\\n📊 Column Verification:');
    const columnChecks = [
      { table: 'campaigns', column: 'description' },
      { table: 'agent_configurations', column: 'context_note' }
    ];
    
    for (const check of columnChecks) {
      const columns = await db.execute(sql\`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = \${check.table}
        AND column_name = \${check.column}
      \`);
      
      if (columns.rows.length > 0) {
        console.log(\`  ✅ \${check.table}.\${check.column}\`);
      } else {
        console.log(\`  ❌ \${check.table}.\${check.column} (missing)\`);
        hasErrors = true;
      }
    }
    
    if (!hasErrors) {
      console.log('\\n✅ Database schema is in sync!');
    } else {
      console.log('\\n❌ Database schema has issues. Run migrations to fix.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\\n❌ Error verifying schema:', error);
    process.exit(1);
  }
}

verifySchema();
`;

  const scriptPath = path.join(__dirname, 'verify-schema.ts');
  fs.writeFileSync(scriptPath, verifyScript);
  console.log(`✅ Created schema verification script at: ${scriptPath}`);

  // Make it executable
  fs.chmodSync(scriptPath, '755');

  // Update package.json with db:verify script
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  if (!packageJson.scripts['db:verify']) {
    packageJson.scripts['db:verify'] = 'tsx scripts/verify-schema.ts';
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n'
    );
    console.log('✅ Added "db:verify" npm script');
  }
}

// Run the fixes
console.log('🚀 Fixing migration setup...\n');
fixMigrationNumbering();
createVerificationScript();

console.log('\n✅ Migration fixes complete!');
console.log('\n📋 Next steps:');
console.log('   1. Review the migration changes');
console.log('   2. Connect to a real database (update DATABASE_URL in .env)');
console.log('   3. Run "npm run db:migrate" to apply migrations');
console.log('   4. Run "npm run db:verify" to verify schema integrity');
