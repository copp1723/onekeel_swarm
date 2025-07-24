-- Migration: Fix Deployment Schema Issues
-- Description: Fix missing tables and columns identified during deployment

-- 1. Create feature_flags table if it doesn't exist
DO $$ 
BEGIN
  -- Create enums if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feature_flag_category') THEN
    CREATE TYPE feature_flag_category AS ENUM (
      'agent-tuning', 
      'campaign-advanced', 
      'system-config', 
      'integrations', 
      'ui-progressive', 
      'debugging', 
      'experimental'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complexity') THEN
    CREATE TYPE complexity AS ENUM ('basic', 'intermediate', 'advanced');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
    CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'environment') THEN
    CREATE TYPE environment AS ENUM ('development', 'staging', 'production');
  END IF;
END $$;

-- Create feature_flags table if it doesn't exist
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT FALSE NOT NULL,
  rollout_percentage INTEGER DEFAULT 0 NOT NULL CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  user_roles JSONB DEFAULT '["admin"]'::jsonb,
  environments JSONB DEFAULT '["development"]'::jsonb,
  conditions JSONB DEFAULT '{}'::jsonb,
  category feature_flag_category DEFAULT 'experimental' NOT NULL,
  complexity complexity DEFAULT 'basic' NOT NULL,
  risk_level risk_level DEFAULT 'low' NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create feature_flag_user_overrides table if it doesn't exist
CREATE TABLE IF NOT EXISTS feature_flag_user_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP
);

-- 2. Add missing description column to campaigns table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' AND column_name = 'description'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN description TEXT;
  END IF;
END $$;

-- 3. Add missing context_note column to agents table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'context_note'
  ) THEN
    ALTER TABLE agents ADD COLUMN context_note TEXT;
  END IF;
END $$;

-- 4. Insert default feature flags if they don't exist
INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, user_roles, environments, category, complexity, risk_level) 
VALUES
  ('ui.new-navigation', 'New 3-Tab Navigation', 'Enable the new consolidated 3-tab navigation structure', FALSE, 0, '["admin"]', '["development", "staging"]', 'ui-progressive', 'basic', 'low'),
  ('ui.contacts-terminology', 'Contacts Terminology', 'Show "Contacts" instead of "Leads" in the UI', FALSE, 0, '["admin"]', '["development", "staging"]', 'ui-progressive', 'basic', 'low'),
  ('ui.enhanced-dashboard', 'Enhanced Dashboard Cards', 'Enable enhanced dashboard with performance metrics cards', FALSE, 0, '["admin", "manager"]', '["development", "staging"]', 'ui-progressive', 'basic', 'low')
ON CONFLICT (key) DO NOTHING;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS feature_flags_key_idx ON feature_flags(key);
CREATE INDEX IF NOT EXISTS feature_flags_category_idx ON feature_flags(category);
CREATE INDEX IF NOT EXISTS feature_flags_enabled_idx ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS feature_flags_created_at_idx ON feature_flags(created_at);
CREATE INDEX IF NOT EXISTS feature_flag_user_overrides_flag_user_idx ON feature_flag_user_overrides(flag_id, user_id);

-- Add comments
COMMENT ON TABLE feature_flags IS 'Feature flags for controlling feature visibility and rollouts';
COMMENT ON TABLE feature_flag_user_overrides IS 'User-specific feature flag overrides';
COMMENT ON COLUMN campaigns.description IS 'Campaign description text';
COMMENT ON COLUMN agents.context_note IS 'Additional context note for the agent';