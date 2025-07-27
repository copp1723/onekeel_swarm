-- Check current database state after fixes

-- Check agent_configurations table structure and data
SELECT 'agent_configurations' as info, 'columns' as type, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'agent_configurations'
ORDER BY ordinal_position;

-- Check campaigns table structure and data  
SELECT 'campaigns' as info, 'columns' as type, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'campaigns'
ORDER BY ordinal_position;

-- Check if tables have any data
SELECT 'agent_configurations' as table_name, COUNT(*) as row_count FROM agent_configurations
UNION ALL
SELECT 'campaigns' as table_name, COUNT(*) as row_count FROM campaigns
UNION ALL
SELECT 'agent_templates' as table_name, COUNT(*) as row_count FROM agent_templates
UNION ALL
SELECT 'feature_flags' as table_name, COUNT(*) as row_count FROM feature_flags;