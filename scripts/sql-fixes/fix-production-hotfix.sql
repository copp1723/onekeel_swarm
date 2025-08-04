-- Hotfix for production issues
-- Run this on production database immediately

-- 1. Make refresh_token nullable in sessions table
ALTER TABLE sessions ALTER COLUMN refresh_token DROP NOT NULL;

-- 2. Add default value for refresh_token
ALTER TABLE sessions ALTER COLUMN refresh_token SET DEFAULT '';

-- 3. Update existing NULL refresh_tokens
UPDATE sessions SET refresh_token = '' WHERE refresh_token IS NULL;

-- 4. Verify the fix
SELECT 
    column_name, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
AND column_name = 'refresh_token';

-- Test that campaigns query works
SELECT COUNT(*) as campaign_count FROM campaigns;

-- Show success message
SELECT 'Hotfix applied successfully!' as status;