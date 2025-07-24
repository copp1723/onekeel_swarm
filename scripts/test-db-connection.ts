#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    console.log('\n📝 Please set DATABASE_URL in your .env file');
    console.log('   Example: DATABASE_URL=postgresql://user:password@localhost:5432/onekeel_swarm');
    return;
  }
  
  console.log(`📊 Current DATABASE_URL: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
  
  if (databaseUrl.startsWith('mock://')) {
    console.log('\n⚠️  Using mock database connection');
    console.log('   This is suitable for development without a real database');
    console.log('   For production, you need a real PostgreSQL database\n');
    
    console.log('📝 To set up a real database:');
    console.log('   1. Install PostgreSQL locally or use a cloud service');
    console.log('   2. Create a database named "onekeel_swarm"');
    console.log('   3. Update DATABASE_URL in .env file');
    console.log('   4. Run "npm run db:migrate" to apply migrations\n');
    
    await testMockConnection();
  } else if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    console.log('\n✅ PostgreSQL connection string detected');
    await testPostgreSQLConnection(databaseUrl);
  } else {
    console.log('\n❌ Unknown database connection type');
    console.log('   Expected: postgresql:// or postgres:// or mock://');
  }
}

async function testMockConnection() {
  console.log('🧪 Testing mock database functionality...\n');
  
  try {
    const { db } = await import('../server/db/index.js');
    const { sql } = await import('drizzle-orm');
    
    // Test basic query
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Mock database connection successful');
    console.log('   Result:', result);
    
    // Check if we can access schema
    const schema = await import('../server/db/schema.js');
    const tables = Object.keys(schema).filter(key => 
      typeof schema[key] === 'object' && 
      schema[key]?.constructor?.name === 'PgTable'
    );
    
    console.log(`\n📊 Schema defines ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`   - ${schema[table]._.name}`);
    });
    
  } catch (error) {
    console.error('❌ Mock database test failed:', error.message);
  }
}

async function testPostgreSQLConnection(databaseUrl: string) {
  console.log('🧪 Testing PostgreSQL connection...\n');
  
  try {
    const { default: postgres } = await import('postgres');
    const sql = postgres(databaseUrl);
    
    // Test connection
    const result = await sql`SELECT version()`;
    console.log('✅ PostgreSQL connection successful!');
    console.log(`   Version: ${result[0].version}`);
    
    // Check database name
    const dbName = await sql`SELECT current_database()`;
    console.log(`   Database: ${dbName[0].current_database}`);
    
    // Check if migrations table exists
    const migrationsTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'drizzle_migrations'
      )
    `;
    
    if (migrationsTable[0].exists) {
      console.log('   ✅ Migrations table exists');
      
      // Get applied migrations
      const migrations = await sql`
        SELECT id, created_at 
        FROM drizzle_migrations 
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      
      if (migrations.length > 0) {
        console.log(`\n📊 Last ${migrations.length} migrations:`);
        migrations.forEach(m => {
          console.log(`   - ${m.id} (${new Date(m.created_at).toLocaleString()})`);
        });
      } else {
        console.log('\n⚠️  No migrations have been applied yet');
        console.log('   Run "npm run db:migrate" to apply migrations');
      }
    } else {
      console.log('   ⚠️  Migrations table does not exist');
      console.log('   Run "npm run db:migrate" to initialize database');
    }
    
    // Check for required tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    if (tables.length > 0) {
      console.log(`\n📊 Existing tables (${tables.length}):`);
      tables.forEach(t => {
        console.log(`   - ${t.table_name}`);
      });
    } else {
      console.log('\n⚠️  No tables found in database');
    }
    
    await sql.end();
    
    console.log('\n✅ Database connection test complete!');
    
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    console.log('\n📝 Troubleshooting steps:');
    console.log('   1. Ensure PostgreSQL is running');
    console.log('   2. Check your connection string format');
    console.log('   3. Verify database exists and user has permissions');
    console.log('   4. Check firewall/network settings if using remote database');
  }
}

// Create a quick setup script
async function createQuickSetupScript() {
  const setupScript = `#!/bin/bash
# Quick PostgreSQL setup for OneKeel Swarm

echo "🚀 OneKeel Swarm Database Setup"
echo "================================"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed"
    echo "   Please install PostgreSQL first:"
    echo "   - Mac: brew install postgresql"
    echo "   - Ubuntu: sudo apt-get install postgresql"
    echo "   - Or use a cloud service like Render, Supabase, or AWS RDS"
    exit 1
fi

echo "✅ PostgreSQL is installed"

# Create database
echo ""
echo "Creating database 'onekeel_swarm'..."
createdb onekeel_swarm 2>/dev/null && echo "✅ Database created" || echo "⚠️  Database may already exist"

# Update .env file
if [ -f .env ]; then
    echo ""
    echo "📝 Current DATABASE_URL in .env:"
    grep DATABASE_URL .env || echo "   Not found"
    
    echo ""
    echo "Would you like to update DATABASE_URL? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        # Backup existing .env
        cp .env .env.backup
        
        # Get current user
        DB_USER=$(whoami)
        
        # Update DATABASE_URL
        if grep -q "DATABASE_URL" .env; then
            sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER@localhost:5432/onekeel_swarm|" .env
        else
            echo "DATABASE_URL=postgresql://$DB_USER@localhost:5432/onekeel_swarm" >> .env
        fi
        
        echo "✅ Updated DATABASE_URL in .env"
        echo "   Backup saved as .env.backup"
    fi
else
    echo "❌ No .env file found"
    echo "   Run: cp .env.example .env"
fi

echo ""
echo "📊 Next steps:"
echo "   1. Verify connection: npm run test:db"
echo "   2. Run migrations: npm run db:migrate"
echo "   3. Verify schema: npm run db:verify"
echo "   4. Start development: npm run dev"
`;

  const scriptPath = path.join(__dirname, 'setup-local-db.sh');
  fs.writeFileSync(scriptPath, setupScript);
  fs.chmodSync(scriptPath, '755');
  console.log(`\n📝 Created local database setup script: ${scriptPath}`);
}

// Add test:db script to package.json
async function addTestDbScript() {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  if (!packageJson.scripts['test:db']) {
    packageJson.scripts['test:db'] = 'tsx scripts/test-db-connection.ts';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log('✅ Added "test:db" npm script');
  }
}

// Run all functions
async function main() {
  await testDatabaseConnection();
  await createQuickSetupScript();
  await addTestDbScript();
  
  console.log('\n📚 Available commands:');
  console.log('   npm run test:db      - Test database connection');
  console.log('   npm run db:migrate   - Apply database migrations');
  console.log('   npm run db:verify    - Verify schema integrity');
  console.log('   ./scripts/setup-local-db.sh - Set up local PostgreSQL');
}

main();