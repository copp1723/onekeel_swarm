#!/bin/bash

# Quick Feature Flags Fix Script
# This script provides a quick fix for the missing ID column in feature_flags table

echo "🔧 Quick Feature Flags Fix"
echo "========================="
echo ""

# Check if we have database URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable not set"
    echo "Please set your database URL and try again"
    exit 1
fi

echo "📊 Checking database state..."

# Create a minimal fix SQL that handles the most common case
cat > /tmp/quick-feature-flags-fix.sql << 'EOF'
-- Quick fix for feature flags ID column issue
BEGIN;

-- Drop and recreate the table if it exists without ID column
DO $$
BEGIN
    -- Check if table exists and if it has id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feature_flags' AND column_name = 'id') THEN
        -- Table exists but no ID column - drop it
        DROP TABLE IF EXISTS feature_flag_user_overrides CASCADE;
        DROP TABLE IF EXISTS feature_flags CASCADE;
        RAISE NOTICE 'Dropped malformed feature_flags table';
    END IF;
END $$;

-- Ensure enums exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feature_flag_category') THEN
        CREATE TYPE feature_flag_category AS ENUM ('agent-tuning', 'campaign-advanced', 'system-config', 'integrations', 'ui-progressive', 'debugging', 'experimental');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complexity') THEN
        CREATE TYPE complexity AS ENUM ('basic', 'intermediate', 'advanced');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
        CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
    END IF;
END $$;

-- Create the table with proper structure
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT FALSE NOT NULL,
    rollout_percentage INTEGER DEFAULT 0,
    user_roles JSONB DEFAULT '["admin"]'::jsonb,
    environments JSONB DEFAULT '["development", "staging", "production"]'::jsonb,
    conditions JSONB DEFAULT '{}'::jsonb,
    category VARCHAR(50) DEFAULT 'experimental',
    complexity VARCHAR(20) DEFAULT 'basic',
    risk_level VARCHAR(20) DEFAULT 'low',
    created_by UUID,
    last_modified_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert critical feature flags
INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, environments) VALUES
('ui.contacts-terminology', 'Contacts Terminology', 'Use Contacts instead of Leads', true, 100, '["development", "staging", "production"]'::jsonb),
('ui.new-navigation', 'New Navigation', 'New navigation UI', true, 100, '["development", "staging", "production"]'::jsonb),
('ui.enhanced-dashboard', 'Enhanced Dashboard', 'Enhanced dashboard features', true, 100, '["development", "staging", "production"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET
    enabled = true,
    rollout_percentage = 100,
    environments = '["development", "staging", "production"]'::jsonb;

-- Verify the fix
SELECT 'Feature flags fixed. Current flags:' as status;
SELECT id, key, enabled FROM feature_flags WHERE key LIKE 'ui.%';

COMMIT;
EOF

echo "🚀 Applying fix to database..."

# Apply the fix
psql "$DATABASE_URL" -f /tmp/quick-feature-flags-fix.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Fix applied successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Restart your application server"
    echo "2. The feature flag errors should be resolved"
    echo ""
else
    echo ""
    echo "❌ Error applying fix. Please check the output above."
    exit 1
fi

# Clean up
rm -f /tmp/quick-feature-flags-fix.sql

echo "🎉 Done!"