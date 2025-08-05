-- Migration: Simplify user roles to admin/user only
-- Date: 2025-08-05
-- Description: Convert existing user roles to simplified admin/user system

BEGIN;

-- First, update existing users to simplified roles
-- Convert manager and agent roles to 'user', keep admin as 'admin'
UPDATE users 
SET role = CASE 
    WHEN role = 'admin' THEN 'admin'::user_role
    ELSE 'user'::user_role
END;

-- Drop the old enum and recreate with only admin/user
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Update the table to use the new enum
ALTER TABLE users 
ALTER COLUMN role TYPE user_role USING role::text::user_role;

-- Set default to 'user'
ALTER TABLE users 
ALTER COLUMN role SET DEFAULT 'user';

-- Drop the old enum type
DROP TYPE user_role_old;

COMMIT;