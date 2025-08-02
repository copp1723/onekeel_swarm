#!/usr/bin/env tsx
import { db } from '../server/db/client';
import { users } from '../server/db/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function ensureAdminUser() {
  try {
    console.log('🔐 Checking for admin user...');

    // Test database connection first
    try {
      await db.execute(sql`SELECT 1`);
    } catch (dbError) {
      console.log(
        '❌ Database connection failed, skipping admin user creation'
      );
      console.log('   This is normal if database is not set up yet');
      return;
    }

    // Test if users table exists and has required columns
    try {
      await db.execute(sql`SELECT id, email, role FROM users LIMIT 1`);
    } catch (schemaError) {
      console.log(
        '❌ Users table or required columns not found, skipping admin user creation'
      );
      console.log('   Run database migrations first: npm run db:push');
      return;
    }

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

    // Create default admin credentials from environment or use defaults
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
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
      updatedAt: new Date(),
    });

    console.log('✅ Default admin user created successfully!');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log('⚠️  IMPORTANT: Change the password after first login!');

    // Also create the demo user for testing if specified
    const demoEmail = process.env.DEMO_EMAIL;
    if (demoEmail) {
      const existingDemo = await db
        .select()
        .from(users)
        .where(eq(users.email, demoEmail))
        .limit(1);

      if (existingDemo.length === 0) {
        await db.insert(users).values({
          id: uuidv4(),
          email: demoEmail,
          username: demoEmail.split('@')[0],
          passwordHash: hashedPassword, // Same password for demo
          firstName: 'Demo',
          lastName: 'User',
          role: 'admin',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ Demo user created: ${demoEmail}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to ensure admin user:', error);
    // Don't throw - this should not prevent the app from starting
    // Log additional details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        code: (error as any).code,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      });
    }
  }
}

// Note: This script is designed to be imported, not run directly
// If you need to run it directly, use: tsx scripts/ensure-admin-user.ts
