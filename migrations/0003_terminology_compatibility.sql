-- Migration: Terminology Compatibility Layer
-- Description: Add database views and aliases to support Leads → Contacts migration

-- Create contacts view that maps to leads table
CREATE VIEW contacts AS 
SELECT 
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
FROM leads;

-- Create contact_campaign_enrollments view
CREATE VIEW contact_campaign_enrollments AS
SELECT 
  id,
  lead_id as contact_id,
  campaign_id,
  status,
  current_step,
  completed,
  enrolled_at,
  completed_at,
  metadata,
  created_at,
  updated_at
FROM lead_campaign_enrollments;

-- Create contact_status enum alias (maps to lead_status)
-- Note: PostgreSQL doesn't support enum aliases, so we'll handle this in the application layer

-- Create indexes on the underlying tables to support contact queries
-- (These will also benefit lead queries)
CREATE INDEX IF NOT EXISTS leads_email_search_idx ON leads USING gin(to_tsvector('english', email));
CREATE INDEX IF NOT EXISTS leads_name_search_idx ON leads USING gin(to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '')));
CREATE INDEX IF NOT EXISTS leads_metadata_idx ON leads USING gin(metadata);

-- Create a function to insert into leads table via contacts view
CREATE OR REPLACE FUNCTION insert_contact()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO leads (
    first_name, last_name, email, phone, source, status, 
    qualification_score, assigned_channel, boberdoo_id, campaign_id, client_id,
    credit_score, income, employer, job_title, metadata, notes, created_at, updated_at
  ) VALUES (
    NEW.first_name, NEW.last_name, NEW.email, NEW.phone, NEW.source, NEW.status,
    NEW.qualification_score, NEW.assigned_channel, NEW.boberdoo_id, NEW.campaign_id, NEW.client_id,
    NEW.credit_score, NEW.income, NEW.employer, NEW.job_title, NEW.metadata, NEW.notes, 
    COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
  );
  
  -- Return the inserted row from leads table, aliased as contacts
  SELECT 
    id, first_name, last_name, email, phone, source, status,
    qualification_score, assigned_channel, boberdoo_id, campaign_id, client_id,
    credit_score, income, employer, job_title, metadata, notes, created_at, updated_at
  INTO NEW
  FROM leads 
  WHERE email = NEW.email 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update leads table via contacts view
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

-- Create a function to delete from leads table via contacts view
CREATE OR REPLACE FUNCTION delete_contact()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM leads WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for contacts view
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

-- Create similar functions for contact_campaign_enrollments
CREATE OR REPLACE FUNCTION insert_contact_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lead_campaign_enrollments (
    lead_id, campaign_id, status, current_step, completed,
    enrolled_at, completed_at, metadata, created_at, updated_at
  ) VALUES (
    NEW.contact_id, NEW.campaign_id, NEW.status, NEW.current_step, NEW.completed,
    NEW.enrolled_at, NEW.completed_at, NEW.metadata,
    COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
  );
  
  SELECT 
    id, lead_id as contact_id, campaign_id, status, current_step, completed,
    enrolled_at, completed_at, metadata, created_at, updated_at
  INTO NEW
  FROM lead_campaign_enrollments 
  WHERE lead_id = NEW.contact_id AND campaign_id = NEW.campaign_id
  ORDER BY created_at DESC 
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_contact_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lead_campaign_enrollments SET
    lead_id = NEW.contact_id,
    campaign_id = NEW.campaign_id,
    status = NEW.status,
    current_step = NEW.current_step,
    completed = NEW.completed,
    enrolled_at = NEW.enrolled_at,
    completed_at = NEW.completed_at,
    metadata = NEW.metadata,
    updated_at = COALESCE(NEW.updated_at, NOW())
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_contact_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM lead_campaign_enrollments WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for contact_campaign_enrollments view
CREATE TRIGGER contact_enrollments_insert_trigger
  INSTEAD OF INSERT ON contact_campaign_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION insert_contact_enrollment();

CREATE TRIGGER contact_enrollments_update_trigger
  INSTEAD OF UPDATE ON contact_campaign_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_enrollment();

CREATE TRIGGER contact_enrollments_delete_trigger
  INSTEAD OF DELETE ON contact_campaign_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION delete_contact_enrollment();

-- Create a mapping table for dual terminology support
CREATE TABLE terminology_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_term VARCHAR(50) NOT NULL,
  new_term VARCHAR(50) NOT NULL,
  context VARCHAR(50) NOT NULL, -- 'database', 'api', 'ui'
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert terminology mappings
INSERT INTO terminology_mapping (legacy_term, new_term, context) VALUES
('leads', 'contacts', 'database'),
('lead', 'contact', 'database'),
('leadId', 'contactId', 'api'),
('lead_id', 'contact_id', 'database'),
('Lead', 'Contact', 'ui'),
('Leads', 'Contacts', 'ui'),
('lead_status', 'contact_status', 'database'),
('lead_campaign_enrollments', 'contact_campaign_enrollments', 'database');

-- Create helper function to get terminology mapping
CREATE OR REPLACE FUNCTION get_terminology_mapping(
  term VARCHAR(50), 
  context_type VARCHAR(50) DEFAULT 'database'
) RETURNS VARCHAR(50) AS $$
DECLARE
  mapped_term VARCHAR(50);
BEGIN
  SELECT new_term INTO mapped_term
  FROM terminology_mapping 
  WHERE legacy_term = term 
    AND context = context_type 
    AND active = TRUE;
  
  -- Return mapped term if found, otherwise return original term
  RETURN COALESCE(mapped_term, term);
END;
$$ LANGUAGE plpgsql;

-- Add indexes for terminology mapping lookups
CREATE INDEX terminology_mapping_legacy_context_idx ON terminology_mapping(legacy_term, context);
CREATE INDEX terminology_mapping_active_idx ON terminology_mapping(active);

-- Add comments for documentation
COMMENT ON VIEW contacts IS 'Compatibility view mapping leads table to contacts terminology';
COMMENT ON VIEW contact_campaign_enrollments IS 'Compatibility view mapping lead_campaign_enrollments to contact terminology';
COMMENT ON TABLE terminology_mapping IS 'Mapping table for dual terminology support during migration';
COMMENT ON FUNCTION get_terminology_mapping IS 'Helper function to resolve terminology mappings';

-- Create migration completion marker
INSERT INTO analytics_events (event_type, event_name, metadata, timestamp) VALUES (
  'migration', 
  'terminology_compatibility_complete',
  '{"version": "0003", "features": ["contacts_view", "dual_terminology", "backward_compatibility"]}'::jsonb,
  NOW()
);