#!/usr/bin/env tsx
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { users } from '../server/db/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@localhost:5432/onekeel_swarm';
const sql = postgres(connectionString);
const db = drizzle(sql);

async function addDemoUser() {
  console.log('🔐 Adding demo user josh.copp@onekeel.ai...');

  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'josh.copp@onekeel.ai'))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('✅ Demo user already exists!');
      await sql.end();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('testpassword', 10);

    // Create demo user
    await db.insert(users).values({
      id: uuidv4(),
      email: 'josh.copp@onekeel.ai',
      username: 'josh.copp',
      passwordHash: hashedPassword,
      firstName: 'Josh',
      lastName: 'Copp',
      role: 'admin',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Demo user created successfully!');
    console.log('📧 Email: josh.copp@onekeel.ai');
    console.log('🔑 Password: testpassword');

    await sql.end();
  } catch (error) {
    console.error('❌ Failed to create demo user:', error);
    process.exit(1);
  }
}

addDemoUser();
