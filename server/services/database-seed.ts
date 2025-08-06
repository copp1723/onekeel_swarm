import bcrypt from 'bcryptjs';
import { db } from '../db/client.js';
import { clients, users, agentConfigurations } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/enhanced-logger.js';

export async function seedDemoData() {
  try {
    logger.info('Seeding demo data...');

    // Check if demo client already exists
    const existingClient = await db
      .select()
      .from(clients)
      .where(eq(clients.domain, 'completecarloans.com'))
      .limit(1);

    let clientId: string;

    if (existingClient.length === 0) {
      // Create demo client
      const [newClient] = await db
        .insert(clients)
        .values({
          name: 'Complete Car Loans',
          domain: 'completecarloans.com',
          brandingConfig: {
            companyName: 'Complete Car Loans',
            primaryColor: '#2563eb',
            secondaryColor: '#1d4ed8',
            emailFromName: 'Complete Car Loans',
            supportEmail: 'support@completecarloans.com'
          },
          settings: {
            maxLeads: 10000,
            maxCampaigns: 100,
            maxAgents: 50,
            apiRateLimit: 1000
          },
          plan: 'enterprise',
          subscriptionStatus: 'active',
          active: true
        })
        .returning({ id: clients.id });

      clientId = newClient.id;
      logger.info('Created demo client');
    } else {
      clientId = existingClient[0].id;
      logger.info('Demo client already exists');
    }

    // Check if demo user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@completecarloans.com'))
      .limit(1);

    if (existingUser.length === 0) {
      // Create demo user
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await db.insert(users).values({
        clientId,
        username: 'admin@completecarloans.com',
        email: 'admin@completecarloans.com',
        password_hash: hashedPassword,
        role: 'admin',
        is_active: true
      });

      logger.info('Created demo user: admin@completecarloans.com');
    } else {
      // Update password in case it changed
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await db
        .update(users)
        .set({ 
          password_hash: hashedPassword,
          updated_at: new Date()
        })
        .where(eq(users.email, 'admin@completecarloans.com'));

      logger.info('Updated demo user password');
    }

    // Check if demo agent exists
    const existingAgent = await db
      .select()
      .from(agentConfigurations)
      .where(eq(agentConfigurations.clientId, clientId))
      .limit(1);

    if (existingAgent.length === 0) {
      // Create default agent
      await db.insert(agentConfigurations).values({
        clientId,
        name: 'Default Email Agent',
        type: 'email',
        active: true,
        systemPrompt: 'You are a helpful AI assistant for Complete Car Loans. Help customers with car loan inquiries in a professional and friendly manner.',
        temperature: 7,
        maxTokens: 500,
        metadata: {
          model: 'anthropic/claude-3.5-sonnet',
          provider: 'openrouter'
        }
      });

      logger.info('Created default email agent');
    } else {
      logger.info('Default agent already exists');
    }

    logger.info('Demo data seeding completed successfully');
  } catch (error) {
    logger.error('Error seeding demo data:', error as Error);
    // Don't throw - we don't want to crash the server if seeding fails
  }
}