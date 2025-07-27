# URGENT: Database Schema Fix Required

## Issue
The application is failing because the database is missing required columns:
- `agent_configurations` table missing `api_key` column
- `campaigns` table missing `type` column

## Fix Required (Run This Now)

**1. Connect to your database:**
```bash
render psql ccl-3
```

**2. Once connected, paste this SQL:**
```sql
-- Fix agents table - missing api_key column
ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS api_key VARCHAR(255);

-- Fix campaigns table - missing type column  
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'email';

-- Add other commonly referenced columns that might be missing
ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Verify the fixes worked
SELECT 'agent_configurations' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'agent_configurations' 
AND column_name IN ('api_key', 'status', 'context_note')

UNION ALL

SELECT 'campaigns' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('type', 'status', 'description')
ORDER BY table_name, column_name;
```

**3. Exit psql:**
```sql
\q
```

## Expected Result
After running this fix:
- ✅ Agents API will work (`/api/agents`)
- ✅ Campaigns API will work (`/api/campaigns`) 
- ✅ Campaign wizard will load properly
- ✅ No more 500 errors

The verification query should show all the columns exist:
- agent_configurations: api_key, context_note, status
- campaigns: description, status, type

## What This Fixes
These missing columns are causing the 500 errors you're seeing when:
- Loading the Campaigns page
- Opening the Campaign Wizard
- Accessing Agent management
- Using the Intelligence Hub