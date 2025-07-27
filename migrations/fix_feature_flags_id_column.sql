-- Fix for missing 'id' column in feature_flags table
-- This script checks if the 'id' column exists and adds it if missing

-- Step 1: Check and add the 'id' column if it doesn't exist
DO $$ 
BEGIN
  -- Check if the 'id' column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'feature_flags' 
    AND column_name = 'id'
  ) THEN
    -- Add the 'id' column as UUID with default value
    ALTER TABLE feature_flags 
    ADD COLUMN id UUID DEFAULT gen_random_uuid() NOT NULL;
    
    -- Make it the primary key if there isn't one already
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE table_name = 'feature_flags' 
      AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE feature_flags ADD PRIMARY KEY (id);
    END IF;
    
    RAISE NOTICE 'Added missing id column to feature_flags table';
  ELSE
    RAISE NOTICE 'id column already exists in feature_flags table';
  END IF;
END $$;

-- Step 2: Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'feature_flags' 
ORDER BY ordinal_position;

-- Step 3: Check for any duplicate keys and fix them
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicate keys
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT key, COUNT(*) as cnt
    FROM feature_flags
    GROUP BY key
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    -- Update duplicate keys by appending a number
    WITH duplicates AS (
      SELECT key, 
             id,
             ROW_NUMBER() OVER (PARTITION BY key ORDER BY created_at) as rn
      FROM feature_flags
      WHERE key IN (
        SELECT key
        FROM feature_flags
        GROUP BY key
        HAVING COUNT(*) > 1
      )
    )
    UPDATE feature_flags f
    SET key = d.key || '_' || d.rn
    FROM duplicates d
    WHERE f.id = d.id AND d.rn > 1;
    
    RAISE NOTICE 'Fixed % duplicate keys in feature_flags table', duplicate_count;
  END IF;
END $$;

-- Step 4: Ensure all required constraints exist
-- Check and add unique constraint on 'key' column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feature_flags_key_key'
  ) THEN
    ALTER TABLE feature_flags ADD CONSTRAINT feature_flags_key_key UNIQUE (key);
    RAISE NOTICE 'Added unique constraint on key column';
  END IF;
END $$;

-- Step 5: Display final table structure
\d feature_flags