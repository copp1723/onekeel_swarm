-- White Label Multi-Tenant Migration
-- This migration adds client/tenant support and white label configuration

-- Create clients table for multi-tenant white label system
CREATE TABLE "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "domain" varchar(255) UNIQUE,
  
  -- White label branding configuration
  "branding_config" jsonb DEFAULT '{
    "companyName": "CCL-3 SWARM",
    "primaryColor": "#2563eb", 
    "secondaryColor": "#1d4ed8",
    "emailFromName": "CCL-3 SWARM",
    "supportEmail": "support@ccl3swarm.com"
  }'::jsonb NOT NULL,
  
  -- Client settings and limits
  "settings" jsonb DEFAULT '{
    "maxLeads": 1000,
    "maxCampaigns": 5,
    "maxAgents": 2,
    "apiRateLimit": 100
  }'::jsonb NOT NULL,
  
  -- Plan and billing info
  "plan" varchar(50) DEFAULT 'basic' NOT NULL,
  "subscription_status" varchar(50) DEFAULT 'active' NOT NULL,
  
  -- Status
  "active" boolean DEFAULT true NOT NULL,
  
  -- Timestamps
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX "clients_name_idx" ON "clients"("name");
CREATE INDEX "clients_domain_idx" ON "clients"("domain");
CREATE INDEX "clients_active_idx" ON "clients"("active");
CREATE INDEX "clients_plan_idx" ON "clients"("plan");

-- Add client_id to existing tables for tenant isolation
-- Start with nullable to avoid breaking existing data
ALTER TABLE "users" ADD COLUMN "client_id" uuid REFERENCES "clients"("id") ON DELETE CASCADE;
ALTER TABLE "campaigns" ADD COLUMN "client_id" uuid REFERENCES "clients"("id") ON DELETE CASCADE;
ALTER TABLE "leads" ADD COLUMN "client_id" uuid REFERENCES "clients"("id") ON DELETE CASCADE;
ALTER TABLE "agent_configurations" ADD COLUMN "client_id" uuid REFERENCES "clients"("id") ON DELETE CASCADE;
ALTER TABLE "sessions" ADD COLUMN "client_id" uuid REFERENCES "clients"("id") ON DELETE CASCADE;

-- Add indexes for tenant isolation performance
CREATE INDEX "users_client_id_idx" ON "users"("client_id");
CREATE INDEX "campaigns_client_id_idx" ON "campaigns"("client_id");
CREATE INDEX "leads_client_id_idx" ON "leads"("client_id");
CREATE INDEX "agent_configurations_client_id_idx" ON "agent_configurations"("client_id");
CREATE INDEX "sessions_client_id_idx" ON "sessions"("client_id");

-- Create a default client for existing data
INSERT INTO "clients" ("id", "name", "domain", "branding_config", "plan") 
VALUES (
  'ccl3-default-client-000000000000'::uuid,
  'CCL-3 SWARM Default',
  'ccl-3-final.onrender.com',
  '{
    "companyName": "CCL-3 SWARM",
    "primaryColor": "#2563eb",
    "secondaryColor": "#1d4ed8", 
    "emailFromName": "CCL-3 SWARM",
    "supportEmail": "support@ccl3swarm.com",
    "logoUrl": null,
    "favicon": null,
    "customCss": null
  }'::jsonb,
  'enterprise'
);

-- Update existing records to belong to the default client
UPDATE "users" SET "client_id" = 'ccl3-default-client-000000000000'::uuid WHERE "client_id" IS NULL;
UPDATE "campaigns" SET "client_id" = 'ccl3-default-client-000000000000'::uuid WHERE "client_id" IS NULL;
UPDATE "leads" SET "client_id" = 'ccl3-default-client-000000000000'::uuid WHERE "client_id" IS NULL;
UPDATE "agent_configurations" SET "client_id" = 'ccl3-default-client-000000000000'::uuid WHERE "client_id" IS NULL;
UPDATE "sessions" SET "client_id" = 'ccl3-default-client-000000000000'::uuid WHERE "client_id" IS NULL;

-- Add some sample white label clients for testing
INSERT INTO "clients" ("name", "domain", "branding_config", "plan") VALUES
(
  'Demo Lead Solutions',
  'demo.localhost',
  '{
    "companyName": "Demo Lead Solutions",
    "primaryColor": "#059669",
    "secondaryColor": "#047857",
    "emailFromName": "Demo Lead Solutions", 
    "supportEmail": "support@demoleads.com",
    "logoUrl": "/logos/demo-client.png",
    "websiteUrl": "https://demoleads.com"
  }'::jsonb,
  'professional'
),
(
  'Local Development',
  'localhost',
  '{
    "companyName": "Local Development",
    "primaryColor": "#7c3aed",
    "secondaryColor": "#5b21b6",
    "emailFromName": "Local Development",
    "supportEmail": "dev@localhost"
  }'::jsonb,
  'basic'
);

-- Create client API keys table for authentication
CREATE TABLE "client_api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "key_name" varchar(255) NOT NULL,
  "api_key" varchar(255) UNIQUE NOT NULL,
  "permissions" jsonb DEFAULT '["read", "write"]'::jsonb NOT NULL,
  "last_used_at" timestamp,
  "expires_at" timestamp,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "client_api_keys_client_id_idx" ON "client_api_keys"("client_id");
CREATE INDEX "client_api_keys_api_key_idx" ON "client_api_keys"("api_key");
CREATE INDEX "client_api_keys_active_idx" ON "client_api_keys"("active");

-- Create white label templates table for client-specific templates
CREATE TABLE "white_label_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "template_type" varchar(50) NOT NULL, -- 'email', 'sms', 'landing_page', etc.
  "name" varchar(255) NOT NULL,
  "subject" varchar(255),
  "content" text NOT NULL,
  "variables" jsonb DEFAULT '[]'::jsonb,
  "is_default" boolean DEFAULT false NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "white_label_templates_client_id_idx" ON "white_label_templates"("client_id");
CREATE INDEX "white_label_templates_type_idx" ON "white_label_templates"("template_type");
CREATE INDEX "white_label_templates_active_idx" ON "white_label_templates"("active");

-- Create client domains table for custom domain mapping
CREATE TABLE "client_domains" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "domain" varchar(255) UNIQUE NOT NULL,
  "subdomain" varchar(255),
  "ssl_enabled" boolean DEFAULT false NOT NULL,
  "verified" boolean DEFAULT false NOT NULL,
  "verification_token" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "verified_at" timestamp
);

CREATE INDEX "client_domains_client_id_idx" ON "client_domains"("client_id");
CREATE INDEX "client_domains_domain_idx" ON "client_domains"("domain");
CREATE INDEX "client_domains_verified_idx" ON "client_domains"("verified");
