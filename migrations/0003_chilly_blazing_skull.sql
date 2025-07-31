CREATE TABLE "agent_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"type" "agent_type" NOT NULL,
	"category" varchar(100) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"system_prompt" text NOT NULL,
	"context_note" text,
	"temperature" integer DEFAULT 7,
	"max_tokens" integer DEFAULT 500,
	"configurable_params" jsonb DEFAULT '[]'::jsonb,
	"default_params" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "agent_templates_name_idx" ON "agent_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "agent_templates_type_idx" ON "agent_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "agent_templates_category_idx" ON "agent_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "agent_templates_is_default_idx" ON "agent_templates" USING btree ("is_default");