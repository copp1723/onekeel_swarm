#!/usr/bin/env tsx
/**
 * Quick script to create admin user for alpha testing
 */

import { sql } from 'drizzle-orm';
import { db, users } from '../server/db';
import bcrypt from 'bcryptjs';

async function createAlphaAdmin() {
  console.log('Creating alpha test admin user...');
  
  const email = 'admin@alpha.test';
  const password = 'alpha123!'; // Change this!
  
  try {
    // Check if user exists
    const existing = await db.select().from(users)
      .where(sql`email = ${email}`)
      .limit(1);
    
    if (existing.length > 0) {
      console.log('Admin user already exists!');
      return;
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.insert(users).values({
      email,
      username: 'admin',
      passwordHash: hashedPassword,
      firstName: 'Alpha',
      lastName: 'Admin',
      role: 'admin',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    process.exit(0);
  }
}

createAlphaAdmin();