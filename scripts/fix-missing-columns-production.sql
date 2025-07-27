-- Fix missing columns in production database

-- Add missing columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

-- Add missing columns to agent_configurations table
ALTER TABLE agent_configurations
ADD COLUMN IF NOT EXISTS channel_config JSONB DEFAULT '{}';

-- Add missing columns to campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS target_criteria JSONB DEFAULT '{}';

-- Update any existing leads to parse first_name from name column
UPDATE leads 
SET first_name = SPLIT_PART(name, ' ', 1),
    last_name = SPLIT_PART(name, ' ', 2)
WHERE first_name IS NULL AND name IS NOT NULL;

-- Verify the changes
SELECT 
    table_name,
    column_name,
    data_type
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name IN ('leads', 'agent_configurations', 'campaigns')
    AND column_name IN ('first_name', 'last_name', 'channel_config', 'target_criteria')
ORDER BY 
    table_name, 
    column_name;