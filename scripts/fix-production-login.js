#!/usr/bin/env node

import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import pg from 'pg';

// Load environment variables
config();

const { Pool } = pg;

async function fixProductionLogin() {
  console.log('🔧 Fixing production login...\n');

  // Check for required environment variable
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    console.log('Set it with: export DATABASE_URL="your-postgres-url"');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', testResult.rows[0].now);

    // Check if users table exists
    console.log('\n🔍 Checking users table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ Users table does not exist!');
      console.log('Run database migrations first.');
      process.exit(1);
    }

    // Check existing users
    console.log('\n👥 Checking existing users...');
    const usersResult = await pool.query('SELECT id, username, email, role FROM users');
    console.log(`Found ${usersResult.rows.length} users:`);
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
    });

    // Check if admin exists
    const adminCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    
    if (adminCheck.rows.length === 0) {
      console.log('\n⚠️  Admin user not found. Creating...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const insertResult = await pool.query(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username
      `, ['admin', 'admin@onekeel.com', hashedPassword, 'admin']);

      console.log('✅ Admin user created:', insertResult.rows[0]);
    } else {
      console.log('\n🔄 Admin user exists. Resetting password...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [hashedPassword, 'admin']
      );
      
      console.log('✅ Admin password reset to: admin123');
    }

    // Verify JWT_SECRET is set
    console.log('\n🔐 Checking JWT_SECRET...');
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not set in environment!');
      console.log('Add to Render environment variables: JWT_SECRET=your-secret-key');
    } else {
      console.log('✅ JWT_SECRET is configured');
    }

    console.log('\n✨ Login fix complete!');
    console.log('\nYou should now be able to login with:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('Cannot connect to database. Check DATABASE_URL.');
    }
  } finally {
    await pool.end();
  }
}

// Run the fix
fixProductionLogin().catch(console.error);