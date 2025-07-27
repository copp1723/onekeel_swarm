#!/usr/bin/env tsx
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { users, leads, campaigns, communications, conversations, agentDecisions } from '../server/db/schema.js';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/onekeel_swarm';
const sql = postgres(connectionString);
const db = drizzle(sql);

async function seedData() {
  console.log('🌱 Starting OneKeel Swarm data seeding...\n');

  try {
    // 1. Seed Users
    console.log('👤 Seeding users...');
    
    // Check if users already exist
    const existingUsers = await db.select().from(users).limit(1);
    
    if (existingUsers.length === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await db.insert(users).values([
        {
          id: uuidv4(),
          email: 'admin@onekeel.com',
          username: 'admin',
          passwordHash: hashedPassword,
          role: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          email: 'agent@onekeel.com',
          username: 'agent1',
          passwordHash: hashedPassword,
          role: 'agent',
          firstName: 'Test',
          lastName: 'Agent',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          email: 'test@onekeel.com',
          username: 'testuser',
          passwordHash: hashedPassword,
          role: 'user',
          firstName: 'Test',
          lastName: 'User',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      console.log(`✅ Created 3 test users`);
    } else {
      console.log(`ℹ️  Users already exist, skipping...`);
    }

    // 2. Seed Leads
    console.log('\n📋 Seeding leads...');
    const leadIds = [uuidv4(), uuidv4(), uuidv4()];
    
    await db.insert(leads).values([
      {
        id: leadIds[0],
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+15551234567',
        source: 'website',
        status: 'new',
        qualificationScore: 75,
        metadata: JSON.stringify({
          creditScore: 720,
          income: 75000,
          employer: 'Acme Corp'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: leadIds[1],
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+15559876543',
        source: 'referral',
        status: 'contacted',
        qualificationScore: 65,
        metadata: JSON.stringify({
          creditScore: 680,
          income: 60000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: leadIds[2],
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        phone: '+15555555555',
        source: 'campaign',
        status: 'qualified',
        qualificationScore: 85,
        metadata: JSON.stringify({
          creditScore: 750,
          income: 85000,
          employer: 'Tech Corp',
          approved: true
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log(`✅ Created 3 test leads`);

    // 3. Seed Campaigns
    console.log('\n📊 Seeding campaigns...');
    const campaignId = uuidv4();
    
    await db.insert(campaigns).values([
      {
        id: campaignId,
        name: 'Test Abandonment Campaign',
        goals: JSON.stringify(['recover_abandonment', 'qualify_leads']),
        qualificationCriteria: JSON.stringify({ minCreditScore: 650, minIncome: 50000 }),
        channelPreferences: JSON.stringify({ primary: 'email', secondary: 'sms' }),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log(`✅ Created 1 test campaign`);

    // 4. Seed Communications
    console.log('\n📧 Seeding communications...');
    await db.insert(communications).values([
      {
        id: uuidv4(),
        leadId: leadIds[0],
        channel: 'email',
        direction: 'outbound',
        content: 'Welcome to OneKeel Swarm!',
        status: 'sent',
        metadata: JSON.stringify({
          templateId: 'welcome',
          sentAt: new Date()
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        leadId: leadIds[1],
        channel: 'sms',
        direction: 'outbound',
        content: 'Complete your application: bit.ly/onekeel123',
        status: 'delivered',
        metadata: JSON.stringify({
          templateId: 'abandonment',
          sentAt: new Date()
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        leadId: leadIds[0],
        channel: 'email',
        direction: 'inbound',
        content: 'I am interested in learning more',
        status: 'received',
        metadata: JSON.stringify({
          receivedAt: new Date()
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log(`✅ Created 3 test communications`);

    // 5. Seed Conversations
    console.log('\n💬 Seeding conversations...');
    await db.insert(conversations).values([
      {
        id: uuidv4(),
        leadId: leadIds[0],
        channel: 'chat',
        agentType: 'chat',
        messages: JSON.stringify([
          { role: 'assistant', content: 'Hello! How can I help you today?', timestamp: new Date() },
          { role: 'user', content: 'I need help with my application', timestamp: new Date() },
          { role: 'assistant', content: 'I\'d be happy to help! What specific questions do you have?', timestamp: new Date() }
        ]),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log(`✅ Created 1 test conversation`);

    // 6. Seed Agent Decisions
    console.log('\n🤖 Seeding agent decisions...');
    await db.insert(agentDecisions).values([
      {
        id: uuidv4(),
        leadId: leadIds[0],
        agentType: 'email',
        decision: 'send_welcome',
        reasoning: 'New lead requires welcome email',
        context: JSON.stringify({
          templateSelected: 'welcome',
          priority: 'high'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        leadId: leadIds[2],
        agentType: 'overlord',
        decision: 'qualify_lead',
        reasoning: 'Lead meets all qualification criteria',
        context: JSON.stringify({
          score: 85,
          criteria: { creditScore: 750, income: 85000 }
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log(`✅ Created 2 test agent decisions`);

    console.log('\n🎉 OneKeel Swarm data seeding completed successfully!');
    
    // Verify data
    console.log('\n📊 Data verification:');
    const leadCount = await db.select().from(leads);
    const campaignCount = await db.select().from(campaigns);
    const commCount = await db.select().from(communications);
    const userCount = await db.select().from(users);
    
    console.log(`  - Users: ${userCount.length}`);
    console.log(`  - Leads: ${leadCount.length}`);
    console.log(`  - Campaigns: ${campaignCount.length}`);
    console.log(`  - Communications: ${commCount.length}`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
import { argv } from 'process';

if (import.meta.url === `file://${argv[1]}` || fileURLToPath(import.meta.url) === argv[1]) {
  seedData();
}

export { seedData };