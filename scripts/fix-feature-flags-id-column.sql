-- Fix Feature Flags ID Column Issue
-- This script handles all possible scenarios for the missing id column error

-- Start transaction
BEGIN;

-- Step 1: Check current state and fix accordingly
DO $$
DECLARE
    has_table BOOLEAN;
    has_id_column BOOLEAN;
    has_data BOOLEAN;
BEGIN
    -- Check if feature_flags table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'feature_flags'
    ) INTO has_table;
    
    IF has_table THEN
        -- Check if id column exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'feature_flags' 
            AND column_name = 'id'
        ) INTO has_id_column;
        
        -- Check if table has data
        SELECT EXISTS (
            SELECT 1 FROM feature_flags LIMIT 1
        ) INTO has_data;
        
        RAISE NOTICE 'Table exists: %, Has ID column: %, Has data: %', has_table, has_id_column, has_data;
        
        IF NOT has_id_column THEN
            -- Critical issue: table exists without id column
            IF has_data THEN
                -- Backup existing data
                CREATE TEMP TABLE feature_flags_backup AS SELECT * FROM feature_flags;
                RAISE NOTICE 'Backed up existing data to temp table';
            END IF;
            
            -- Drop the malformed table
            DROP TABLE IF EXISTS feature_flag_user_overrides CASCADE;
            DROP TABLE IF EXISTS feature_flags CASCADE;
            RAISE NOTICE 'Dropped malformed tables';
        END IF;
    END IF;
END $$;

-- Step 2: Ensure enums exist
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

-- Step 3: Create feature_flags table with proper structure
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

-- Step 4: Create feature_flag_user_overrides table
CREATE TABLE IF NOT EXISTS feature_flag_user_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    enabled BOOLEAN NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP
);

-- Step 5: Restore data if we had to backup
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags_backup') THEN
        -- Insert data back, mapping columns carefully
        INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, user_roles, environments, category, complexity, risk_level, created_at, updated_at)
        SELECT 
            key, 
            name, 
            description, 
            COALESCE(enabled, FALSE),
            COALESCE(rollout_percentage, 0),
            COALESCE(user_roles, '["admin"]'::jsonb),
            COALESCE(environments, '["development"]'::jsonb),
            COALESCE(category::text::feature_flag_category, 'experimental'),
            COALESCE(complexity::text::complexity, 'basic'),
            COALESCE(risk_level::text::risk_level, 'low'),
            COALESCE(created_at, NOW()),
            COALESCE(updated_at, NOW())
        FROM feature_flags_backup
        ON CONFLICT (key) DO NOTHING;
        
        DROP TABLE feature_flags_backup;
        RAISE NOTICE 'Restored data from backup';
    END IF;
END $$;

-- Step 6: Insert essential feature flags
INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, user_roles, environments, category, complexity, risk_level) 
VALUES
    ('ui.new-navigation', 'New 3-Tab Navigation', 'Enable the new consolidated 3-tab navigation structure', TRUE, 100, '["admin", "manager", "agent", "viewer"]', '["development", "staging", "production"]', 'ui-progressive', 'basic', 'low'),
    ('ui.contacts-terminology', 'Contacts Terminology', 'Show "Contacts" instead of "Leads" in the UI', TRUE, 100, '["admin", "manager", "agent", "viewer"]', '["development", "staging", "production"]', 'ui-progressive', 'basic', 'low'),
    ('ui.enhanced-dashboard', 'Enhanced Dashboard Cards', 'Enable enhanced dashboard with performance metrics cards', TRUE, 100, '["admin", "manager", "agent", "viewer"]', '["development", "staging", "production"]', 'ui-progressive', 'basic', 'low'),
    ('campaign.ai-enhancement', 'AI Campaign Enhancement', 'AI-powered campaign description and goal enhancement', TRUE, 100, '["admin", "manager"]', '["development", "staging", "production"]', 'campaign-advanced', 'intermediate', 'low'),
    ('system.monitoring-advanced', 'Advanced System Monitoring', 'Advanced monitoring and alerting capabilities', TRUE, 100, '["admin", "manager"]', '["development", "staging", "production"]', 'system-config', 'intermediate', 'low'),
    ('role.admin-only', 'Admin Only Features', 'Features that are only accessible to administrators', TRUE, 100, '["admin"]', '["development", "staging", "production"]', 'ui-progressive', 'basic', 'low'),
    ('role.manager-access', 'Manager Level Access', 'Features available to managers and above', TRUE, 100, '["admin", "manager"]', '["development", "staging", "production"]', 'ui-progressive', 'basic', 'low')
ON CONFLICT (key) DO UPDATE
SET 
    enabled = EXCLUDED.enabled,
    rollout_percentage = EXCLUDED.rollout_percentage,
    environments = EXCLUDED.environments,
    user_roles = EXCLUDED.user_roles,
    updated_at = NOW();

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS feature_flags_key_idx ON feature_flags(key);
CREATE INDEX IF NOT EXISTS feature_flags_category_idx ON feature_flags(category);
CREATE INDEX IF NOT EXISTS feature_flags_enabled_idx ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS feature_flags_created_at_idx ON feature_flags(created_at);
CREATE INDEX IF NOT EXISTS feature_flag_user_overrides_flag_user_idx ON feature_flag_user_overrides(flag_id, user_id);

-- Step 8: Verify the fix
DO $$
DECLARE
    id_exists BOOLEAN;
    flag_count INTEGER;
BEGIN
    -- Check if id column now exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'feature_flags' 
        AND column_name = 'id'
    ) INTO id_exists;
    
    -- Count flags
    SELECT COUNT(*) FROM feature_flags INTO flag_count;
    
    IF NOT id_exists THEN
        RAISE EXCEPTION 'ID column still missing after fix attempt';
    END IF;
    
    RAISE NOTICE 'Fix completed successfully. ID column exists: %, Total flags: %', id_exists, flag_count;
END $$;

-- Final verification query
SELECT 
    'Table Structure' as check_type,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'feature_flags'
ORDER BY ordinal_position;

-- Show current flags
SELECT 'Current Feature Flags' as info;
SELECT id, key, name, enabled, rollout_percentage, environments
FROM feature_flags
WHERE key IN ('ui.contacts-terminology', 'ui.new-navigation', 'ui.enhanced-dashboard')
ORDER BY key;

COMMIT;

-- Additional diagnostic info
SELECT 
    'Diagnostics' as info,
    (SELECT COUNT(*) FROM feature_flags) as total_flags,
    (SELECT COUNT(*) FROM feature_flags WHERE enabled = true) as enabled_flags,
    (SELECT COUNT(*) FROM feature_flag_user_overrides) as user_overrides;