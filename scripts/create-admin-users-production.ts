#!/usr/bin/env tsx
/**
 * Create admin users in production database with proper password hashes
 * This script fixes the authentication issue by ensuring admin users exist with correct credentials
 */

import bcrypt from 'bcryptjs';
import { db } from '../server/db/client.js';
import { users } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function createAdminUsers() {
  console.log('🔐 Creating admin users in production database...');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    await db.execute({ sql: 'SELECT 1', args: [] });
    console.log('✅ Database connection successful');

    // Admin user credentials
    const adminUsers = [
      {
        email: 'admin@OneKeelSwarm.com',
        username: 'admin',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin' as const
      },
      {
        email: 'josh.copp@onekeel.ai',
        username: 'josh.copp',
        password: 'password123',
        firstName: 'Josh',
        lastName: 'Copp',
        role: 'admin' as const
      }
    ];

    for (const userData of adminUsers) {
      console.log(`\n👤 Processing user: ${userData.email}`);

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        console.log(`⚠️  User ${userData.email} already exists. Updating password...`);
        
        // Hash the password
        const passwordHash = await bcrypt.hash(userData.password, 12);
        
        // Update existing user
        await db
          .update(users)
          .set({
            passwordHash,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            active: true,
            updatedAt: new Date()
          })
          .where(eq(users.email, userData.email));

        console.log(`✅ Updated user: ${userData.email}`);
      } else {
        console.log(`📝 Creating new user: ${userData.email}`);
        
        // Hash the password
        const passwordHash = await bcrypt.hash(userData.password, 12);
        
        // Create new user
        await db.insert(users).values({
          id: uuidv4(),
          email: userData.email,
          username: userData.username,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`✅ Created user: ${userData.email}`);
      }
    }

    // Verify users were created/updated
    console.log('\n🔍 Verifying admin users...');
    const allAdmins = await db
      .select({
        email: users.email,
        username: users.username,
        role: users.role,
        active: users.active
      })
      .from(users)
      .where(eq(users.role, 'admin'));

    console.log('📋 Admin users in database:');
    allAdmins.forEach(user => {
      console.log(`  - ${user.email} (${user.username}) - Active: ${user.active}`);
    });

    console.log('\n🎉 Admin users setup completed successfully!');
    console.log('\n📧 Login Credentials:');
    console.log('  Email: admin@OneKeelSwarm.com');
    console.log('  Password: password123');
    console.log('  OR');
    console.log('  Email: josh.copp@onekeel.ai');
    console.log('  Password: password123');

  } catch (error) {
    console.error('❌ Failed to create admin users:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        code: (error as any).code,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
    
    process.exit(1);
  }
}

// Run the script
createAdminUsers()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
