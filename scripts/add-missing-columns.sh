#!/bin/bash
# Script to add all missing columns to production database

echo "Adding missing columns to fix 500 errors..."

# Use the DATABASE_URL from Render
psql "$DATABASE_URL" << 'EOF'
-- Fix agent_configurations table
ALTER TABLE agent_configurations 
ADD COLUMN IF NOT EXISTS response_delay INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS handover_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS training_data JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS integration_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS workflow_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS escalation_rules JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS analytics_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS compliance_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS routing_rules JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS knowledge_base JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS template_library JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS conversation_scripts JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tags VARCHAR(255)[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_concurrent_conversations INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS version VARCHAR(50) DEFAULT '1.0.0';

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
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'communications') THEN
        ALTER TABLE communications
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    END IF;
END $$;

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
SELECT COUNT(*) as agent_count FROM agent_configurations;

SELECT 'Testing campaigns...' as test;
SELECT COUNT(*) as campaign_count FROM campaigns;

SELECT 'All columns added successfully!' as status;
EOF

echo "Script completed!"