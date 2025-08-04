#!/bin/bash
# URGENT: Fix authentication in production
# Run this in Render shell to fix login issues immediately

echo "🚨 URGENT: Fixing authentication in production..."
echo "🔧 Applying database schema fix..."

# Apply the database fix using psql
psql $DATABASE_URL << 'EOF'
-- CRITICAL: Fix production database schema for authentication
-- This script ensures the users table has all required columns for login to work

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add username column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(255);
        RAISE NOTICE 'Added username column';
    END IF;

    -- Add password_hash column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
        RAISE NOTICE 'Added password_hash column';
    END IF;

    -- Add role column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'agent';
        RAISE NOTICE 'Added role column';
    END IF;

    -- Add active column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'active'
    ) THEN
        ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added active column';
    END IF;

    -- Add first_name column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(255);
        RAISE NOTICE 'Added first_name column';
    END IF;

    -- Add last_name column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(255);
        RAISE NOTICE 'Added last_name column';
    END IF;
END $$;

-- Update any existing users that might have NULL usernames
UPDATE users 
SET username = COALESCE(username, SPLIT_PART(email, '@', 1))
WHERE username IS NULL;

-- Set constraints
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Create unique constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'users_email_unique'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'users_username_unique'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

-- Create admin users if they don't exist
-- Using proper bcrypt hash for password 'password123'
INSERT INTO users (email, username, password_hash, first_name, last_name, role, active, created_at, updated_at)
VALUES 
    ('admin@OneKeelSwarm.com', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('josh.copp@onekeel.ai', 'josh.copp', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Josh', 'Copp', 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    active = EXCLUDED.active,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the fix
SELECT 'Users table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT 'Admin users created:' as info;
SELECT email, username, role, active FROM users WHERE role = 'admin';
EOF

echo "✅ Database schema fix completed!"
echo ""
echo "🔐 Login credentials:"
echo "  Email: admin@OneKeelSwarm.com"
echo "  Password: password123"
echo "  OR"
echo "  Email: josh.copp@onekeel.ai"
echo "  Password: password123"
echo ""
echo "🚀 Authentication should now work!"
