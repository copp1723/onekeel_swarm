-- Fix for Feature Flags Deployment Error
-- This script ensures the feature_flags table exists with the correct structure

-- First, check if the feature_flags table exists
DO $$ 
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags') THEN
    -- Create the enums if they don't exist
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

    -- Create the feature_flags table
    CREATE TABLE feature_flags (
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

    -- Create indexes
    CREATE INDEX feature_flags_key_idx ON feature_flags(key);
    CREATE INDEX feature_flags_category_idx ON feature_flags(category);
    CREATE INDEX feature_flags_enabled_idx ON feature_flags(enabled);
    CREATE INDEX feature_flags_created_at_idx ON feature_flags(created_at);

    -- Insert the default feature flags
    INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, user_roles, environments, category, complexity, risk_level) VALUES
    ('ui.new-navigation', 'New 3-Tab Navigation', 'Enable the new consolidated 3-tab navigation structure', FALSE, 0, '["admin"]', '["development", "staging"]', 'ui-progressive', 'basic', 'low'),
    ('ui.contacts-terminology', 'Contacts Terminology', 'Show "Contacts" instead of "Leads" in the UI', FALSE, 0, '["admin"]', '["development", "staging"]', 'ui-progressive', 'basic', 'low')
    ON CONFLICT (key) DO NOTHING;

    RAISE NOTICE 'Created feature_flags table';
  ELSE
    -- Table exists, check if it has an id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feature_flags' AND column_name = 'id') THEN
      -- This is a serious issue - the table exists but doesn't have an id column
      RAISE EXCEPTION 'feature_flags table exists but is missing the id column. Manual intervention required.';
    ELSE
      RAISE NOTICE 'feature_flags table already exists with id column';
    END IF;
  END IF;

  -- Check if feature_flag_user_overrides table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flag_user_overrides') THEN
    CREATE TABLE feature_flag_user_overrides (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      enabled BOOLEAN NOT NULL,
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      expires_at TIMESTAMP
    );

    CREATE INDEX feature_flag_user_overrides_flag_user_idx ON feature_flag_user_overrides(flag_id, user_id);
    
    RAISE NOTICE 'Created feature_flag_user_overrides table';
  END IF;
END $$;

-- Verify the fix
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags') as has_feature_flags_table,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'feature_flags' AND column_name = 'id') as has_id_column,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flag_user_overrides') as has_overrides_table;

-- Show current feature flags
SELECT 'Current feature flags:' as info;
SELECT key, name, enabled, rollout_percentage FROM feature_flags WHERE key IN ('ui.contacts-terminology', 'ui.new-navigation');