// Database client and connection
export { db, closeConnection, type DbTransaction } from './client';

// Schema exports
export * from './schema';

// Import schema tables for repository operations
import { db } from './client';
import {
  leads,
  conversations,
  campaigns,
  communications,
  agentConfigurations,
  users,
  auditLogs,
  analyticsEvents,
  clients,
  templates as emailTemplates,
  leadCampaignEnrollments,
} from './schema';
import { eq, and, sql } from 'drizzle-orm';

// Repository classes with real database operations
export class LeadsRepository {
  static async findById(id: string) {
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);
    return lead || null;
  }

  static async create(data: any) {
    const [lead] = await db
      .insert(leads)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return lead;
  }

  static async update(id: string, data: any) {
    const [updated] = await db
      .update(leads)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();
    return updated || null;
  }

  static async updateStatus(id: string, status: string, buyerId?: string) {
    const updates: any = { status, updatedAt: new Date() };
    if (buyerId) updates.boberdooId = buyerId;

    const [updated] = await db
      .update(leads)
      .set(updates)
      .where(eq(leads.id, id))
      .returning();
    return updated || null;
  }

  static async updateQualificationScore(id: string, score: number) {
    const [updated] = await db
      .update(leads)
      .set({
        qualificationScore: score,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();
    return updated || null;
  }

  static async delete(id: string) {
    const [deleted] = await db
      .delete(leads)
      .where(eq(leads.id, id))
      .returning();
    return !!deleted;
  }

  static async findAll(options?: { limit?: number }) {
    const query = db.select().from(leads);
    if (options?.limit) query.limit(options.limit);
    return await query;
  }
}

export class ConversationsRepository {
  static async findById(id: string) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    return conversation || null;
  }

  static async create(leadId: string, channel: string, agentType: string) {
    const [conversation] = await db
      .insert(conversations)
      .values({
        leadId,
        channel: channel as any,
        agentType: agentType as any,
        messages: [],
        status: 'active',
        startedAt: new Date(),
        lastMessageAt: new Date(),
      })
      .returning();
    return conversation;
  }

  static async findByLeadId(leadId: string) {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.leadId, leadId));
  }

  static async findByLeadIdAndChannel(leadId: string, channel: string) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.leadId, leadId),
          eq(conversations.channel, channel as any)
        )
      )
      .limit(1);
    return conversation || null;
  }

  static async appendMessage(id: string, role: string, content: string) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    if (!conversation) return null;

    const messages = (conversation.messages as any[]) || [];
    messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    const [updated] = await db
      .update(conversations)
      .set({
        messages,
        lastMessageAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();

    return updated || null;
  }

  static async updateAgentType(id: string, agentType: string) {
    const [updated] = await db
      .update(conversations)
      .set({
        agentType: agentType as any,
        lastMessageAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();
    return updated || null;
  }

  static async updateStatus(id: string, status: string) {
    const [updated] = await db
      .update(conversations)
      .set({
        status,
        lastMessageAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();
    return updated || null;
  }

  // Alias for appendMessage to match expected interface
  static async addMessage(
    id: string,
    messageData: { role: string; content: string }
  ) {
    return await this.appendMessage(id, messageData.role, messageData.content);
  }
}

export class AgentDecisionsRepository {
  static async create(
    leadId: string,
    agentType: string,
    decision: any,
    reasoning?: any,
    metadata?: any
  ) {
    const data: any = {
      leadId,
      agentType,
      decision,
      reasoning,
      metadata,
      timestamp: new Date(),
    };

    // Handle both positional and object-based arguments
    if (typeof leadId === 'object') {
      Object.assign(data, leadId);
    }

    // Store agent decisions as analytics events with type 'agent_decision'
    const [event] = await db
      .insert(analyticsEvents)
      .values({
        eventType: 'agent_decision',
        eventName: `${data.agentType}_decision`,
        userId: null,
        metadata: data,
        timestamp: new Date(),
      })
      .returning();

    return {
      id: event.id,
      leadId: data.leadId,
      agentType: data.agentType,
      decision: data.decision,
      reasoning: data.reasoning,
      metadata: data.metadata,
      createdAt: event.timestamp,
    };
  }

  static async findByLeadId(leadId: string) {
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'agent_decision'),
          sql`metadata->>'leadId' = ${leadId}`
        )
      );

    return events.map(e => ({
      id: e.id,
      leadId: e.metadata?.leadId,
      agentType: e.metadata?.agentType,
      decision: e.metadata?.decision,
      reasoning: e.metadata?.reasoning,
      metadata: e.metadata?.metadata,
      createdAt: e.timestamp,
    }));
  }
}

export class CampaignsRepository {
  static async findById(id: string) {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);
    return campaign || null;
  }

  static async updateLeadStatus(
    campaignId: string,
    leadId: string,
    status: string
  ) {
    const [enrollment] = await db
      .update(leadCampaignEnrollments)
      .set({
        status: status as any,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leadCampaignEnrollments.campaignId, campaignId),
          eq(leadCampaignEnrollments.leadId, leadId)
        )
      )
      .returning();
    return enrollment || null;
  }

  static async getDefaultCampaign() {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.active, true))
      .orderBy(campaigns.createdAt)
      .limit(1);
    return campaign || null;
  }
}

