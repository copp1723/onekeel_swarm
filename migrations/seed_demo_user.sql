-- Seed demo user for testing
-- Password is 'password123' hashed with bcrypt

BEGIN;

-- Insert demo client first
INSERT INTO clients (id, name, domain, branding_config, settings, plan, subscription_status, active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Complete Car Loans',
  'completecarloans.com',
  '{
    "companyName": "Complete Car Loans",
    "primaryColor": "#2563eb",
    "secondaryColor": "#1d4ed8",
    "emailFromName": "Complete Car Loans",
    "supportEmail": "support@completecarloans.com"
  }'::jsonb,
  '{
    "maxLeads": 10000,
    "maxCampaigns": 100,
    "maxAgents": 50,
    "apiRateLimit": 1000
  }'::jsonb,
  'enterprise',
  'active',
  true,
  now(),
  now()
) ON CONFLICT (domain) DO NOTHING;

-- Get the client ID
DO $$
DECLARE
    client_uuid uuid;
BEGIN
    SELECT id INTO client_uuid FROM clients WHERE domain = 'completecarloans.com' LIMIT 1;
    
    -- Insert demo user with bcrypt hashed password for 'password123'
    INSERT INTO users (id, client_id, username, email, password_hash, role, is_active, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        client_uuid,
        'admin@completecarloans.com',
        'admin@completecarloans.com',
        '$2a$10$k8Y1THOJM6RF3O0CCR6ERe4yzHqR8jhBKZRABzP8V2u2IxzYVCNqy', -- bcrypt hash of 'password123'
        'admin',
        true,
        now(),
        now()
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = '$2a$10$k8Y1THOJM6RF3O0CCR6ERe4yzHqR8jhBKZRABzP8V2u2IxzYVCNqy',
        updated_at = now();
        
    -- Insert a default email agent configuration
    INSERT INTO agent_configurations (id, client_id, name, type, active, system_prompt, temperature, max_tokens, metadata, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        client_uuid,
        'Default Email Agent',
        'email',
        true,
        'You are a helpful AI assistant for Complete Car Loans. Help customers with car loan inquiries in a professional and friendly manner.',
        7,
        500,
        '{"model": "gpt-4", "provider": "openai"}'::jsonb,
        now(),
        now()
    ) ON CONFLICT DO NOTHING;
END $$;

COMMIT;