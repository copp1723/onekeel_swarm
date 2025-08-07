import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, varchar, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Essential enums for campaign wizard
// Note: userRoleEnum temporarily disabled to avoid data loss during migration
// export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'converted', 'rejected']);
export const channelEnum = pgEnum('channel', ['email', 'sms', 'chat']);
export const campaignTypeEnum = pgEnum('campaign_type', ['drip', 'blast', 'trigger']);
export const agentTypeEnum = pgEnum('agent_type', ['email', 'sms', 'chat', 'voice']);
export const communicationDirectionEnum = pgEnum('communication_direction', ['inbound', 'outbound']);
export const communicationStatusEnum = pgEnum('communication_status', ['pending', 'sent', 'delivered', 'failed', 'received']);

// White label and multi-tenant tables
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).unique(),
  brandingConfig: jsonb('branding_config').notNull().default({
    companyName: 'CCL-3 SWARM',
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    emailFromName: 'CCL-3 SWARM',
    supportEmail: 'support@ccl3swarm.com'
  }),
  settings: jsonb('settings').notNull().default({
    maxLeads: 1000,
    maxCampaigns: 5,
    maxAgents: 2,
    apiRateLimit: 100
  }),
  plan: varchar('plan', { length: 50 }).notNull().default('basic'),
  subscriptionStatus: varchar('subscription_status', { length: 50 }).notNull().default('active'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => {
  return {
    nameIdx: index('clients_name_idx').on(table.name),
    domainIdx: index('clients_domain_idx').on(table.domain),
    activeIdx: index('clients_active_idx').on(table.active),
    planIdx: index('clients_plan_idx').on(table.plan)
  }
});

export const clientApiKeys = pgTable('client_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  keyName: varchar('key_name', { length: 255 }).notNull(),
  apiKey: varchar('api_key', { length: 255 }).notNull().unique(),
  permissions: jsonb('permissions').notNull().default(['read', 'write']),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => {
  return {
    clientIdIdx: index('client_api_keys_client_id_idx').on(table.clientId),
    apiKeyIdx: index('client_api_keys_api_key_idx').on(table.apiKey),
    activeIdx: index('client_api_keys_active_idx').on(table.active)
  }
});

export const whiteLabelTemplates = pgTable('white_label_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  templateType: varchar('template_type', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  content: text('content').notNull(),
  variables: jsonb('variables').default([]),
  isDefault: boolean('is_default').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => {
  return {
    clientIdIdx: index('white_label_templates_client_id_idx').on(table.clientId),
    typeIdx: index('white_label_templates_type_idx').on(table.templateType),
    activeIdx: index('white_label_templates_active_idx').on(table.active)
  }
});

export const clientDomains = pgTable('client_domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  subdomain: varchar('subdomain', { length: 255 }),
  sslEnabled: boolean('ssl_enabled').notNull().default(false),
  verified: boolean('verified').notNull().default(false),
  verificationToken: varchar('verification_token', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  verifiedAt: timestamp('verified_at')
}, (table) => {
  return {
    clientIdIdx: index('client_domains_client_id_idx').on(table.clientId),
    domainIdx: index('client_domains_domain_idx').on(table.domain),
    verifiedIdx: index('client_domains_verified_idx').on(table.verified)
  }
});

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'), // Temporarily text instead of enum to avoid data loss
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    clientIdIdx: index('users_client_id_idx').on(table.clientId)
  }
});

// Sessions table
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  token: text('token').notNull(), // Added missing token column
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  last_accessed_at: timestamp('last_accessed_at').notNull().defaultNow(),
}, (table) => {
  return {
    clientIdIdx: index('sessions_client_id_idx').on(table.clientId)
  }
});

// Agent configurations for campaign wizard
export const agentConfigurations = pgTable('agent_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: agentTypeEnum('type').notNull(),
  active: boolean('active').default(true).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  context_note: text('context_note'), // Added missing context_note column
  temperature: integer('temperature').default(7),
  maxTokens: integer('max_tokens').default(500),
  api_key: text('api_key'),
  api_endpoint: text('api_endpoint'),
  channel_config: jsonb('channel_config').default({}),
  response_delay: integer('response_delay').default(0),
  retry_attempts: integer('retry_attempts').default(3),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    clientIdIdx: index('agent_configurations_client_id_idx').on(table.clientId)
  }
});

// Enhanced campaigns table for wizard
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: text('type').default('drip').notNull(), // Temporarily text instead of enum
  status: text('status').notNull().default('draft'),
  active: boolean('active').default(true).notNull(), // Added missing active column
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Campaign wizard fields
  goal: text('goal'),
  target_criteria: jsonb('target_criteria').default({}), // Added missing target_criteria
  targetAudience: jsonb('target_audience').default({}),
  agentId: uuid('agent_id').references(() => agentConfigurations.id),
  offerDetails: jsonb('offer_details').default({}),
  emailSequence: jsonb('email_sequence').default([]),
  schedule: jsonb('schedule').default({}),
  settings: jsonb('settings').default({}),
  start_date: timestamp('start_date'),
  end_date: timestamp('end_date'),
  
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    clientIdIdx: index('campaigns_client_id_idx').on(table.clientId)
  }
});

// Enhanced leads table
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  first_name: varchar('first_name', { length: 255 }),
  last_name: varchar('last_name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  campaign_id: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
  status: text('status').default('new').notNull(), // Temporarily text instead of enum
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    clientIdIdx: index('leads_client_id_idx').on(table.clientId)
  }
});

