-- Fix missing columns causing API errors

-- Fix agents table - missing api_key column
ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS api_key VARCHAR(255);

-- Fix campaigns table - missing type column  
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'email';

-- Add other commonly referenced columns that might be missing
ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_configurations_api_key ON agent_configurations(api_key);
CREATE INDEX IF NOT EXISTS idx_agent_configurations_status ON agent_configurations(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- Verify the fixes
SELECT 
  'agent_configurations' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'agent_configurations' 
AND column_name IN ('api_key', 'status', 'context_note')

UNION ALL

SELECT 
  'campaigns' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('type', 'status', 'description')
ORDER BY table_name, column_name;