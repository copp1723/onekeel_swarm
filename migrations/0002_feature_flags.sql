-- Migration: Feature Flags System
-- Description: Add feature flag tables for controlling feature visibility

-- Create feature flag category enum
CREATE TYPE feature_flag_category AS ENUM (
  'agent-tuning', 
  'campaign-advanced', 
  'system-config', 
  'integrations', 
  'ui-progressive', 
  'debugging', 
  'experimental'
);

-- Create complexity enum
CREATE TYPE complexity AS ENUM ('basic', 'intermediate', 'advanced');

-- Create risk level enum
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');

-- Create environment enum
CREATE TYPE environment AS ENUM ('development', 'staging', 'production');

-- Create feature_flags table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Flag identification
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Flag configuration
  enabled BOOLEAN DEFAULT FALSE NOT NULL,
  rollout_percentage INTEGER DEFAULT 0 NOT NULL CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  
  -- Targeting (JSON arrays)
  user_roles JSONB DEFAULT '["admin"]'::jsonb,
  environments JSONB DEFAULT '["development"]'::jsonb,
  conditions JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  category feature_flag_category DEFAULT 'experimental' NOT NULL,
  complexity complexity DEFAULT 'basic' NOT NULL,
  risk_level risk_level DEFAULT 'low' NOT NULL,
  
  -- Audit trail
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create feature_flag_user_overrides table
CREATE TABLE feature_flag_user_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Override configuration
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX feature_flags_key_idx ON feature_flags(key);
CREATE INDEX feature_flags_category_idx ON feature_flags(category);
CREATE INDEX feature_flags_enabled_idx ON feature_flags(enabled);
CREATE INDEX feature_flags_created_at_idx ON feature_flags(created_at);

CREATE INDEX feature_flag_user_overrides_flag_user_idx ON feature_flag_user_overrides(flag_id, user_id);

-- Insert default feature flags
INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, user_roles, environments, category, complexity, risk_level) VALUES
-- UI Progressive Disclosure
('ui.new-navigation', 'New 3-Tab Navigation', 'Enable the new consolidated 3-tab navigation structure', FALSE, 0, '["admin"]', '["development", "staging"]', 'ui-progressive', 'basic', 'low'),
('ui.contacts-terminology', 'Contacts Terminology', 'Show "Contacts" instead of "Leads" in the UI', FALSE, 0, '["admin"]', '["development", "staging"]', 'ui-progressive', 'basic', 'low'),
('ui.enhanced-dashboard', 'Enhanced Dashboard Cards', 'Enable enhanced dashboard with performance metrics cards', FALSE, 0, '["admin", "manager"]', '["development", "staging"]', 'ui-progressive', 'basic', 'low'),

-- Agent Advanced Settings
('agent.advanced-temperature', 'Advanced AI Temperature Control', 'Show temperature slider and advanced AI model parameters', FALSE, 0, '["admin"]', '["development"]', 'agent-tuning', 'advanced', 'high'),
('agent.custom-models', 'Custom Model Selection', 'Allow selection of specific AI models (GPT-4, Claude variants)', FALSE, 0, '["admin"]', '["development"]', 'agent-tuning', 'advanced', 'medium'),
('agent.debug-mode', 'Agent Debug Mode', 'Show detailed AI response logging and debugging options', FALSE, 0, '["admin"]', '["development"]', 'debugging', 'advanced', 'medium'),
('agent.working-hours', 'Advanced Working Hours', 'Complex working hours and handover configuration', FALSE, 0, '["admin", "manager"]', '["development", "staging"]', 'agent-tuning', 'intermediate', 'medium'),

-- Campaign Advanced Features
('campaign.ai-enhancement', 'AI Campaign Enhancement', 'AI-powered campaign description and goal enhancement', TRUE, 50, '["admin", "manager"]', '["development", "staging", "production"]', 'campaign-advanced', 'intermediate', 'low'),
('campaign.advanced-scheduling', 'Advanced Campaign Scheduling', 'Complex multi-timezone scheduling and optimization', FALSE, 0, '["admin"]', '["development"]', 'campaign-advanced', 'advanced', 'medium'),
('campaign.ab-testing', 'Campaign A/B Testing', 'A/B testing framework for campaigns', FALSE, 0, '["admin"]', '["development"]', 'campaign-advanced', 'advanced', 'medium'),

-- System Configuration
('system.database-tuning', 'Database Performance Tuning', 'Database connection pooling and performance settings', FALSE, 0, '["admin"]', '["development"]', 'system-config', 'advanced', 'high'),
('system.external-apis', 'External API Configuration', 'Direct configuration of Mailgun, Twilio, OpenAI settings', FALSE, 0, '["admin"]', '["development"]', 'system-config', 'advanced', 'high'),
('system.monitoring-advanced', 'Advanced System Monitoring', 'Advanced monitoring and alerting capabilities', TRUE, 100, '["admin", "manager"]', '["development", "staging", "production"]', 'system-config', 'intermediate', 'low'),

-- Integration Features
('integration.webhooks', 'Webhook Configuration', 'Advanced webhook and integration configuration', FALSE, 0, '["admin"]', '["development"]', 'integrations', 'advanced', 'medium'),
('integration.custom-fields', 'Custom Field Mapping', 'Custom field mapping for external integrations', FALSE, 0, '["admin", "manager"]', '["development", "staging"]', 'integrations', 'intermediate', 'low'),

-- Role-Based Access
('role.admin-only', 'Admin Only Features', 'Features that are only accessible to administrators', TRUE, 100, '["admin"]', '["development", "staging", "production"]', 'ui-progressive', 'basic', 'low'),
('role.manager-access', 'Manager Level Access', 'Features available to managers and above', TRUE, 100, '["admin", "manager"]', '["development", "staging", "production"]', 'ui-progressive', 'basic', 'low'),

-- Experimental Features
('experimental.new-ui-components', 'New UI Components', 'Experimental UI components and layouts', FALSE, 0, '["admin"]', '["development"]', 'experimental', 'intermediate', 'low'),
('experimental.ai-insights', 'AI-Powered Insights', 'Experimental AI-powered analytics and insights', FALSE, 0, '["admin"]', '["development"]', 'experimental', 'advanced', 'medium');

-- Add comment to migration
COMMENT ON TABLE feature_flags IS 'Feature flags for controlling feature visibility and rollouts';
COMMENT ON TABLE feature_flag_user_overrides IS 'User-specific feature flag overrides';