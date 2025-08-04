-- Production Deployment Fix for CCL-3
-- This script fixes all database issues preventing campaign creation and AI enhancement

-- 1. Fix sessions table - add missing columns
DO $$ 
BEGIN
    -- Add last_accessed_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'last_accessed_at'
    ) THEN
        ALTER TABLE sessions ADD COLUMN last_accessed_at TIMESTAMP DEFAULT NOW() NOT NULL;
        RAISE NOTICE 'Added last_accessed_at column to sessions table';
    END IF;

    -- Add user_agent column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE sessions ADD COLUMN user_agent TEXT;
        RAISE NOTICE 'Added user_agent column to sessions table';
    END IF;

    -- Add ip_address column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE sessions ADD COLUMN ip_address VARCHAR(45);
        RAISE NOTICE 'Added ip_address column to sessions table';
    END IF;
END $$;

-- 2. Fix campaigns table ID generation
DO $$
BEGIN
    -- Update the default value for campaigns.id to ensure UUID generation works
    ALTER TABLE campaigns ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    RAISE NOTICE 'Fixed campaigns.id default value for UUID generation';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not update campaigns.id default: %', SQLERRM;
END $$;

-- 3. Fix any NULL campaign IDs (if they exist)
UPDATE campaigns 
SET id = gen_random_uuid()::text 
WHERE id IS NULL;

-- 4. Ensure agent_configurations table exists with all required columns
CREATE TABLE IF NOT EXISTS agent_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    system_prompt TEXT NOT NULL,
    context_note TEXT,
    temperature INTEGER DEFAULT 7,
    max_tokens INTEGER DEFAULT 500,
    api_key VARCHAR(255),
    api_endpoint VARCHAR(500),
    channel_config JSONB DEFAULT '{}'::jsonb,
    response_delay INTEGER DEFAULT 0,
    retry_attempts INTEGER DEFAULT 3,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 5. Add api_key column to agent_configurations if missing
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_configurations') 
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_configurations' AND column_name = 'api_key'
    ) THEN
        ALTER TABLE agent_configurations ADD COLUMN api_key VARCHAR(255);
        RAISE NOTICE 'Added api_key column to agent_configurations table';
    END IF;
END $$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);

-- 7. Verify all fixes were applied
SELECT 
    'Database fixes applied successfully!' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'last_accessed_at') as has_last_accessed_at,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'user_agent') as has_user_agent,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'ip_address') as has_ip_address,
    (SELECT COUNT(*) FROM campaigns WHERE id IS NULL) as null_campaign_ids;

-- 8. Show current table structures for verification
SELECT 
    'sessions' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;

SELECT 
    'campaigns' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'campaigns' AND column_name = 'id';