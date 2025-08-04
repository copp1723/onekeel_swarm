#!/bin/bash
# Complete database schema fix for production

echo "🔧 Applying comprehensive database schema fix..."

psql $DATABASE_URL << 'EOF'
-- Create missing tables and fix schema issues

-- 1. Create lead_campaign_enrollments table if it doesn't exist
CREATE TABLE IF NOT EXISTS lead_campaign_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    completed BOOLEAN DEFAULT false,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create leads table if it doesn't exist (referenced by enrollments)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    source VARCHAR(100) DEFAULT 'website',
    status VARCHAR(50) DEFAULT 'new',
    qualification_score INTEGER DEFAULT 0,
    assigned_channel VARCHAR(50),
    boberdoo_id VARCHAR(255),
    campaign_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create communications table if it doesn't exist
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    campaign_id UUID,
    channel VARCHAR(50) NOT NULL,
    direction VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    subject VARCHAR(255),
    content TEXT NOT NULL,
    external_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Fix campaigns table - ensure it has the right structure
-- Add missing columns that the API expects
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'drip';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_criteria JSONB DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS start_date TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS campaigns_active_idx ON campaigns(active);
CREATE INDEX IF NOT EXISTS campaigns_type_idx ON campaigns(type);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_created_at_idx ON campaigns(created_at);

CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_campaign_id_idx ON leads(campaign_id);

CREATE INDEX IF NOT EXISTS lead_campaign_enrollments_lead_id_idx ON lead_campaign_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS lead_campaign_enrollments_campaign_id_idx ON lead_campaign_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS lead_campaign_enrollments_status_idx ON lead_campaign_enrollments(status);

CREATE INDEX IF NOT EXISTS communications_lead_id_idx ON communications(lead_id);
CREATE INDEX IF NOT EXISTS communications_campaign_id_idx ON communications(campaign_id);

-- 6. Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key from leads to campaigns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leads_campaign_id_fkey'
    ) THEN
        ALTER TABLE leads ADD CONSTRAINT leads_campaign_id_fkey 
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id);
    END IF;

    -- Add foreign key from lead_campaign_enrollments to leads
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lead_campaign_enrollments_lead_id_fkey'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD CONSTRAINT lead_campaign_enrollments_lead_id_fkey 
        FOREIGN KEY (lead_id) REFERENCES leads(id);
    END IF;

    -- Add foreign key from lead_campaign_enrollments to campaigns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lead_campaign_enrollments_campaign_id_fkey'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD CONSTRAINT lead_campaign_enrollments_campaign_id_fkey 
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id);
    END IF;

    -- Add foreign key from communications to leads
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'communications_lead_id_fkey'
    ) THEN
        ALTER TABLE communications ADD CONSTRAINT communications_lead_id_fkey 
        FOREIGN KEY (lead_id) REFERENCES leads(id);
    END IF;

    -- Add foreign key from communications to campaigns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'communications_campaign_id_fkey'
    ) THEN
        ALTER TABLE communications ADD CONSTRAINT communications_campaign_id_fkey 
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id);
    END IF;
END $$;

-- 7. Verify the schema
SELECT 'Database schema verification:' as info;

SELECT 'Campaigns table:' as table_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
ORDER BY ordinal_position;

SELECT 'Leads table:' as table_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'leads' 
ORDER BY ordinal_position;

SELECT 'Lead campaign enrollments table:' as table_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lead_campaign_enrollments' 
ORDER BY ordinal_position;

-- 8. Test basic queries
SELECT 'Testing campaigns API queries:' as test_info;
SELECT COUNT(*) as campaign_count FROM campaigns;

SELECT 'Testing leads queries:' as test_info;
SELECT COUNT(*) as lead_count FROM leads;

SELECT 'Testing enrollments queries:' as test_info;
SELECT COUNT(*) as enrollment_count FROM lead_campaign_enrollments;
EOF

echo "✅ Complete database schema fix applied!"
echo "🚀 All API endpoints should now work correctly!"
echo ""
echo "📋 Schema Summary:"
echo "  ✅ campaigns table - updated with all required columns"
echo "  ✅ leads table - created/verified"
echo "  ✅ lead_campaign_enrollments table - created"
echo "  ✅ communications table - created"
echo "  ✅ Foreign key constraints - added"
echo "  ✅ Performance indexes - created"
echo ""
echo "🎯 The campaign wizard and all buttons should now be fully functional!"
