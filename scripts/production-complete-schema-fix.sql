-- Complete Production Database Schema Fix
-- Generated: 2025-07-24
-- This script adds all missing tables and columns to match the application schema

-- 1. Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT FALSE NOT NULL,
  rollout_percentage INTEGER DEFAULT 0 NOT NULL,
  user_roles JSONB DEFAULT '["admin"]'::jsonb,
  environments JSONB DEFAULT '["development"]'::jsonb,
  conditions JSONB DEFAULT '{}'::jsonb,
  category VARCHAR(50) DEFAULT 'experimental' NOT NULL,
  complexity VARCHAR(50) DEFAULT 'basic' NOT NULL,
  risk_level VARCHAR(50) DEFAULT 'low' NOT NULL,
  created_by UUID,
  last_modified_by UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Create templates table (email templates)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  data JSONB NOT NULL,
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0 NOT NULL,
  max_attempts INTEGER DEFAULT 3 NOT NULL,
  scheduled_for TIMESTAMP DEFAULT NOW() NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  campaign_id UUID REFERENCES campaigns(id),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number VARCHAR(50) NOT NULL,
  to_number VARCHAR(50) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  external_id VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 5. Create feature_flag_evaluations table
CREATE TABLE IF NOT EXISTS feature_flag_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  evaluation_result BOOLEAN NOT NULL,
  evaluation_reason VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 6. Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id),
  permissions JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 7. Create drizzle_migrations table for tracking migrations
CREATE TABLE IF NOT EXISTS drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 8. Add missing columns to existing tables
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS context_note TEXT;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_for ON jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_id ON whatsapp_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_user_id ON feature_flag_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- 10. Insert default feature flags
INSERT INTO feature_flags (key, name, description, enabled) VALUES
('ui.new-navigation', 'New Navigation', 'New navigation UI', false),
('ui.contacts-terminology', 'Contacts Terminology', 'Use Contacts instead of Leads', false),
('ui.enhanced-dashboard', 'Enhanced Dashboard', 'Enhanced dashboard features', false),
('agents.parallel-processing', 'Parallel Agent Processing', 'Enable parallel processing for agents', false),
('campaigns.auto-scheduling', 'Campaign Auto-Scheduling', 'Automatic campaign scheduling based on performance', false)
ON CONFLICT (key) DO NOTHING;

-- 11. Verify all changes
SELECT 
  'Tables Created:' as status,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('feature_flags', 'templates', 'jobs', 'whatsapp_messages', 'feature_flag_evaluations', 'api_keys', 'drizzle_migrations')

UNION ALL

SELECT 
  'Columns Added:' as status,
  COUNT(*) as count
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
  (table_name = 'campaigns' AND column_name = 'description') OR
  (table_name = 'agent_configurations' AND column_name = 'context_note')
)

UNION ALL

SELECT 
  'Feature Flags:' as status,
  COUNT(*) as count
FROM feature_flags;