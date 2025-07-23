#!/usr/bin/env tsx
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...');
    
    // Initialize database connection
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/onekeel_swarm';
    const sql = postgres(connectionString);
    const db = drizzle(sql);
    
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@onekeel.com'))
      .limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('❌ Admin user already exists with email: admin@onekeel.com');
      await sql.end();
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123!', 10);
    
    // Create admin user
    await db.insert(users).values({
      id: uuidv4(),
      email: 'admin@onekeel.com',
      username: 'admin',
      passwordHash: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@onekeel.com');
    console.log('👤 Username: admin');
    console.log('🔑 Password: admin123!');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }
}

createAdminUser();