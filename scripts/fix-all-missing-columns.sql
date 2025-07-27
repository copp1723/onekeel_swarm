-- Fix ALL missing columns in production database

-- Add missing columns to campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Add missing columns to leads table  
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS credit_score VARCHAR(50);

-- Verify all columns exist
SELECT 
    t.table_name,
    array_agg(c.column_name ORDER BY c.ordinal_position) as columns
FROM 
    information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE 
    t.table_schema = 'public' 
    AND t.table_name IN ('leads', 'campaigns', 'agent_configurations', 'conversations')
GROUP BY 
    t.table_name
ORDER BY 
    t.table_name;