CREATE TYPE "public"."agent_type" AS ENUM('email', 'sms', 'chat', 'voice');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('drip', 'blast', 'trigger');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('email', 'sms', 'chat');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'converted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "first_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "last_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DATA TYPE lead_status;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE user_role;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "type" "campaign_type" DEFAULT 'drip' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "target_audience" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "offer_details" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "email_sequence" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "schedule" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "lead_campaign_enrollments" ADD CONSTRAINT "lead_campaign_enrollments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_campaign_enrollments" ADD CONSTRAINT "lead_campaign_enrollments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_agent_id_agent_configurations_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_configurations"("id") ON DELETE no action ON UPDATE no action;