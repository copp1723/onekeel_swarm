#!/usr/bin/env tsx
import { db } from '../server/db/index.js';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function implementDatabaseStrategy() {
  console.log('🚀 Implementing Database Strategy...\n');

  try {
    // Step 1: Fix migration numbering conflicts
    console.log('📁 Step 1: Fixing migration numbering conflicts...');
    await fixMigrationNumbering();

    // Step 2: Verify current database schema
    console.log('\n🔍 Step 2: Verifying database schema...');
    const schemaIssues = await verifyDatabaseSchema();

    // Step 3: Apply missing schema elements
    if (schemaIssues.length > 0) {
      console.log('\n🔧 Step 3: Applying schema fixes...');
      await applySchemaFixes(schemaIssues);
    }

    // Step 4: Create verification script
    console.log('\n📝 Step 4: Creating schema verification script...');
    await createVerificationScript();

    console.log('\n✅ Database strategy implementation complete!');
    console.log('📋 Next steps:');
    console.log('   1. Run "npm run db:verify" to verify schema integrity');
    console.log('   2. Commit the migration fixes');
    console.log('   3. Deploy to production with confidence');
  } catch (error) {
    console.error('❌ Error implementing database strategy:', error);
    process.exit(1);
  }
}

async function fixMigrationNumbering() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const journalPath = path.join(migrationsDir, 'meta/_journal.json');

  // Read current journal
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));

  // Check for conflicts
  const migrations = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const conflicts = migrations.filter(m => m.startsWith('0002_'));

  if (conflicts.length > 1) {
    console.log(`  Found ${conflicts.length} migrations with number 0002:`);
    conflicts.forEach(c => console.log(`    - ${c}`));

    // The journal shows 0002_closed_shooting_star is already applied
    // We need to renumber the other 0002 migrations
    const toRename = [
      {
        old: '0002_add_agent_configurations.sql',
        new: '0003_add_agent_configurations.sql',
      },
      { old: '0002_feature_flags.sql', new: '0004_feature_flags.sql' },
    ];

    for (const rename of toRename) {
      const oldPath = path.join(migrationsDir, rename.old);
      const newPath = path.join(migrationsDir, rename.new);

      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`  ✅ Renamed: ${rename.old} → ${rename.new}`);
      }
    }
  } else {
    console.log('  ✅ No migration numbering conflicts found');
  }
}

async function verifyDatabaseSchema() {
  const issues: string[] = [];

  // Check for required tables
  const tables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);

  const existingTables = new Set(tables.rows.map(r => r.table_name as string));

  // Required tables based on schema
  const requiredTables = [
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

  for (const table of requiredTables) {
    if (!existingTables.has(table)) {
      issues.push(`Missing table: ${table}`);
      console.log(`  ❌ Missing table: ${table}`);
    } else {
      console.log(`  ✅ Table exists: ${table}`);
    }
  }

  // Check specific columns that were missing in production
  const columnChecks = [
    { table: 'campaigns', column: 'description' },
    { table: 'agent_configurations', column: 'context_note' },
  ];

  for (const check of columnChecks) {
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ${check.table}
      AND column_name = ${check.column}
    `);

    if (columns.rows.length === 0) {
      issues.push(`Missing column: ${check.table}.${check.column}`);
      console.log(`  ❌ Missing column: ${check.table}.${check.column}`);
    } else {
      console.log(`  ✅ Column exists: ${check.table}.${check.column}`);
    }
  }

  return issues;
}

async function applySchemaFixes(issues: string[]) {
  for (const issue of issues) {
    if (issue.includes('Missing table: feature_flags')) {
      console.log('  Creating feature_flags table...');
      await db.execute(sql`
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
        )
      `);
      console.log('  ✅ Created feature_flags table');
    }

    if (issue.includes('campaigns.description')) {
      console.log('  Adding description column to campaigns...');
      await db.execute(sql`
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS description TEXT
      `);
      console.log('  ✅ Added campaigns.description');
    }

    if (issue.includes('agent_configurations.context_note')) {
      console.log('  Adding context_note column to agent_configurations...');
      await db.execute(sql`
        ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS context_note TEXT
      `);
      console.log('  ✅ Added agent_configurations.context_note');
    }
  }
}

async function createVerificationScript() {
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
  console.log(`  ✅ Created schema verification script at: ${scriptPath}`);

  // Make it executable
  fs.chmodSync(scriptPath, '755');

  // Add npm script
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  if (!packageJson.scripts['db:verify']) {
    packageJson.scripts['db:verify'] = 'tsx scripts/verify-schema.ts';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('  ✅ Added "db:verify" npm script');
  }
}

// Run the implementation
implementDatabaseStrategy();
