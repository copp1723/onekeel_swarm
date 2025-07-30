-- Rollback Migration 003: Remove indexes that were created
-- This rollback script undoes the changes from 003-create-indexes.sql

-- Remove all additional indexes created for performance optimization
-- Note: Only remove indexes that were actually created by migration 003

-- Remove additional indexes for feature_flags table
DROP INDEX IF EXISTS idx_feature_flags_enabled_category;
DROP INDEX IF EXISTS idx_feature_flags_environment;

-- Remove additional indexes for agent_templates table
DROP INDEX IF EXISTS idx_agent_templates_category;
DROP INDEX IF EXISTS idx_agent_templates_type;

-- Remove additional indexes for agent_configurations table
DROP INDEX IF EXISTS idx_agent_configurations_type_active;
DROP INDEX IF EXISTS idx_agent_configurations_name;

-- Remove additional indexes for templates table
DROP INDEX IF EXISTS idx_templates_channel_active;
DROP INDEX IF EXISTS idx_templates_category;

-- Remove additional indexes for users table
DROP INDEX IF EXISTS idx_users_role_active;
DROP INDEX IF EXISTS idx_users_email_active;

-- Remove additional indexes for conversations table
DROP INDEX IF EXISTS idx_conversations_lead_channel;
DROP INDEX IF EXISTS idx_conversations_status_updated;

-- Remove additional indexes for communications table
DROP INDEX IF EXISTS idx_communications_status_channel;
DROP INDEX IF EXISTS idx_communications_created_status;

-- Remove additional indexes for campaigns table
DROP INDEX IF EXISTS idx_campaigns_active;
DROP INDEX IF EXISTS idx_campaigns_type;

-- Remove additional indexes for leads table
DROP INDEX IF EXISTS idx_leads_name;
DROP INDEX IF EXISTS idx_leads_status_created;

-- Note: Core indexes that were part of the original schema are NOT removed
-- Only the additional performance indexes added by migration 003 are removed
