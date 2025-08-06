-- Add conversation and messaging tables for OneKeel Swarm

-- Create enum for conversation status
CREATE TYPE conversation_status AS ENUM ('active', 'paused', 'completed', 'handover_pending', 'handover_completed');

-- Create enum for message sender type
CREATE TYPE message_sender AS ENUM ('agent', 'lead', 'system', 'human');

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'chat')),
    status conversation_status NOT NULL DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    qualification_score INTEGER DEFAULT 0 CHECK (qualification_score >= 0 AND qualification_score <= 10),
    goal_progress JSONB DEFAULT '{}',
    cross_channel_context JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender message_sender NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create communications table (for tracking all outbound communications)
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'chat')),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    subject TEXT,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked', 'replied')),
    external_id TEXT, -- Mailgun/Twilio message ID
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create handover_history table
CREATE TABLE IF NOT EXISTS handover_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    triggered_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    qualification_score INTEGER,
    urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high')),
    handover_recipients JSONB NOT NULL DEFAULT '[]',
    dossier JSONB,
    accepted_by TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX idx_conversations_campaign_id ON conversations(campaign_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_channel ON conversations(channel);
CREATE INDEX idx_conversations_started_at ON conversations(started_at);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_sender ON messages(sender);

CREATE INDEX idx_communications_lead_id ON communications(lead_id);
CREATE INDEX idx_communications_conversation_id ON communications(conversation_id);
CREATE INDEX idx_communications_channel ON communications(channel);
CREATE INDEX idx_communications_status ON communications(status);
CREATE INDEX idx_communications_external_id ON communications(external_id);
CREATE INDEX idx_communications_created_at ON communications(created_at);

CREATE INDEX idx_handover_history_lead_id ON handover_history(lead_id);
CREATE INDEX idx_handover_history_conversation_id ON handover_history(conversation_id);
CREATE INDEX idx_handover_history_created_at ON handover_history(created_at);

-- Add conversation tracking to leads table if columns don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'last_contact_at') THEN
        ALTER TABLE leads ADD COLUMN last_contact_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'conversation_count') THEN
        ALTER TABLE leads ADD COLUMN conversation_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'total_messages') THEN
        ALTER TABLE leads ADD COLUMN total_messages INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create function to update lead conversation stats
CREATE OR REPLACE FUNCTION update_lead_conversation_stats() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update lead stats when new message is added
        UPDATE leads 
        SET 
            last_contact_at = NOW(),
            total_messages = total_messages + 1
        WHERE id = (SELECT lead_id FROM conversations WHERE id = NEW.conversation_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating lead stats
DROP TRIGGER IF EXISTS update_lead_stats_on_message ON messages;
CREATE TRIGGER update_lead_stats_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_conversation_stats();

-- Create function to update conversation updated_at
CREATE OR REPLACE FUNCTION update_conversation_updated_at() RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating conversation timestamp
DROP TRIGGER IF EXISTS update_conversation_timestamp ON messages;
CREATE TRIGGER update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_updated_at();