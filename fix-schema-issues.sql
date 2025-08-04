-- Fix critical schema issues preventing campaign launches

-- 1. Fix sessions table - add missing token column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'token') THEN
        ALTER TABLE sessions ADD COLUMN token VARCHAR(255) UNIQUE;
    END IF;
END $$;

-- 2. Fix leads table - rename last_contacted_at to match schema
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_contacted') THEN
        ALTER TABLE leads RENAME COLUMN last_contacted TO last_contacted_at;
    END IF;
END $$;

-- 3. Fix campaigns table - ensure target_criteria is properly formatted as JSONB array
UPDATE campaigns 
SET target_criteria = '[]'::jsonb 
WHERE target_criteria IS NULL OR target_criteria::text = 'null';

-- 4. Fix any malformed array literals in campaigns
UPDATE campaigns 
SET target_criteria = '[]'::jsonb 
WHERE target_criteria::text ~ '^"[^"]*"$';

-- 5. Add missing audit_logs metadata column if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'metadata') THEN
        ALTER TABLE audit_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 6. Update audit_logs to use metadata instead of changes for consistency
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'changes') THEN
        UPDATE audit_logs SET metadata = changes WHERE metadata IS NULL AND changes IS NOT NULL;
    END IF;
END $$;