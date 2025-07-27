-- Fix for whatsapp_messages table with correct foreign key type

-- Drop the table if it was partially created
DROP TABLE IF EXISTS whatsapp_messages;

-- Create whatsapp_messages table with correct lead_id type (TEXT instead of UUID)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT REFERENCES leads(id),
  campaign_id UUID REFERENCES campaigns(id),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number VARCHAR(50) NOT NULL,
  to_number VARCHAR(50) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  external_id VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create the missing index
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_id ON whatsapp_messages(lead_id);

-- Verify the fix
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_messages') as whatsapp_table_exists,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'lead_id') as lead_id_column_exists;