export class CommunicationsRepository {
  static async create(
    leadId: string,
    channel: string,
    direction: string,
    content: string,
    status: string,
    metadata?: any,
    options?: any
  ) {
    const [communication] = await db
      .insert(communications)
      .values({
        leadId,
        channel: channel as any,
        direction: direction as any,
        content,
        status: status as any,
        metadata: metadata || {},
        externalId: options?.externalId,
        createdAt: new Date(),
      })
      .returning();
    return communication;
  }
}

export class AgentConfigurationsRepository {
  static async findByType(type: string) {
    const [config] = await db
      .select()
      .from(agentConfigurations)
      .where(eq(agentConfigurations.type, type as any))
      .limit(1);
    return config || null;
  }

  static async create(data: any) {
    const [config] = await db
      .insert(agentConfigurations)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return config;
  }

  static async updatePerformance(id: string, metric: string) {
    const [config] = await db
      .select()
      .from(agentConfigurations)
      .where(eq(agentConfigurations.id, id))
      .limit(1);

    if (!config) return null;

    const performance = config.performance || {
      conversations: 0,
      successful: 0,
    };
    if (metric === 'conversations') {
      performance.conversations = (performance.conversations || 0) + 1;
    } else if (metric === 'successful') {
      performance.successful = (performance.successful || 0) + 1;
    }

    const [updated] = await db
      .update(agentConfigurations)
      .set({
        performance,
        updatedAt: new Date(),
      })
      .where(eq(agentConfigurations.id, id))
      .returning();

    return updated || null;
  }
}

export class UsersRepository {
  static async findById(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user || null;
  }

  static async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user || null;
  }

  static async findByUsername(username: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user || null;
  }

  static async updateLastLogin(id: string) {
    const [updated] = await db
      .update(users)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated || null;
  }

  static async create(data: any) {
    const [user] = await db
      .insert(users)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }
}

export class AuditLogRepository {
  static async create(data: any) {
    const [log] = await db
      .insert(auditLogs)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return log;
  }
}

export class AnalyticsRepository {
  static async create(data: any) {
    const [analytic] = await db
      .insert(analyticsEvents)
      .values({
        ...data,
        timestamp: new Date(),
      })
      .returning();
    return analytic;
  }
}

export class ClientsRepository {
  static async findById(id: string) {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);
    return client || null;
  }
}

export class EmailTemplatesRepository {
  static async findById(id: string) {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .limit(1);
    return template || null;
  }
}

// Lead model for compatibility
export class Lead {
  id: string = '';
  name: string = '';
  email: string = '';
  phone?: string;
  source: string = '';
  status: string = '';
  metadata: any = {};
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
}

// Export singleton instances for compatibility
export const leadsRepository = LeadsRepository;
export const conversationsRepository = ConversationsRepository;
export const agentDecisionsRepository = AgentDecisionsRepository;
export const campaignsRepository = CampaignsRepository;
export const communicationsRepository = CommunicationsRepository;
export const emailTemplatesRepository = EmailTemplatesRepository;
export const agentConfigurationsRepository = AgentConfigurationsRepository;
export const usersRepository = UsersRepository;
export const auditLogRepository = AuditLogRepository;
export const analyticsRepository = AnalyticsRepository;
export const clientsRepository = ClientsRepository;
