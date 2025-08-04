#!/usr/bin/env tsx
/**
 * Apply database schema fix for production
 * This script runs the SQL migration to fix the users table structure
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyDatabaseFix() {
  console.log('🔧 Applying database schema fix...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not found');
    process.exit(1);
  }

  // Create database connection
  const sql = postgres(connectionString, {
    ssl: 'require',
    max: 1,
  });

  try {
    // Read the SQL fix file
    const sqlFilePath = join(__dirname, 'fix-production-database.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');

    console.log('📄 Executing database migration...');

    // Execute the SQL
    await sql.unsafe(sqlContent);

    console.log('✅ Database schema fix applied successfully!');

    // Verify the users table structure
    console.log('🔍 Verifying users table...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;

    console.log('📋 Users table columns:');
    columns.forEach(col => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`
      );
    });

    // Check if admin users exist
    const adminUsers = await sql`
      SELECT email, username, role, active 
      FROM users 
      WHERE role = 'admin'
    `;

    console.log('\n👥 Admin users:');
    if (adminUsers.length === 0) {
      console.log('  ⚠️  No admin users found');
    } else {
      adminUsers.forEach(user => {
        console.log(
          `  - ${user.email} (${user.username}) - Active: ${user.active}`
        );
      });
    }

    console.log('\n🎉 Database fix completed successfully!');
    console.log('\n📧 You can now login with:');
    console.log('  Email: admin@OneKeelSwarm.com');
    console.log('  Password: password123');
    console.log('  OR');
    console.log('  Email: josh.copp@onekeel.ai');
    console.log('  Password: password123');
  } catch (error) {
    console.error('❌ Failed to apply database fix:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        code: (error as any).code,
      });
    }

    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the script
applyDatabaseFix();
