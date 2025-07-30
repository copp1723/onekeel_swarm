-- Migration 003: Create additional indexes for performance optimization
-- This migration adds indexes to improve query performance on frequently accessed columns

-- Ensure all recommended indexes exist
-- Note: Some indexes may already exist from previous migrations or table creation

-- Create additional indexes for leads table
CREATE INDEX IF NOT EXISTS idx_leads_name ON leads(name);
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at);

-- Create additional indexes for campaigns table
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(active);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);

-- Create additional indexes for communications table
CREATE INDEX IF NOT EXISTS idx_communications_status_channel ON communications(status, channel);
CREATE INDEX IF NOT EXISTS idx_communications_created_status ON communications(created_at, status);

-- Create additional indexes for conversations table
CREATE INDEX IF NOT EXISTS idx_conversations_lead_channel ON conversations(lead_id, channel);
CREATE INDEX IF NOT EXISTS idx_conversations_status_updated ON conversations(status, last_message_at);

-- Create additional indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, active);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, active);

-- Create additional indexes for templates table
CREATE INDEX IF NOT EXISTS idx_templates_channel_active ON templates(channel, active);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

-- Create additional indexes for agent_configurations table
CREATE INDEX IF NOT EXISTS idx_agent_configurations_type_active ON agent_configurations(type, active);
CREATE INDEX IF NOT EXISTS idx_agent_configurations_name ON agent_configurations(name);

-- Create additional indexes for agent_templates table
CREATE INDEX IF NOT EXISTS idx_agent_templates_category ON agent_templates(category);
CREATE INDEX IF NOT EXISTS idx_agent_templates_type ON agent_templates(type);

-- Create additional indexes for feature_flags table
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled_category ON feature_flags(enabled, category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON feature_flags(environments);

-- Verify index creation
-- This section can be used to verify that indexes were created successfully
/*
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM 
  pg_indexes 
WHERE 
  schemaname = 'public' 
  AND tablename IN (
    'leads', 'campaigns', 'communications', 'conversations', 
    'users', 'templates', 'agent_configurations', 'agent_templates',
    'feature_flags'
  )
ORDER BY 
  tablename, indexname;
*/