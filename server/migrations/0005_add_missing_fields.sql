-- Add missing fields to campaigns table
ALTER TABLE campaigns 
ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add missing fields to lead_campaign_enrollments table
ALTER TABLE lead_campaign_enrollments 
ADD COLUMN enrolled_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN enrolled_at TIMESTAMP DEFAULT NOW();

-- Add missing conversationId field to communications table
ALTER TABLE communications 
ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Add index for conversation_id
CREATE INDEX IF NOT EXISTS communications_conversation_id_idx ON communications(conversation_id);

-- Add missing score field to leads table
ALTER TABLE leads 
ADD COLUMN score INTEGER DEFAULT 0;

-- Add index for score
CREATE INDEX IF NOT EXISTS leads_score_idx ON leads(score);

-- Add computed name field to leads table (virtual column)
ALTER TABLE leads 
ADD COLUMN name VARCHAR(255) GENERATED ALWAYS AS (
  COALESCE(
    CASE 
      WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
      WHEN first_name IS NOT NULL THEN first_name
      WHEN last_name IS NOT NULL THEN last_name
      ELSE SPLIT_PART(email, '@', 1)
    END,
    'Unknown'
  )
) STORED;

-- Add index for name
CREATE INDEX IF NOT EXISTS leads_name_idx ON leads(name);