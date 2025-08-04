-- Initial migration placeholder
-- This file is required by drizzle-kit migration system
-- The actual schema is already in the database

-- Create a simple placeholder table to satisfy the migration system
DO $$ 
BEGIN
    -- Check if migration tracking is needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '__drizzle_migrations') THEN
        -- This will be handled by drizzle automatically
        NULL;
    END IF;
END $$;
