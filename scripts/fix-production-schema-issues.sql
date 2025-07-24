-- Fix production database schema issues
-- Run this in Render shell: psql $DATABASE_URL < scripts/fix-production-schema-issues.sql

-- Create feature_flag_user_overrides table if it doesn't exist
CREATE TABLE IF NOT EXISTS feature_flag_user_overrides (
    user_id TEXT NOT NULL,
    flag_key TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, flag_key)
);

-- Add api_endpoint column to agent_configurations if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_configurations' 
        AND column_name = 'api_endpoint'
    ) THEN
        ALTER TABLE agent_configurations 
        ADD COLUMN api_endpoint TEXT;
    END IF;
END $$;

-- Add api_model column to agent_configurations if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_configurations' 
        AND column_name = 'api_model'
    ) THEN
        ALTER TABLE agent_configurations 
        ADD COLUMN api_model TEXT DEFAULT 'gpt-4';
    END IF;
END $$;

-- Add temperature column to agent_configurations if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_configurations' 
        AND column_name = 'temperature'
    ) THEN
        ALTER TABLE agent_configurations 
        ADD COLUMN temperature NUMERIC(3,2) DEFAULT 0.7;
    END IF;
END $$;

-- Add max_tokens column to agent_configurations if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_configurations' 
        AND column_name = 'max_tokens'
    ) THEN
        ALTER TABLE agent_configurations 
        ADD COLUMN max_tokens INTEGER DEFAULT 500;
    END IF;
END $$;

-- Update existing feature flags to be enabled by default
UPDATE feature_flags 
SET enabled = true 
WHERE key IN ('ui.new-navigation', 'ui.enhanced-dashboard', 'ui.contacts-terminology')
AND enabled = false;

-- Insert default feature flags if they don't exist
INSERT INTO feature_flags (key, name, description, enabled, created_at, updated_at)
VALUES 
    ('ui.new-navigation', 'New Navigation UI', 'Enable the modern navigation interface', true, NOW(), NOW()),
    ('ui.enhanced-dashboard', 'Enhanced Dashboard', 'Enable the enhanced dashboard with advanced metrics', true, NOW(), NOW()),
    ('ui.contacts-terminology', 'Contacts Terminology', 'Use "Contacts" instead of "Leads" in the UI', true, NOW(), NOW())
ON CONFLICT (key) DO UPDATE 
SET enabled = true, updated_at = NOW();

-- Grant permissions if needed
GRANT ALL ON feature_flag_user_overrides TO ccl_3_user;

-- Verify the fixes
SELECT 'Feature flags enabled:' as info;
SELECT key, name, enabled FROM feature_flags WHERE key LIKE 'ui.%';

SELECT 'Agent configurations columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_configurations' 
AND column_name IN ('api_endpoint', 'api_model', 'temperature', 'max_tokens')
ORDER BY column_name;