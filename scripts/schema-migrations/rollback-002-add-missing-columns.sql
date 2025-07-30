-- Rollback Migration 002: Remove columns that were added
-- This rollback script undoes the changes from 002-add-missing-columns.sql

-- IMPORTANT: This will cause data loss for any data stored in these columns
-- Always backup your database before running rollback migrations

-- Remove indexes first (opposite order of creation)
DROP INDEX IF EXISTS idx_communications_conversation_id;
DROP INDEX IF EXISTS idx_lead_campaign_enrollments_enrolled_by;
DROP INDEX IF EXISTS idx_campaigns_updated_by;
DROP INDEX IF EXISTS idx_campaigns_created_by;
DROP INDEX IF EXISTS idx_leads_name;
DROP INDEX IF EXISTS idx_leads_score;

-- Remove columns from communications table
ALTER TABLE communications 
  DROP COLUMN IF EXISTS conversation_id;

-- Remove columns from lead_campaign_enrollments table  
ALTER TABLE lead_campaign_enrollments 
  DROP COLUMN IF EXISTS enrolled_by,
  DROP COLUMN IF EXISTS enrolled_at;

-- Remove columns from campaigns table
ALTER TABLE campaigns 
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by;

-- Remove columns from leads table
-- Note: The 'name' column is a generated column and should be dropped first
ALTER TABLE leads 
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS score;

-- Note: first_name and last_name columns are NOT removed as they were part of the original schema