// Lead campaign enrollments for tracking campaign participation
export const leadCampaignEnrollments = pgTable('lead_campaign_enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('active'), // active, paused, completed
  completed: boolean('completed').default(false),
  enrolledAt: timestamp('enrolled_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata').default({}),
});

// Email templates for campaign wizard
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  channel: channelEnum('channel').notNull(),
  subject: varchar('subject', { length: 255 }),
  content: text('content').notNull(),
  variables: jsonb('variables').default([]),
  category: varchar('category', { length: 100 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Conversations table
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(),
  status: text('status').notNull().default('active'),
  agentType: text('agent_type').notNull(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  transcript: jsonb('transcript').default({}),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => {
  return {
    leadIdIdx: index('conversations_lead_id_idx').on(table.leadId),
    statusIdx: index('conversations_status_idx').on(table.status),
    channelIdx: index('conversations_channel_idx').on(table.channel),
    agentTypeIdx: index('conversations_agent_type_idx').on(table.agentType)
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

// Agent Templates table
export const agentTemplates = pgTable('agent_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  type: agentTypeEnum('type').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  
  // Core Configuration
  systemPrompt: text('system_prompt').notNull(),
  contextNote: text('context_note'),
  temperature: integer('temperature').default(7),
  maxTokens: integer('max_tokens').default(500),
  
  // Template-specific settings
  configurableParams: jsonb('configurable_params').default([]),
  defaultParams: jsonb('default_params').default({}),
  
  // Metadata
  metadata: jsonb('metadata').default({}),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Feature Flags table
export const featureFlags = pgTable('feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  enabled: boolean('enabled').notNull().default(false),
  rolloutPercentage: integer('rollout_percentage').notNull().default(0),
  category: varchar('category', { length: 100 }).notNull().default('system-config'),
  complexity: varchar('complexity', { length: 50 }).notNull().default('basic'),
  riskLevel: varchar('risk_level', { length: 50 }).notNull().default('low'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  users: many(users),
  campaigns: many(campaigns),
  leads: many(leads),
  agentConfigurations: many(agentConfigurations),
  apiKeys: many(clientApiKeys),
  templates: many(whiteLabelTemplates),
  domains: many(clientDomains)
}));

export const clientApiKeysRelations = relations(clientApiKeys, ({ one }) => ({
  client: one(clients, {
    fields: [clientApiKeys.clientId],
    references: [clients.id]
  })
}));

export const whiteLabelTemplatesRelations = relations(whiteLabelTemplates, ({ one }) => ({
  client: one(clients, {
    fields: [whiteLabelTemplates.clientId],
    references: [clients.id]
  })
}));

export const clientDomainsRelations = relations(clientDomains, ({ one }) => ({
  client: one(clients, {
    fields: [clientDomains.clientId],
    references: [clients.id]
  })
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  client: one(clients, {
    fields: [users.clientId],
    references: [clients.id]
  }),
  sessions: many(sessions)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id]
  }),
  client: one(clients, {
    fields: [sessions.clientId],
    references: [clients.id]
  })
}));

export const agentConfigurationsRelations = relations(agentConfigurations, ({ one, many }) => ({
  client: one(clients, {
    fields: [agentConfigurations.clientId],
    references: [clients.id]
  }),
  campaigns: many(campaigns)
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  client: one(clients, {
    fields: [campaigns.clientId],
    references: [clients.id]
  }),
  user: one(users, {
    fields: [campaigns.user_id],
    references: [users.id]
  }),
  agent: one(agentConfigurations, {
    fields: [campaigns.agentId],
    references: [agentConfigurations.id]
  }),
  leads: many(leads),
  enrollments: many(leadCampaignEnrollments)
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  client: one(clients, {
    fields: [leads.clientId],
    references: [clients.id]
  }),
  campaign: one(campaigns, {
    fields: [leads.campaign_id],
    references: [campaigns.id]
  }),
  enrollments: many(leadCampaignEnrollments),
  conversations: many(conversations)
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

export const conversationsRelations = relations(conversations, ({ one }) => ({
  lead: one(leads, {
    fields: [conversations.leadId],
    references: [leads.id]
  })
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

export const agentTemplatesRelations = relations(agentTemplates, () => ({
  // Agent templates don't have direct relations yet
}));

export const featureFlagsRelations = relations(featureFlags, () => ({
  // Feature flags are standalone entities
}));

export const templatesRelations = relations(templates, () => ({
  // Templates don't have client relations yet, keeping for future extension
}));

// Type exports
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type ClientApiKey = typeof clientApiKeys.$inferSelect;
export type NewClientApiKey = typeof clientApiKeys.$inferInsert;
export type WhiteLabelTemplate = typeof whiteLabelTemplates.$inferSelect;
export type NewWhiteLabelTemplate = typeof whiteLabelTemplates.$inferInsert;
export type ClientDomain = typeof clientDomains.$inferSelect;
export type NewClientDomain = typeof clientDomains.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadCampaignEnrollment = typeof leadCampaignEnrollments.$inferSelect;
export type NewLeadCampaignEnrollment = typeof leadCampaignEnrollments.$inferInsert;
export type AgentConfiguration = typeof agentConfigurations.$inferSelect;
export type NewAgentConfiguration = typeof agentConfigurations.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Communication = typeof communications.$inferSelect;
export type NewCommunication = typeof communications.$inferInsert;
export type AgentTemplate = typeof agentTemplates.$inferSelect;
export type NewAgentTemplate = typeof agentTemplates.$inferInsert;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;