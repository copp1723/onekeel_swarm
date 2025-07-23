import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, varchar, serial, pgEnum, index, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'agent', 'viewer']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'converted', 'rejected']);
export const channelEnum = pgEnum('channel', ['email', 'sms', 'chat']);
export const communicationDirectionEnum = pgEnum('communication_direction', ['inbound', 'outbound']);
export const communicationStatusEnum = pgEnum('communication_status', ['pending', 'sent', 'delivered', 'failed', 'received']);
export const campaignTypeEnum = pgEnum('campaign_type', ['drip', 'blast', 'trigger']);
export const agentTypeEnum = pgEnum('agent_type', ['email', 'sms', 'chat', 'voice']);

// ============================================
// CORE TABLES
// ============================================

// Users table - for authentication and access control
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  username: varchar('username', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  role: userRoleEnum('role').default('agent').notNull(),
  active: boolean('active').default(true).notNull(),
  lastLogin: timestamp('last_login'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    emailIdx: index('users_email_idx').on(table.email),
    usernameIdx: index('users_username_idx').on(table.username)
  }
});

// Clients table - for multi-tenant client management
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).unique(),
  
  // Client settings and branding
  settings: jsonb('settings').default({}),
  
  // Status
  active: boolean('active').default(true).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    nameIdx: index('clients_name_idx').on(table.name),
    domainIdx: index('clients_domain_idx').on(table.domain),
    activeIdx: index('clients_active_idx').on(table.active)
  }
});

// Agent Configurations table - for AI agent settings
export const agentConfigurations = pgTable('agent_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: agentTypeEnum('type').notNull(),
  active: boolean('active').default(true).notNull(),
  
  // Core Configuration
  systemPrompt: text('system_prompt').notNull(),
  contextNote: text('context_note'), // New field for additional context
  temperature: integer('temperature').default(7), // 0-10 scale (will be divided by 10)
  maxTokens: integer('max_tokens').default(500),
  
  // API Configuration
  apiKey: varchar('api_key', { length: 255 }),
  apiEndpoint: varchar('api_endpoint', { length: 500 }),
  
  // Channel-specific settings
  channelConfig: jsonb('channel_config').default({}), // Email settings, SMS settings, etc.
  
  // Behavioral settings
  responseDelay: integer('response_delay').default(0), // Seconds to wait before responding
  retryAttempts: integer('retry_attempts').default(3),
  
  // Metadata
  metadata: jsonb('metadata').default({}),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    nameIdx: index('agent_configurations_name_idx').on(table.name),
    typeIdx: index('agent_configurations_type_idx').on(table.type),
    activeIdx: index('agent_configurations_active_idx').on(table.active)
  }
});

// Leads table - core business entity
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Basic Info
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  
  // Lead Details
  source: varchar('source', { length: 100 }).notNull().default('website'),
  status: leadStatusEnum('status').default('new').notNull(),
  qualificationScore: integer('qualification_score').default(0),
  assignedChannel: channelEnum('assigned_channel'),
  
  // External integrations
  boberdooId: varchar('boberdoo_id', { length: 255 }),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  
  // Financial Info
  creditScore: integer('credit_score'),
  income: integer('annual_income'),
  employer: varchar('employer', { length: 255 }),
  jobTitle: varchar('job_title', { length: 255 }),
  
  // Additional Data
  metadata: jsonb('metadata').default({}),
  notes: text('notes'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastContactedAt: timestamp('last_contacted_at')
}, (table) => {
  return {
    emailIdx: index('leads_email_idx').on(table.email),
    phoneIdx: index('leads_phone_idx').on(table.phone),
    statusIdx: index('leads_status_idx').on(table.status),
    sourceIdx: index('leads_source_idx').on(table.source),
    assignedChannelIdx: index('leads_assigned_channel_idx').on(table.assignedChannel),
    boberdooIdIdx: index('leads_boberdoo_id_idx').on(table.boberdooId),
    campaignIdIdx: index('leads_campaign_id_idx').on(table.campaignId),
    createdAtIdx: index('leads_created_at_idx').on(table.createdAt)
  }
});

