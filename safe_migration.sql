-- Safe migration script to add missing tables and columns without data loss
-- This script adds only new tables and columns, avoiding enum conversions

-- Create enums (safe to add)
CREATE TYPE "public"."agent_type" AS ENUM('email', 'sms', 'chat', 'voice');
CREATE TYPE "public"."campaign_type" AS ENUM('drip', 'blast', 'trigger');
CREATE TYPE "public"."channel" AS ENUM('email', 'sms', 'chat');
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'converted', 'rejected');
-- Skip user_role enum for now to avoid truncating users table

-- Create new tables (safe additions)
CREATE TABLE "agent_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "agent_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"system_prompt" text NOT NULL,
	"temperature" integer DEFAULT 7,
	"max_tokens" integer DEFAULT 500,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "lead_campaign_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"completed" boolean DEFAULT false,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"channel" "channel" NOT NULL,
	"subject" varchar(255),
	"content" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"category" varchar(100),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add new columns to existing tables (safe additions)
-- Campaigns table enhancements
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'drip' NOT NULL;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "goal" text;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "target_audience" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "agent_id" uuid;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "offer_details" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "email_sequence" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "schedule" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{}'::jsonb;

-- Leads table enhancements
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phone" varchar(20);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;

-- Add foreign key constraints for new tables
ALTER TABLE "lead_campaign_enrollments" ADD CONSTRAINT "lead_campaign_enrollments_lead_id_leads_id_fk" 
    FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "lead_campaign_enrollments" ADD CONSTRAINT "lead_campaign_enrollments_campaign_id_campaigns_id_fk" 
    FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_agent_id_agent_configurations_id_fk" 
    FOREIGN KEY ("agent_id") REFERENCES "public"."agent_configurations"("id") ON DELETE no action ON UPDATE no action;

-- Add unique constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
    END IF;
END $$;

-- Note: We're keeping the role column as text for now to avoid data loss
-- The enum conversion can be done later when we have a safe migration strategy
