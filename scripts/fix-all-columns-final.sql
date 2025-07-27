-- Comprehensive fix for ALL missing columns
-- Run this to ensure database is 100% ready

-- Fix agent_configurations table
ALTER TABLE agent_configurations 
ADD COLUMN IF NOT EXISTS response_delay INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS handover_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS training_data JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}';

-- Fix campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS audience_filters JSONB DEFAULT '{}';

-- Fix conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS handover_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(3,2);

-- Fix leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS annual_income INTEGER,
ADD COLUMN IF NOT EXISTS employer VARCHAR(255),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_contacted TIMESTAMP;

-- Fix communications table (if exists)
ALTER TABLE communications
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Verify all tables are ready
SELECT 'agent_configurations' as table_name, COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'agent_configurations' AND table_schema = 'public'
UNION ALL
SELECT 'campaigns', COUNT(*) FROM information_schema.columns WHERE table_name = 'campaigns' AND table_schema = 'public'
UNION ALL
SELECT 'conversations', COUNT(*) FROM information_schema.columns WHERE table_name = 'conversations' AND table_schema = 'public'
UNION ALL
SELECT 'leads', COUNT(*) FROM information_schema.columns WHERE table_name = 'leads' AND table_schema = 'public';

-- Test queries
SELECT 'Testing agents...' as test;
SELECT id, name FROM agent_configurations LIMIT 1;

SELECT 'Testing campaigns...' as test;
SELECT id, name FROM campaigns LIMIT 1;

SELECT 'Testing conversations...' as test;
SELECT id FROM conversations LIMIT 1;