// Campaigns table
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: campaignTypeEnum('type').default('drip').notNull(),
  active: boolean('active').default(true).notNull(),
  
  // Targeting
  targetCriteria: jsonb('target_criteria').default({}),
  
  // Configuration
  settings: jsonb('settings').default({}),
  
  // Timestamps
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    nameIdx: index('campaigns_name_idx').on(table.name),
    activeIdx: index('campaigns_active_idx').on(table.active),
    typeIdx: index('campaigns_type_idx').on(table.type)
  }
});

// Communications table - all interactions with leads
export const communications = pgTable('communications', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').notNull().references(() => leads.id),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  
  // Communication Details
  channel: channelEnum('channel').notNull(),
  direction: communicationDirectionEnum('direction').notNull(),
  status: communicationStatusEnum('status').default('pending').notNull(),
  
  // Content
  subject: varchar('subject', { length: 255 }),
  content: text('content').notNull(),
  
  // External References
  externalId: varchar('external_id', { length: 255 }), // Mailgun ID, Twilio SID, etc.
  
  // Metadata
  metadata: jsonb('metadata').default({}),
  
  // Timestamps
  scheduledFor: timestamp('scheduled_for'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    leadIdIdx: index('communications_lead_id_idx').on(table.leadId),
    campaignIdIdx: index('communications_campaign_id_idx').on(table.campaignId),
    channelIdx: index('communications_channel_idx').on(table.channel),
    statusIdx: index('communications_status_idx').on(table.status),
    createdAtIdx: index('communications_created_at_idx').on(table.createdAt)
  }
});

// Templates table - for email/SMS templates
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  channel: channelEnum('channel').notNull(),
  
  // Content
  subject: varchar('subject', { length: 255 }), // For emails
  content: text('content').notNull(),
  
  // Variables
  variables: jsonb('variables').default([]), // Array of variable names
  
  // Metadata
  category: varchar('category', { length: 100 }),
  active: boolean('active').default(true).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    nameIdx: index('templates_name_idx').on(table.name),
    channelIdx: index('templates_channel_idx').on(table.channel),
    categoryIdx: index('templates_category_idx').on(table.category),
    activeIdx: index('templates_active_idx').on(table.active)
  }
});

// Campaign Steps - for multi-step campaigns
export const campaignSteps = pgTable('campaign_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => templates.id),
  
  // Step Configuration
  stepOrder: integer('step_order').notNull(),
  delayMinutes: integer('delay_minutes').default(0),
  
  // Conditions
  conditions: jsonb('conditions').default({}),
  
  // Metadata
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    campaignIdIdx: index('campaign_steps_campaign_id_idx').on(table.campaignId),
    stepOrderIdx: index('campaign_steps_order_idx').on(table.campaignId, table.stepOrder)
  }
});

// Lead Campaign Enrollments
export const leadCampaignEnrollments = pgTable('lead_campaign_enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').notNull().references(() => leads.id),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id),
  
  // Progress
  currentStep: integer('current_step').default(0),
  completed: boolean('completed').default(false).notNull(),
  
  // Status
  status: varchar('status', { length: 50 }).default('active').notNull(), // active, paused, completed, stopped
  
  // Timestamps
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  lastProcessedAt: timestamp('last_processed_at')
}, (table) => {
  return {
    leadCampaignIdx: index('enrollments_lead_campaign_idx').on(table.leadId, table.campaignId),
    statusIdx: index('enrollments_status_idx').on(table.status)
  }
});

// Sessions table - for auth
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).unique().notNull(),
  
  // Session Data
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  // Timestamps
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
    tokenIdx: index('sessions_token_idx').on(table.token),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt)
  }
});

