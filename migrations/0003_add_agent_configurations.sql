-- Add agent_configurations table
CREATE TYPE "public"."agent_type" AS ENUM('email', 'sms', 'chat', 'voice');

CREATE TABLE "agent_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "agent_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	
	-- Core Configuration
	"system_prompt" text NOT NULL,
	"context_note" text, -- New field for additional context
	"temperature" integer DEFAULT 7,
	"max_tokens" integer DEFAULT 500,
	
	-- API Configuration
	"api_key" varchar(255),
	"api_endpoint" varchar(500),
	
	-- Channel-specific settings
	"channel_config" jsonb DEFAULT '{}'::jsonb,
	
	-- Behavioral settings
	"response_delay" integer DEFAULT 0,
	"retry_attempts" integer DEFAULT 3,
	
	-- Metadata
	"metadata" jsonb DEFAULT '{}'::jsonb,
	
	-- Timestamps
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX "agent_configurations_name_idx" ON "agent_configurations" USING btree ("name");
CREATE INDEX "agent_configurations_type_idx" ON "agent_configurations" USING btree ("type");
CREATE INDEX "agent_configurations_active_idx" ON "agent_configurations" USING btree ("active");