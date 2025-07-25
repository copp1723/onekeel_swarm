-- Verify all tables and columns exist for production
-- Run this before your demo to ensure everything is ready

-- Check campaigns table
SELECT 
    'campaigns' as table_name,
    COUNT(*) as column_count,
    array_agg(column_name ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'campaigns';

-- Check leads table
SELECT 
    'leads' as table_name,
    COUNT(*) as column_count,
    array_agg(column_name ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leads';

-- Check agent_configurations table
SELECT 
    'agent_configurations' as table_name,
    COUNT(*) as column_count,
    array_agg(column_name ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'agent_configurations';

-- Check conversations table
SELECT 
    'conversations' as table_name,
    COUNT(*) as column_count,
    array_agg(column_name ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'conversations';

-- Check feature_flags table
SELECT 
    'feature_flags' as table_name,
    COUNT(*) as column_count,
    array_agg(column_name ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'feature_flags';

-- Test basic queries work
SELECT 'Testing campaigns query...' as test;
SELECT COUNT(*) as campaign_count FROM campaigns;

SELECT 'Testing leads query...' as test;
SELECT COUNT(*) as lead_count FROM leads;

SELECT 'Testing agents query...' as test;
SELECT COUNT(*) as agent_count FROM agent_configurations;

SELECT 'Testing conversations query...' as test;
SELECT COUNT(*) as conversation_count FROM conversations;

-- Check enhanced dashboard flag
SELECT 'Checking enhanced dashboard flag...' as test;
SELECT key, enabled FROM feature_flags WHERE key = 'ui.enhanced-dashboard';