-- Fix for missing last_accessed_at column in sessions table
-- This addresses the specific error: "column 'last_accessed_at' does not exist"

-- 1. Check if sessions table exists and add last_accessed_at column if missing
DO $$ 
BEGIN
    -- Check if sessions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
        -- Check if last_accessed_at column is missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sessions' AND column_name = 'last_accessed_at'
        ) THEN
            -- Add the missing column
            ALTER TABLE sessions ADD COLUMN last_accessed_at TIMESTAMP DEFAULT NOW() NOT NULL;
            RAISE NOTICE 'Added last_accessed_at column to sessions table';
            
            -- Update existing records to have a last_accessed_at value
            UPDATE sessions SET last_accessed_at = COALESCE(created_at, NOW()) WHERE last_accessed_at IS NULL;
            RAISE NOTICE 'Updated existing sessions with last_accessed_at values';
        ELSE
            RAISE NOTICE 'last_accessed_at column already exists in sessions table';
        END IF;
    ELSE
        -- Create the entire sessions table if it doesn't exist
        RAISE NOTICE 'Sessions table does not exist - creating it now';
        CREATE TABLE sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            ip_address VARCHAR(45),
            user_agent TEXT,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            last_accessed_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        
        -- Add foreign key constraint if users table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
            ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_users_id_fk 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        -- Create indexes for performance
        CREATE INDEX sessions_user_id_idx ON sessions(user_id);
        CREATE INDEX sessions_token_idx ON sessions(token);
        CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);
        CREATE INDEX sessions_last_accessed_at_idx ON sessions(last_accessed_at);
        
        RAISE NOTICE 'Created sessions table with all required columns and indexes';
    END IF;
END $$;

-- 2. Verify the fix
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'last_accessed_at'
    ) THEN
        RAISE NOTICE 'SUCCESS: last_accessed_at column is now available in sessions table';
    ELSE
        RAISE NOTICE 'ERROR: last_accessed_at column is still missing';
    END IF;
END $$;

-- 3. Show current sessions table structure for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;