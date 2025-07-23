-- Fresh database schema
CREATE TYPE "public"."campaign_type" AS ENUM('drip', 'blast', 'trigger');
CREATE TYPE "public"."channel" AS ENUM('email', 'sms', 'chat');
CREATE TYPE "public"."communication_direction" AS ENUM('inbound', 'outbound');
CREATE TYPE "public"."communication_status" AS ENUM('pending', 'sent', 'delivered', 'failed', 'received');
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'converted', 'rejected');
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'agent', 'viewer');

CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resource_id" uuid,
	"changes" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "campaign_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"delay_minutes" integer DEFAULT 0,
	"conditions" jsonb DEFAULT '{}'::jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "campaign_type" DEFAULT 'drip' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"target_criteria" jsonb DEFAULT '{}'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"campaign_id" uuid,
	"channel" "channel" NOT NULL,
	"direction" "communication_direction" NOT NULL,
	"status" "communication_status" DEFAULT 'pending' NOT NULL,
	"subject" varchar(255),
	"content" text NOT NULL,
	"external_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"scheduled_for" timestamp,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "lead_campaign_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"current_step" integer DEFAULT 0,
	"completed" boolean DEFAULT false NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"last_processed_at" timestamp
);

CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"email" varchar(255),
	"phone" varchar(20),
	"source" varchar(100) DEFAULT 'website' NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"qualification_score" integer DEFAULT 0,
	"credit_score" integer,
	"annual_income" integer,
	"employer" varchar(255),
	"job_title" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_contacted_at" timestamp
);

CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
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

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"role" "user_role" DEFAULT 'agent' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "communications" ADD CONSTRAINT "communications_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "communications" ADD CONSTRAINT "communications_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "lead_campaign_enrollments" ADD CONSTRAINT "lead_campaign_enrollments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "lead_campaign_enrollments" ADD CONSTRAINT "lead_campaign_enrollments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource","resource_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
CREATE INDEX "campaign_steps_campaign_id_idx" ON "campaign_steps" USING btree ("campaign_id");
CREATE INDEX "campaign_steps_order_idx" ON "campaign_steps" USING btree ("campaign_id","step_order");
CREATE INDEX "campaigns_name_idx" ON "campaigns" USING btree ("name");
CREATE INDEX "campaigns_active_idx" ON "campaigns" USING btree ("active");
CREATE INDEX "campaigns_type_idx" ON "campaigns" USING btree ("type");
CREATE INDEX "communications_lead_id_idx" ON "communications" USING btree ("lead_id");
CREATE INDEX "communications_campaign_id_idx" ON "communications" USING btree ("campaign_id");
CREATE INDEX "communications_channel_idx" ON "communications" USING btree ("channel");
CREATE INDEX "communications_status_idx" ON "communications" USING btree ("status");
CREATE INDEX "communications_created_at_idx" ON "communications" USING btree ("created_at");
CREATE INDEX "enrollments_lead_campaign_idx" ON "lead_campaign_enrollments" USING btree ("lead_id","campaign_id");
CREATE INDEX "enrollments_status_idx" ON "lead_campaign_enrollments" USING btree ("status");
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");
CREATE INDEX "leads_phone_idx" ON "leads" USING btree ("phone");
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");
CREATE INDEX "leads_source_idx" ON "leads" USING btree ("source");
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");
CREATE INDEX "sessions_token_idx" ON "sessions" USING btree ("token");
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");
CREATE INDEX "templates_name_idx" ON "templates" USING btree ("name");
CREATE INDEX "templates_channel_idx" ON "templates" USING btree ("channel");
CREATE INDEX "templates_category_idx" ON "templates" USING btree ("category");
CREATE INDEX "templates_active_idx" ON "templates" USING btree ("active");
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");