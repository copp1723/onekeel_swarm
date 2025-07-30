#!/usr/bin/env tsx
import { db } from '../server/db/client';
import { users } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function ensureAdminUser() {
  try {
    console.log('🔐 Checking for admin user...');
    
    // Check if any admin users exist
    const existingAdmins = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);
    
    if (existingAdmins.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }
    
    console.log('📝 No admin user found, creating default admin...');
    
    // Create default admin credentials
    const adminEmail = 'admin@completecarloans.com';
    const adminPassword = 'password123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Create admin user
    await db.insert(users).values({
      id: uuidv4(),
      email: adminEmail,
      username: 'admin',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Default admin user created successfully!');
    console.log('📧 Email: admin@completecarloans.com');
    console.log('🔑 Password: password123');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
    // Also create the demo user for testing
    const demoEmail = 'josh.copp@onekeel.ai';
    const existingDemo = await db
      .select()
      .from(users)
      .where(eq(users.email, demoEmail))
      .limit(1);
    
    if (existingDemo.length === 0) {
      await db.insert(users).values({
        id: uuidv4(),
        email: demoEmail,
        username: 'josh.copp',
        passwordHash: hashedPassword, // Same password for demo
        firstName: 'Josh',
        lastName: 'Copp',
        role: 'admin',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Demo user created: josh.copp@onekeel.ai');
    }
    
  } catch (error) {
    console.error('❌ Failed to ensure admin user:', error);
    // Don't throw - this should not prevent the app from starting
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureAdminUser().then(() => process.exit(0));
}
