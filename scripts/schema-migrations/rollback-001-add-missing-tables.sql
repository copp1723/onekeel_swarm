-- Rollback Migration 001: Remove any tables that were added
-- This rollback script undoes the changes from 001-add-missing-tables.sql

-- Since the original migration 001 was empty (no tables were actually added),
-- this rollback script is also empty but serves as a template for consistency

-- If any tables had been created, they would be dropped here
-- Example format:
-- DROP TABLE IF EXISTS table_name CASCADE;

-- Note: Use CASCADE carefully in production - it will drop all dependent objects
