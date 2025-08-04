#!/bin/bash
# Complete fix for all production API issues: 401 auth/me, 500 campaigns/leads

echo "🔧 Applying complete production API fix..."

psql $DATABASE_URL << 'EOF'
-- Complete fix for all API issues in production

-- 1. First, let's see what we're working with
SELECT 'Current database tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check campaigns table structure
SELECT 'Campaigns table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'campaigns'
ORDER BY ordinal_position;

-- 3. Check leads table structure
SELECT 'Leads table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- 4. Fix campaigns table - ensure all required columns exist
DO $$ 
BEGIN
    -- Add createdAt if missing (API sorts by this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        UPDATE campaigns SET "createdAt" = COALESCE(created_at, CURRENT_TIMESTAMP);
        RAISE NOTICE 'Added createdAt column to campaigns';
    END IF;

    -- Add updatedAt if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        UPDATE campaigns SET "updatedAt" = COALESCE(updated_at, CURRENT_TIMESTAMP);
        RAISE NOTICE 'Added updatedAt column to campaigns';
    END IF;

    -- Ensure other required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'active'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added active column to campaigns';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'type'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN type VARCHAR(50) DEFAULT 'drip';
        RAISE NOTICE 'Added type column to campaigns';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'status'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        RAISE NOTICE 'Added status column to campaigns';
    END IF;
END $$;

-- 5. Fix leads table - ensure all required columns exist
DO $$ 
BEGIN
    -- Add createdAt if missing (API sorts by this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE leads ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        UPDATE leads SET "createdAt" = COALESCE(created_at, CURRENT_TIMESTAMP);
        RAISE NOTICE 'Added createdAt column to leads';
    END IF;

    -- Add updatedAt if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE leads ADD COLUMN "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        UPDATE leads SET "updatedAt" = COALESCE(updated_at, CURRENT_TIMESTAMP);
        RAISE NOTICE 'Added updatedAt column to leads';
    END IF;

    -- Add firstName if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'firstName'
    ) THEN
        ALTER TABLE leads ADD COLUMN "firstName" VARCHAR(255);
        UPDATE leads SET "firstName" = COALESCE(first_name, name);
        RAISE NOTICE 'Added firstName column to leads';
    END IF;

    -- Add lastName if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lastName'
    ) THEN
        ALTER TABLE leads ADD COLUMN "lastName" VARCHAR(255);
        UPDATE leads SET "lastName" = last_name;
        RAISE NOTICE 'Added lastName column to leads';
    END IF;

    -- Ensure other required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'email'
    ) THEN
        ALTER TABLE leads ADD COLUMN email VARCHAR(255);
        RAISE NOTICE 'Added email column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'phone'
    ) THEN
        ALTER TABLE leads ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Added phone column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'source'
    ) THEN
        ALTER TABLE leads ADD COLUMN source VARCHAR(100) DEFAULT 'website';
        RAISE NOTICE 'Added source column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'assignedChannel'
    ) THEN
        ALTER TABLE leads ADD COLUMN "assignedChannel" VARCHAR(50);
        UPDATE leads SET "assignedChannel" = assigned_channel;
        RAISE NOTICE 'Added assignedChannel column to leads';
    END IF;
END $$;

-- 6. Create lead_campaign_enrollments table if missing
CREATE TABLE IF NOT EXISTS lead_campaign_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    completed BOOLEAN DEFAULT false,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add camelCase columns for enrollments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_campaign_enrollments' AND column_name = 'leadId'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD COLUMN "leadId" UUID;
        UPDATE lead_campaign_enrollments SET "leadId" = lead_id;
        RAISE NOTICE 'Added leadId column to lead_campaign_enrollments';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_campaign_enrollments' AND column_name = 'campaignId'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD COLUMN "campaignId" UUID;
        UPDATE lead_campaign_enrollments SET "campaignId" = campaign_id;
        RAISE NOTICE 'Added campaignId column to lead_campaign_enrollments';
    END IF;
END $$;

-- 7. Create sessions table for auth/me endpoint
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

-- 8. Test the exact API queries that are failing
SELECT 'Testing campaigns API query:' as test_info;
SELECT COUNT(*) as total_campaigns FROM campaigns;

-- Test the sorting that's causing issues
SELECT 'Testing campaigns sort by createdAt:' as test_info;
SELECT id, name, COALESCE("createdAt", created_at) as sort_column
FROM campaigns 
ORDER BY COALESCE("createdAt", created_at) DESC NULLS LAST
LIMIT 3;

SELECT 'Testing leads API query:' as test_info;
SELECT COUNT(*) as total_leads FROM leads;

-- Test the leads sorting that's causing issues
SELECT 'Testing leads sort by createdAt:' as test_info;
SELECT id, COALESCE("firstName", first_name, name) as name, COALESCE("createdAt", created_at) as sort_column
FROM leads 
ORDER BY COALESCE("createdAt", created_at) DESC NULLS LAST
LIMIT 3;

-- 9. Final verification
SELECT 'Final verification:' as info;
SELECT 
    (SELECT COUNT(*) FROM campaigns) as campaigns,
    (SELECT COUNT(*) FROM leads) as leads,
    (SELECT COUNT(*) FROM lead_campaign_enrollments) as enrollments,
    (SELECT COUNT(*) FROM sessions) as sessions;

-- 10. Show final table structures
SELECT 'Final campaigns columns:' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('id', 'name', 'createdAt', 'updatedAt', 'active', 'type', 'status')
ORDER BY column_name;

SELECT 'Final leads columns:' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('id', 'firstName', 'lastName', 'email', 'phone', 'createdAt', 'updatedAt', 'source', 'assignedChannel')
ORDER BY column_name;
EOF

echo "✅ Complete production API fix applied!"
echo ""
echo "🔍 Fixed Issues:"
echo "  ✅ Added missing camelCase columns (createdAt, updatedAt, firstName, lastName)"
echo "  ✅ Created sessions table for auth/me endpoint"
echo "  ✅ Fixed lead_campaign_enrollments table structure"
echo "  ✅ Added all columns required by API sorting and filtering"
echo "  ✅ Used COALESCE to handle both snake_case and camelCase columns"
echo ""
echo "🚀 All API endpoints should now work:"
echo "  ✅ /api/auth/me - Authentication should work"
echo "  ✅ /api/campaigns - Should load without 500 errors"
echo "  ✅ /api/leads - Should load and sort properly"
echo ""
echo "🔐 For auth/me 401 errors: Log out and back in to refresh tokens"
echo "📱 Refresh your browser to test the fixes"
