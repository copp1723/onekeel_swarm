-- Fix critical schema issues preventing campaign launches

-- 1. Fix sessions table - add missing token column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'token') THEN
        ALTER TABLE sessions ADD COLUMN token VARCHAR(255) UNIQUE;
        UPDATE sessions SET token = gen_random_uuid()::text WHERE token IS NULL;
    END IF;
END $$;

-- 2. Fix leads table - rename last_contacted to last_contacted_at if needed
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_contacted') THEN
        ALTER TABLE leads RENAME COLUMN last_contacted TO last_contacted_at;
    END IF;
END $$;

-- 3. Fix campaigns table - ensure target_criteria is properly formatted as JSONB
UPDATE campaigns 
SET target_criteria = '{}'::jsonb 
WHERE target_criteria IS NULL OR target_criteria::text = 'null';

-- Fix malformed array literals in campaigns
UPDATE campaigns 
SET target_criteria = '{}'::jsonb 
WHERE target_criteria::text ~ '^"[^"]*"$';

-- 4. Add missing audit_logs metadata column if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'metadata') THEN
        ALTER TABLE audit_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Update audit_logs to use metadata instead of changes for consistency
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'changes') THEN
        UPDATE audit_logs SET metadata = changes WHERE metadata IS NULL AND changes IS NOT NULL;
    END IF;
END $$;

-- 5. Fix any missing columns in leads table
DO $$ 
BEGIN
    -- Add custom_data column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'custom_data') THEN
        ALTER TABLE leads ADD COLUMN custom_data JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add campaign_id column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'campaign_id') THEN
        ALTER TABLE leads ADD COLUMN campaign_id UUID REFERENCES campaigns(id);
    END IF;
END $$;

-- 6. Clean up any invalid data
UPDATE leads SET last_contacted_at = NULL WHERE last_contacted_at IS NOT NULL AND last_contacted_at::text = '';
UPDATE campaigns SET settings = '{}'::jsonb WHERE settings IS NULL;
UPDATE campaigns SET target_criteria = '{}'::jsonb WHERE target_criteria IS NULL;