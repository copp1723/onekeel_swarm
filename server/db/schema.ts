import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, varchar, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Essential enums for campaign wizard
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'converted', 'rejected']);
export const channelEnum = pgEnum('channel', ['email', 'sms', 'chat']);
export const campaignTypeEnum = pgEnum('campaign_type', ['drip', 'blast', 'trigger']);
export const agentTypeEnum = pgEnum('agent_type', ['email', 'sms', 'chat', 'voice']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Sessions table
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// Agent configurations for campaign wizard
export const agentConfigurations = pgTable('agent_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: agentTypeEnum('type').notNull(),
  active: boolean('active').default(true).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  temperature: integer('temperature').default(7),
  maxTokens: integer('max_tokens').default(500),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Enhanced campaigns table for wizard
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: campaignTypeEnum('type').default('drip').notNull(),
  status: text('status').notNull().default('draft'),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Campaign wizard fields
  goal: text('goal'),
  targetAudience: jsonb('target_audience').default({}),
  agentId: uuid('agent_id').references(() => agentConfigurations.id),
  offerDetails: jsonb('offer_details').default({}),
  emailSequence: jsonb('email_sequence').default([]),
  schedule: jsonb('schedule').default({}),
  settings: jsonb('settings').default({}),
  
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Enhanced leads table
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  first_name: varchar('first_name', { length: 255 }),
  last_name: varchar('last_name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  campaign_id: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
  status: leadStatusEnum('status').default('new').notNull(),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
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

// Relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
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
  campaign: one(campaigns, {
    fields: [leads.campaign_id],
    references: [campaigns.id]
  }),
  enrollments: many(leadCampaignEnrollments)
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

// Type exports
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
export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;