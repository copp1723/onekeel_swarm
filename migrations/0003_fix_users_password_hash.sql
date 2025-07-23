-- Migration to fix users table password_hash column
-- This adds the missing password_hash column that's causing login failures

-- Add password_hash column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
    END IF;
END $$;

-- Update existing users with a default password hash if they don't have one
UPDATE users 
SET password_hash = '$2b$10$default.hash.for.existing.users'
WHERE password_hash IS NULL;

-- Make password_hash NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS users_password_hash_idx ON users(password_hash);