// Audit Logs - for tracking changes
// Analytics Events table - for tracking custom events
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  leadId: uuid('lead_id').references(() => leads.id),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  userId: uuid('user_id').references(() => users.id),
  
  // Event details
  channel: channelEnum('channel'),
  value: integer('value').default(1).notNull(),
  metadata: jsonb('metadata').default({}),
  
  // Timestamp
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    eventTypeIdx: index('analytics_events_event_type_idx').on(table.eventType),
    leadIdIdx: index('analytics_events_lead_id_idx').on(table.leadId),
    campaignIdIdx: index('analytics_events_campaign_id_idx').on(table.campaignId),
    createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt)
  }
});

// Conversations table - for chat/agent conversations
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id),
  
  // Conversation details
  channel: channelEnum('channel').notNull(),
  agentType: agentTypeEnum('agent_type'),
  status: varchar('status', { length: 50 }).default('active').notNull(), // active, completed, abandoned
  
  // Content
  messages: jsonb('messages').default([]).notNull(),
  
  // Metadata
  metadata: jsonb('metadata').default({}),
  
  // Timestamps
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  lastMessageAt: timestamp('last_message_at')
}, (table) => {
  return {
    leadIdIdx: index('conversations_lead_id_idx').on(table.leadId),
    channelIdx: index('conversations_channel_idx').on(table.channel),
    statusIdx: index('conversations_status_idx').on(table.status),
    startedAtIdx: index('conversations_started_at_idx').on(table.startedAt)
  }
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  
  // Action Details
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  
  // Change Data
  changes: jsonb('changes').default({}),
  
  // Context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  // Timestamp
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    resourceIdx: index('audit_logs_resource_idx').on(table.resource, table.resourceId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt)
  }
});

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  auditLogs: many(auditLogs)
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  // Clients can have many users, campaigns, etc.
  // Add specific relations as needed
}));

export const agentConfigurationsRelations = relations(agentConfigurations, ({ many }) => ({
  // Agent configurations can be used by multiple campaigns/communications
  // but we don't enforce this with foreign keys to keep it flexible
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [leads.campaignId],
    references: [campaigns.id]
  }),
  communications: many(communications),
  enrollments: many(leadCampaignEnrollments),
  analyticsEvents: many(analyticsEvents),
  conversations: many(conversations)
}));

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  steps: many(campaignSteps),
  enrollments: many(leadCampaignEnrollments),
  communications: many(communications)
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  lead: one(leads, {
    fields: [communications.leadId],
    references: [leads.id]
  }),
  campaign: one(campaigns, {
    fields: [communications.campaignId],
    references: [campaigns.id]
  })
}));

export const templatesRelations = relations(templates, ({ many }) => ({
  campaignSteps: many(campaignSteps)
}));

export const campaignStepsRelations = relations(campaignSteps, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignSteps.campaignId],
    references: [campaigns.id]
  }),
  template: one(templates, {
    fields: [campaignSteps.templateId],
    references: [templates.id]
  })
}));

export const leadCampaignEnrollmentsRelations = relations(leadCampaignEnrollments, ({ one }) => ({
  lead: one(leads, {
    fields: [leadCampaignEnrollments.leadId],
    references: [leads.id]
  }),
  campaign: one(campaigns, {
    fields: [leadCampaignEnrollments.campaignId],
    references: [campaigns.id]
  })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  lead: one(leads, {
    fields: [analyticsEvents.leadId],
    references: [leads.id]
  }),
  campaign: one(campaigns, {
    fields: [analyticsEvents.campaignId],
    references: [campaigns.id]
  }),
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id]
  })
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  lead: one(leads, {
    fields: [conversations.leadId],
    references: [leads.id]
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  })
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type AgentConfiguration = typeof agentConfigurations.$inferSelect;
export type NewAgentConfiguration = typeof agentConfigurations.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type Communication = typeof communications.$inferSelect;
export type NewCommunication = typeof communications.$inferInsert;

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

export type CampaignStep = typeof campaignSteps.$inferSelect;
export type NewCampaignStep = typeof campaignSteps.$inferInsert;

export type LeadCampaignEnrollment = typeof leadCampaignEnrollments.$inferSelect;
export type NewLeadCampaignEnrollment = typeof leadCampaignEnrollments.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Export aliases for backward compatibility
export const emailTemplates = templates;