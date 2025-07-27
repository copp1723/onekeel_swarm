#!/usr/bin/env tsx
import { db } from '../server/db/index.js';
import { sql } from 'drizzle-orm';
import * as schema from '../server/db/schema.js';

async function verifySchema() {
  console.log('🔍 Verifying database schema integrity...\n');
  
  let hasErrors = false;
  
  try {
    // Get all tables from database
    const dbTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
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
        console.log(`  ✅ ${tableName}`);
      } else {
        console.log(`  ❌ ${tableName} (missing)`);
        hasErrors = true;
      }
    }
    
    // Check for extra tables not in schema
    console.log('\n🔍 Extra Tables Check:');
    for (const tableName of existingTables) {
      if (!schemaTables.some(t => schema[t]._.name === tableName) && 
          !['drizzle_migrations', 'drizzle_migrations_old'].includes(tableName)) {
        console.log(`  ⚠️  ${tableName} (not in schema)`);
      }
    }
    
    // Check specific columns that were problematic
    console.log('\n📊 Column Verification:');
    const columnChecks = [
      { table: 'campaigns', column: 'description' },
      { table: 'agent_configurations', column: 'context_note' }
    ];
    
    for (const check of columnChecks) {
      const columns = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${check.table}
        AND column_name = ${check.column}
      `);
      
      if (columns.rows.length > 0) {
        console.log(`  ✅ ${check.table}.${check.column}`);
      } else {
        console.log(`  ❌ ${check.table}.${check.column} (missing)`);
        hasErrors = true;
      }
    }
    
    if (!hasErrors) {
      console.log('\n✅ Database schema is in sync!');
    } else {
      console.log('\n❌ Database schema has issues. Run migrations to fix.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error verifying schema:', error);
    process.exit(1);
  }
}

verifySchema();
