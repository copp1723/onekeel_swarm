-- Render Deployment Database Fix
-- This script fixes the specific 500 errors you're experiencing
-- Run this in your Render PostgreSQL console

-- 1. Ensure sessions table has ip_address column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE sessions ADD COLUMN ip_address VARCHAR(45);
        RAISE NOTICE 'Added ip_address column to sessions table';
    ELSE
        RAISE NOTICE 'ip_address column already exists in sessions table';
    END IF;
END $$;

-- 2. Ensure agents table has api_key column (if agents table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'agents' AND column_name = 'api_key'
        ) THEN
            ALTER TABLE agents ADD COLUMN api_key VARCHAR(255);
            RAISE NOTICE 'Added api_key column to agents table';
        ELSE
            RAISE NOTICE 'api_key column already exists in agents table';
        END IF;
    ELSE
        RAISE NOTICE 'agents table does not exist';
    END IF;
END $$;

-- 3. Ensure agent_configurations table has api_key column
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_configurations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'agent_configurations' AND column_name = 'api_key'
        ) THEN
            ALTER TABLE agent_configurations ADD COLUMN api_key VARCHAR(255);
            RAISE NOTICE 'Added api_key column to agent_configurations table';
        ELSE
            RAISE NOTICE 'api_key column already exists in agent_configurations table';
        END IF;
    ELSE
        RAISE NOTICE 'agent_configurations table does not exist';
    END IF;
END $$;

-- 4. Create agent_configurations table if it doesn't exist
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

-- 5. Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_accessed_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 6. Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'sessions_user_id_users_id_fk'
        ) THEN
            ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_users_id_fk 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraint for sessions.user_id';
        END IF;
    END IF;
END $$;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS agent_configurations_name_idx ON agent_configurations(name);
CREATE INDEX IF NOT EXISTS agent_configurations_type_idx ON agent_configurations(type);
CREATE INDEX IF NOT EXISTS agent_configurations_active_idx ON agent_configurations(active);

-- 8. Verify the fix
SELECT 
    'sessions.ip_address' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sessions' AND column_name = 'ip_address'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status

UNION ALL

SELECT 
    'agent_configurations.api_key' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'agent_configurations' AND column_name = 'api_key'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Success message
SELECT '🎉 Database schema fix completed! Your Render deployment should now work properly.' as result;
