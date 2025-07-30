-- Migration 002: Add missing columns to existing tables
-- This migration adds the identified missing columns to improve data integrity

-- Add missing columns to leads table
-- Note: first_name and last_name already exist, adding score column which maps to qualification_score enhancement
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- Add computed name column to leads table
-- Note: This is a PostgreSQL generated column using existing first_name and last_name columns
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS name TEXT 
  GENERATED ALWAYS AS (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) STORED;

-- Add missing columns to campaigns table with proper foreign key constraints
ALTER TABLE campaigns 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add missing columns to lead_campaign_enrollments table with proper foreign key constraints
ALTER TABLE lead_campaign_enrollments 
  ADD COLUMN IF NOT EXISTS enrolled_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add missing column to communications table with proper foreign key constraint
ALTER TABLE communications 
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_name ON leads(name);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_updated_by ON campaigns(updated_by);
CREATE INDEX IF NOT EXISTS idx_lead_campaign_enrollments_enrolled_by ON lead_campaign_enrollments(enrolled_by);
CREATE INDEX IF NOT EXISTS idx_communications_conversation_id ON communications(conversation_id);