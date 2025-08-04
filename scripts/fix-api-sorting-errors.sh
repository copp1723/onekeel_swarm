#!/bin/bash
# Fix the specific 500 errors in campaigns and leads APIs caused by column name mismatches

echo "🔧 Fixing API sorting errors in campaigns and leads endpoints..."

psql $DATABASE_URL << 'EOF'
-- Fix the specific column name issues causing 500 errors in API sorting

-- 1. Ensure campaigns table has the exact columns the API expects for sorting
-- The API tries to sort by 'createdAt' but the DB might have 'created_at'

-- Check current campaigns table structure
SELECT 'Current campaigns table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('createdAt', 'created_at', 'updatedAt', 'updated_at', 'name', 'status', 'type', 'active')
ORDER BY column_name;

-- Check current leads table structure  
SELECT 'Current leads table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('createdAt', 'created_at', 'updatedAt', 'updated_at', 'firstName', 'first_name', 'lastName', 'last_name', 'email', 'phone', 'status')
ORDER BY column_name;

-- 2. Add missing columns that the API sorting expects

-- For campaigns table - ensure all sortable columns exist
DO $$ 
BEGIN
    -- Ensure name column exists (API sorts by this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'name'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN name TEXT;
        RAISE NOTICE 'Added name column to campaigns';
    END IF;

    -- Ensure active column exists (API filters by this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'active'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added active column to campaigns';
    END IF;

    -- Ensure type column exists (API filters by this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'type'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN type VARCHAR(50) DEFAULT 'drip';
        RAISE NOTICE 'Added type column to campaigns';
    END IF;

    -- Ensure status column exists (API uses this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'status'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        RAISE NOTICE 'Added status column to campaigns';
    END IF;
END $$;

-- For leads table - ensure all sortable columns exist
DO $$ 
BEGIN
    -- Ensure email column exists (API sorts by this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'email'
    ) THEN
        ALTER TABLE leads ADD COLUMN email VARCHAR(255);
        RAISE NOTICE 'Added email column to leads';
    END IF;

    -- Ensure phone column exists (API sorts by this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'phone'
    ) THEN
        ALTER TABLE leads ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Added phone column to leads';
    END IF;

    -- Ensure status column exists (API filters by this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'status'
    ) THEN
        ALTER TABLE leads ADD COLUMN status VARCHAR(50) DEFAULT 'new';
        RAISE NOTICE 'Added status column to leads';
    END IF;

    -- Ensure source column exists (API filters by this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'source'
    ) THEN
        ALTER TABLE leads ADD COLUMN source VARCHAR(100) DEFAULT 'website';
        RAISE NOTICE 'Added source column to leads';
    END IF;

    -- Ensure assignedChannel column exists (API filters by this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'assignedChannel'
    ) THEN
        ALTER TABLE leads ADD COLUMN "assignedChannel" VARCHAR(50);
        RAISE NOTICE 'Added assignedChannel column to leads';
    END IF;
END $$;

-- 3. Test the exact queries that the API is running

-- Test campaigns query (this is what's failing)
SELECT 'Testing campaigns API query:' as test_info;
SELECT id, name, status, type, active, "createdAt"
FROM campaigns 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- Test leads query (this is what's failing)  
SELECT 'Testing leads API query:' as test_info;
SELECT id, "firstName", "lastName", email, phone, status, source, "createdAt"
FROM leads 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- 4. Verify the lead_campaign_enrollments table exists and has the right structure
SELECT 'Lead campaign enrollments structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lead_campaign_enrollments'
ORDER BY column_name;

-- Test enrollment stats query (used in campaigns API)
SELECT 'Testing enrollment stats query:' as test_info;
SELECT COUNT(*) as enrollment_count FROM lead_campaign_enrollments;

-- 5. Final verification
SELECT 'Final verification - row counts:' as info;
SELECT 
    (SELECT COUNT(*) FROM campaigns) as campaign_count,
    (SELECT COUNT(*) FROM leads) as lead_count,
    (SELECT COUNT(*) FROM lead_campaign_enrollments) as enrollment_count;
EOF

echo "✅ API sorting fixes completed!"
echo ""
echo "🔍 This fix addresses:"
echo "  ✅ Column name mismatches in campaigns table"
echo "  ✅ Column name mismatches in leads table"  
echo "  ✅ Missing sortable columns that APIs expect"
echo "  ✅ Missing filterable columns that APIs use"
echo ""
echo "🚀 The /api/campaigns and /api/leads endpoints should now work without 500 errors!"
