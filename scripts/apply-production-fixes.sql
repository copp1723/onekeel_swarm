-- Apply all production fixes in one script
-- Run in Render shell: psql $DATABASE_URL < scripts/apply-production-fixes.sql

-- First apply the feature flags fix
\i scripts/fix-production-schema-issues.sql

-- Then apply the missing fields migration
\i migrations/0005_add_missing_fields.sql

-- Verify all changes
SELECT 'Checking feature flags...' as status;
SELECT key, enabled FROM feature_flags WHERE key LIKE 'ui.%';

SELECT 'Checking leads table columns...' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('firstName', 'lastName', 'name', 'score')
ORDER BY column_name;

SELECT 'Checking campaigns table columns...' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('createdBy', 'updatedBy')
ORDER BY column_name;

SELECT 'Checking communications table columns...' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'communications' 
AND column_name = 'conversationId';

SELECT 'Checking conversations table...' as status;
SELECT COUNT(*) as table_exists FROM information_schema.tables WHERE table_name = 'conversations';

SELECT 'All fixes applied successfully!' as status;