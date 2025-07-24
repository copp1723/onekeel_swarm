-- Migration: Fix Terminology Triggers and Add Indexes
-- Description: Fix race conditions in triggers and add performance indexes

BEGIN;

-- Drop existing triggers first
DROP TRIGGER IF EXISTS contacts_insert_trigger ON contacts;
DROP TRIGGER IF EXISTS contacts_update_trigger ON contacts;
DROP TRIGGER IF EXISTS contacts_delete_trigger ON contacts;

-- Drop existing functions
DROP FUNCTION IF EXISTS insert_contact();
DROP FUNCTION IF EXISTS update_contact();
DROP FUNCTION IF EXISTS delete_contact();

-- Create improved insert function using RETURNING
CREATE OR REPLACE FUNCTION insert_contact()
RETURNS TRIGGER AS $$
DECLARE
  new_lead RECORD;
BEGIN
  INSERT INTO leads (
    id,
    first_name, 
    last_name, 
    email, 
    phone, 
    source, 
    status, 
    qualification_score, 
    assigned_channel, 
    boberdoo_id, 
    campaign_id, 
    client_id,
    credit_score, 
    income, 
    employer, 
    job_title, 
    metadata, 
    notes, 
    created_at, 
    updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.first_name, 
    NEW.last_name, 
    NEW.email, 
    NEW.phone, 
    NEW.source, 
    NEW.status,
    NEW.qualification_score, 
    NEW.assigned_channel, 
    NEW.boberdoo_id, 
    NEW.campaign_id, 
    NEW.client_id,
    NEW.credit_score, 
    NEW.income, 
    NEW.employer, 
    NEW.job_title, 
    NEW.metadata, 
    NEW.notes, 
    COALESCE(NEW.created_at, NOW()), 
    COALESCE(NEW.updated_at, NOW())
  ) RETURNING * INTO new_lead;
  
  -- Copy all fields from the inserted record to NEW
  NEW.id := new_lead.id;
  NEW.first_name := new_lead.first_name;
  NEW.last_name := new_lead.last_name;
  NEW.email := new_lead.email;
  NEW.phone := new_lead.phone;
  NEW.source := new_lead.source;
  NEW.status := new_lead.status;
  NEW.qualification_score := new_lead.qualification_score;
  NEW.assigned_channel := new_lead.assigned_channel;
  NEW.boberdoo_id := new_lead.boberdoo_id;
  NEW.campaign_id := new_lead.campaign_id;
  NEW.client_id := new_lead.client_id;
  NEW.credit_score := new_lead.credit_score;
  NEW.income := new_lead.income;
  NEW.employer := new_lead.employer;
  NEW.job_title := new_lead.job_title;
  NEW.metadata := new_lead.metadata;
  NEW.notes := new_lead.notes;
  NEW.created_at := new_lead.created_at;
  NEW.updated_at := new_lead.updated_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate update function (unchanged but included for completeness)
CREATE OR REPLACE FUNCTION update_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads SET
    first_name = NEW.first_name,
    last_name = NEW.last_name,
    email = NEW.email,
    phone = NEW.phone,
    source = NEW.source,
    status = NEW.status,
    qualification_score = NEW.qualification_score,
    assigned_channel = NEW.assigned_channel,
    boberdoo_id = NEW.boberdoo_id,
    campaign_id = NEW.campaign_id,
    client_id = NEW.client_id,
    credit_score = NEW.credit_score,
    income = NEW.income,
    employer = NEW.employer,
    job_title = NEW.job_title,
    metadata = NEW.metadata,
    notes = NEW.notes,
    updated_at = COALESCE(NEW.updated_at, NOW())
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate delete function (unchanged but included for completeness)
CREATE OR REPLACE FUNCTION delete_contact()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM leads WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER contacts_insert_trigger
  INSTEAD OF INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION insert_contact();

CREATE TRIGGER contacts_update_trigger
  INSTEAD OF UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contact();

CREATE TRIGGER contacts_delete_trigger
  INSTEAD OF DELETE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION delete_contact();

-- Add performance indexes
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads(source);
CREATE INDEX IF NOT EXISTS leads_assigned_channel_idx ON leads(assigned_channel);
CREATE INDEX IF NOT EXISTS leads_campaign_id_idx ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS leads_client_id_idx ON leads(client_id);
CREATE INDEX IF NOT EXISTS leads_lower_email_idx ON leads(LOWER(email));
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS leads_updated_at_idx ON leads(updated_at DESC);

-- Add indexes for lead_campaign_enrollments
CREATE INDEX IF NOT EXISTS lead_campaign_enrollments_lead_id_idx ON lead_campaign_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS lead_campaign_enrollments_campaign_id_idx ON lead_campaign_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS lead_campaign_enrollments_status_idx ON lead_campaign_enrollments(status);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS leads_status_created_idx ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_source_status_idx ON leads(source, status);

-- Update migration marker
INSERT INTO analytics_events (event_type, event_name, metadata, timestamp) VALUES (
  'migration', 
  'fix_terminology_triggers_complete',
  '{
    "version": "0004", 
    "changes": [
      "fixed_insert_trigger_race_condition",
      "added_performance_indexes",
      "improved_trigger_functions"
    ]
  }'::jsonb,
  NOW()
);

COMMIT;