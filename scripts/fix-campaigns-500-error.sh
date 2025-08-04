#!/bin/bash
# Fix 500 errors in campaigns API by adding missing columns

echo "🔧 Fixing campaigns API 500 errors..."

psql $DATABASE_URL << 'EOF'
-- Fix campaigns table - add missing columns that are causing 500 errors

-- Add status column if missing (the code expects this)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'status'
    ) THEN
        -- Create the enum type first
        CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
        ALTER TABLE campaigns ADD COLUMN status campaign_status DEFAULT 'draft';
        RAISE NOTICE 'Added status column to campaigns';
    END IF;
END $$;

-- Add description column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'description'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to campaigns';
    END IF;
END $$;

-- Add missing columns to lead_campaign_enrollments table
DO $$ 
BEGIN
    -- Add status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_campaign_enrollments' AND column_name = 'status'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        RAISE NOTICE 'Added status column to lead_campaign_enrollments';
    END IF;

    -- Add completed column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_campaign_enrollments' AND column_name = 'completed'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD COLUMN completed BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added completed column to lead_campaign_enrollments';
    END IF;

    -- Add enrolled_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_campaign_enrollments' AND column_name = 'enrolled_at'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD COLUMN enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added enrolled_at column to lead_campaign_enrollments';
    END IF;
END $$;

-- Create campaign_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_type') THEN
        CREATE TYPE campaign_type AS ENUM ('drip', 'blast', 'trigger');
        RAISE NOTICE 'Created campaign_type enum';
    END IF;
END $$;

-- Update campaigns table to use the enum if type column exists but isn't using enum
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'type' 
        AND data_type != 'USER-DEFINED'
    ) THEN
        -- Convert existing type column to use enum
        ALTER TABLE campaigns ALTER COLUMN type TYPE campaign_type USING type::campaign_type;
        RAISE NOTICE 'Updated type column to use enum';
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);
CREATE INDEX IF NOT EXISTS lead_campaign_enrollments_status_idx ON lead_campaign_enrollments(status);
CREATE INDEX IF NOT EXISTS lead_campaign_enrollments_completed_idx ON lead_campaign_enrollments(completed);

-- Verify the fix
SELECT 'Campaigns table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
ORDER BY ordinal_position;

SELECT 'Lead campaign enrollments structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lead_campaign_enrollments' 
ORDER BY ordinal_position;

-- Test if we can query campaigns without errors
SELECT 'Testing campaigns query:' as info;
SELECT COUNT(*) as campaign_count FROM campaigns;
EOF

echo "✅ Campaigns API fix completed!"
echo "🚀 The campaign wizard and buttons should now work!"
