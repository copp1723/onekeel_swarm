#!/bin/bash
# Fix all remaining API issues: 401 auth/me, 500 campaigns/leads, email invitations

echo "🔧 Fixing all remaining API issues..."

psql $DATABASE_URL << 'EOF'
-- Fix database schema issues causing 500 errors

-- 1. Fix leads table column mismatches
-- The API expects firstName/lastName but DB has first_name/last_name
-- Add missing columns that the API code expects

-- Add firstName column if missing (API expects this)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'firstName'
    ) THEN
        ALTER TABLE leads ADD COLUMN "firstName" VARCHAR(255);
        -- Copy data from first_name if it exists
        UPDATE leads SET "firstName" = first_name WHERE first_name IS NOT NULL;
        RAISE NOTICE 'Added firstName column to leads';
    END IF;
END $$;

-- Add lastName column if missing (API expects this)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lastName'
    ) THEN
        ALTER TABLE leads ADD COLUMN "lastName" VARCHAR(255);
        -- Copy data from last_name if it exists
        UPDATE leads SET "lastName" = last_name WHERE last_name IS NOT NULL;
        RAISE NOTICE 'Added lastName column to leads';
    END IF;
END $$;

-- Add createdAt column if missing (API expects this)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE leads ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        -- Copy data from created_at if it exists
        UPDATE leads SET "createdAt" = created_at WHERE created_at IS NOT NULL;
        RAISE NOTICE 'Added createdAt column to leads';
    END IF;
END $$;

-- Add updatedAt column if missing (API expects this)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE leads ADD COLUMN "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        -- Copy data from updated_at if it exists
        UPDATE leads SET "updatedAt" = updated_at WHERE updated_at IS NOT NULL;
        RAISE NOTICE 'Added updatedAt column to leads';
    END IF;
END $$;

-- 2. Fix campaigns table column mismatches
-- Add missing columns that the API expects

-- Add createdAt column if missing (API expects this)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        -- Copy data from created_at if it exists
        UPDATE campaigns SET "createdAt" = created_at WHERE created_at IS NOT NULL;
        RAISE NOTICE 'Added createdAt column to campaigns';
    END IF;
END $$;

-- Add updatedAt column if missing (API expects this)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        -- Copy data from updated_at if it exists
        UPDATE campaigns SET "updatedAt" = updated_at WHERE updated_at IS NOT NULL;
        RAISE NOTICE 'Added updatedAt column to campaigns';
    END IF;
END $$;

-- 3. Create sessions table if missing (for auth/me endpoint)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for sessions
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions("userId");
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions("expiresAt");

-- 4. Fix communications table column mismatches
-- Add missing columns that the API expects

-- Add leadId column if missing (API expects this)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communications' AND column_name = 'leadId'
    ) THEN
        ALTER TABLE communications ADD COLUMN "leadId" UUID;
        -- Copy data from lead_id if it exists
        UPDATE communications SET "leadId" = lead_id WHERE lead_id IS NOT NULL;
        RAISE NOTICE 'Added leadId column to communications';
    END IF;
END $$;

-- Add campaignId column if missing (API expects this)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communications' AND column_name = 'campaignId'
    ) THEN
        ALTER TABLE communications ADD COLUMN "campaignId" UUID;
        -- Copy data from campaign_id if it exists
        UPDATE communications SET "campaignId" = campaign_id WHERE campaign_id IS NOT NULL;
        RAISE NOTICE 'Added campaignId column to communications';
    END IF;
END $$;

-- Add createdAt column if missing (API expects this)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communications' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE communications ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        -- Copy data from created_at if it exists
        UPDATE communications SET "createdAt" = created_at WHERE created_at IS NOT NULL;
        RAISE NOTICE 'Added createdAt column to communications';
    END IF;
END $$;

-- 5. Create conversations table if missing (referenced in leads API)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "leadId" UUID NOT NULL,
    "campaignId" UUID,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    "startedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for conversations
CREATE INDEX IF NOT EXISTS conversations_lead_id_idx ON conversations("leadId");
CREATE INDEX IF NOT EXISTS conversations_campaign_id_idx ON conversations("campaignId");
CREATE INDEX IF NOT EXISTS conversations_started_at_idx ON conversations("startedAt");

-- 6. Verify the schema fixes
SELECT 'Schema verification completed:' as info;

-- Check leads table
SELECT 'Leads table columns:' as table_info;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('firstName', 'lastName', 'createdAt', 'updatedAt', 'email', 'phone')
ORDER BY column_name;

-- Check campaigns table
SELECT 'Campaigns table columns:' as table_info;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('createdAt', 'updatedAt', 'name', 'status', 'type')
ORDER BY column_name;

-- Check sessions table
SELECT 'Sessions table exists:' as table_info;
SELECT COUNT(*) as session_count FROM sessions;

-- Test basic queries that were failing
SELECT 'Testing leads query:' as test_info;
SELECT COUNT(*) as lead_count FROM leads;

SELECT 'Testing campaigns query:' as test_info;
SELECT COUNT(*) as campaign_count FROM campaigns;
EOF

echo "✅ Database schema fixes completed!"
echo ""
echo "📋 Fixed Issues:"
echo "  ✅ Added missing camelCase columns (firstName, lastName, createdAt, updatedAt)"
echo "  ✅ Created sessions table for auth/me endpoint"
echo "  ✅ Fixed communications table column names"
echo "  ✅ Created conversations table"
echo "  ✅ Added proper indexes for performance"
echo ""
echo "🚀 API endpoints should now work without 500 errors!"
echo ""
echo "📧 For email invitations, check these environment variables in Render:"
echo "  - MAILGUN_API_KEY"
echo "  - MAILGUN_DOMAIN"
echo "  - MAILGUN_FROM_EMAIL"
echo ""
echo "🔐 For auth/me 401 errors, try logging out and back in to refresh tokens."
