-- Clean up duplicate columns and fix data types

-- First, copy data from old columns to new columns if needed
UPDATE leads 
SET 
  first_name = COALESCE(first_name, firstname),
  last_name = COALESCE(last_name, lastname)
WHERE (first_name IS NULL OR last_name IS NULL) 
  AND (firstname IS NOT NULL OR lastname IS NOT NULL);

-- Drop the old duplicate columns
ALTER TABLE leads 
DROP COLUMN IF EXISTS firstname,
DROP COLUMN IF EXISTS lastname;

-- Fix credit_score data type (change from varchar to integer)
-- First, clean up any non-numeric data
UPDATE leads 
SET credit_score = NULL 
WHERE credit_score IS NOT NULL 
  AND credit_score !~ '^\d+$';

-- Convert column to integer
ALTER TABLE leads 
ALTER COLUMN credit_score TYPE INTEGER 
USING credit_score::INTEGER;

-- Verify the final schema
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'leads'
    AND column_name IN ('first_name', 'last_name', 'firstname', 'lastname', 'credit_score')
ORDER BY 
    column_name;