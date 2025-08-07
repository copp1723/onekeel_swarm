-- Migration to add missing columns for sessions, agent_configurations, and campaigns tables
-- Generated to fix database schema mismatches causing API failures

-- Add token column to sessions table
ALTER TABLE "sessions" ADD COLUMN "token" text NOT NULL DEFAULT '';
ALTER TABLE "sessions" ADD COLUMN "ip_address" text;
ALTER TABLE "sessions" ADD COLUMN "user_agent" text;
ALTER TABLE "sessions" ADD COLUMN "last_accessed_at" timestamp DEFAULT now() NOT NULL;

-- Add context_note and additional columns to agent_configurations table
ALTER TABLE "agent_configurations" ADD COLUMN "context_note" text;
ALTER TABLE "agent_configurations" ADD COLUMN "api_key" text;
ALTER TABLE "agent_configurations" ADD COLUMN "api_endpoint" text;
ALTER TABLE "agent_configurations" ADD COLUMN "channel_config" jsonb DEFAULT '{}';
ALTER TABLE "agent_configurations" ADD COLUMN "response_delay" integer DEFAULT 0;
ALTER TABLE "agent_configurations" ADD COLUMN "retry_attempts" integer DEFAULT 3;

-- Add active column and additional columns to campaigns table
ALTER TABLE "campaigns" ADD COLUMN "active" boolean DEFAULT true NOT NULL;
ALTER TABLE "campaigns" ADD COLUMN "target_criteria" jsonb DEFAULT '{}';
ALTER TABLE "campaigns" ADD COLUMN "start_date" timestamp;
ALTER TABLE "campaigns" ADD COLUMN "end_date" timestamp;