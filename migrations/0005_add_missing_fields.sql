-- Add missing fields for campaign system
-- Run this migration to support the new campaign features

-- Add score field to leads table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'score'
    ) THEN
        ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add name field to leads table (computed from firstName/lastName)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'name'
    ) THEN
        ALTER TABLE leads ADD COLUMN name TEXT GENERATED ALWAYS AS 
            (COALESCE(metadata->>'firstName', '') || ' ' || COALESCE(metadata->>'lastName', '')) STORED;
    END IF;
END $$;

-- Add firstName field to leads table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'firstName'
    ) THEN
        ALTER TABLE leads ADD COLUMN firstName TEXT;
        -- Populate from metadata if available
        UPDATE leads SET firstName = metadata->>'firstName' WHERE metadata->>'firstName' IS NOT NULL;
    END IF;
END $$;

-- Add lastName field to leads table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lastName'
    ) THEN
        ALTER TABLE leads ADD COLUMN lastName TEXT;
        -- Populate from metadata if available
        UPDATE leads SET lastName = metadata->>'lastName' WHERE metadata->>'lastName' IS NOT NULL;
    END IF;
END $$;

-- Add createdBy and updatedBy to campaigns table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'createdBy'
    ) THEN
        ALTER TABLE campaigns 
        ADD COLUMN createdBy TEXT,
        ADD COLUMN updatedBy TEXT;
    END IF;
END $$;

-- Add enrolledBy and enrolledAt to lead_campaign_enrollments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_campaign_enrollments' AND column_name = 'enrolledBy'
    ) THEN
        ALTER TABLE lead_campaign_enrollments 
        ADD COLUMN enrolledBy TEXT,
        ADD COLUMN enrolledAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add conversationId to communications table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communications' AND column_name = 'conversationId'
    ) THEN
        ALTER TABLE communications ADD COLUMN conversationId TEXT;
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_communications_conversationId ON communications(conversationId);
    END IF;
END $$;

-- Create conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    leadId TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on leadId for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_leadId ON conversations(leadId);

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_campaigns_createdBy ON campaigns(createdBy);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(active);

-- Grant permissions
GRANT ALL ON conversations TO ccl_3_user;

COMMENT ON TABLE conversations IS 'Tracks ongoing conversations with leads across channels';
COMMENT ON COLUMN leads.score IS 'Lead qualification score (0-100)';
COMMENT ON COLUMN campaigns.createdBy IS 'User ID who created the campaign';
COMMENT ON COLUMN communications.conversationId IS 'Links communication to a conversation thread';