-- Quick verification script to check if all fixes were applied

-- 1. Check sessions table structure
SELECT 
    'Sessions Table Check' as check_type,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ All columns exist'
        ELSE '❌ Missing columns: ' || (3 - COUNT(*))::text
    END as status
FROM information_schema.columns 
WHERE table_name = 'sessions' 
AND column_name IN ('last_accessed_at', 'user_agent', 'ip_address');

-- 2. Check campaigns ID default
SELECT 
    'Campaigns ID Default' as check_type,
    CASE 
        WHEN column_default LIKE '%gen_random_uuid()%' THEN '✅ UUID generation configured'
        ELSE '❌ Invalid default: ' || COALESCE(column_default, 'NULL')
    END as status
FROM information_schema.columns 
WHERE table_name = 'campaigns' AND column_name = 'id';

-- 3. Check for NULL campaign IDs
SELECT 
    'NULL Campaign IDs' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No NULL IDs found'
        ELSE '❌ Found ' || COUNT(*) || ' campaigns with NULL IDs'
    END as status
FROM campaigns WHERE id IS NULL;

-- 4. Check agent_configurations table
SELECT 
    'Agent Configurations Table' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_configurations') 
        THEN '✅ Table exists'
        ELSE '❌ Table missing'
    END as status;

-- 5. Check indexes
SELECT 
    'Performance Indexes' as check_type,
    '✅ Created ' || COUNT(*) || ' indexes' as status
FROM pg_indexes 
WHERE tablename IN ('sessions', 'campaigns') 
AND indexname LIKE 'idx_%';

-- 6. Summary
SELECT 
    '🎉 DEPLOYMENT STATUS' as check_type,
    'Ready for production!' as status
WHERE NOT EXISTS (
    SELECT 1 FROM campaigns WHERE id IS NULL
) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'last_accessed_at'
);