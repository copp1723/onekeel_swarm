-- Migration: Campaign Executions and Recipients
-- Purpose: Track each execution (run) of a campaign and per-recipient delivery state

BEGIN;

-- 1) campaign_executions
CREATE TABLE IF NOT EXISTS campaign_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  status varchar(32) NOT NULL DEFAULT 'queued', -- queued|running|completed|failed|partial
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  schedule jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  stats jsonb DEFAULT '{"queued":0,"sent":0,"failed":0}'::jsonb,
  started_at timestamp,
  finished_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_executions_campaign_id_idx ON campaign_executions(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_executions_client_id_idx ON campaign_executions(client_id);
CREATE INDEX IF NOT EXISTS campaign_executions_status_idx ON campaign_executions(status);
CREATE INDEX IF NOT EXISTS campaign_executions_created_at_idx ON campaign_executions(created_at);

-- 2) campaign_execution_recipients
CREATE TABLE IF NOT EXISTS campaign_execution_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES campaign_executions(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  email varchar(255) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'queued', -- queued|sent|failed
  last_error text,
  message_id varchar(255),
  attempt_count int NOT NULL DEFAULT 0,
  last_attempt_at timestamp,
  variables jsonb DEFAULT '{}'::jsonb, -- merged personalization variables
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_execution_recipients_execution_id_idx ON campaign_execution_recipients(execution_id);
CREATE INDEX IF NOT EXISTS campaign_execution_recipients_status_idx ON campaign_execution_recipients(status);
CREATE INDEX IF NOT EXISTS campaign_execution_recipients_email_idx ON campaign_execution_recipients(email);

-- 3) triggers to maintain updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_campaign_executions_updated_at'
  ) THEN
    CREATE TRIGGER trg_campaign_executions_updated_at
    BEFORE UPDATE ON campaign_executions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_campaign_execution_recipients_updated_at'
  ) THEN
    CREATE TRIGGER trg_campaign_execution_recipients_updated_at
    BEFORE UPDATE ON campaign_execution_recipients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

COMMIT;