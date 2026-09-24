CREATE TYPE "public"."cleanup_status" AS ENUM('running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."report_whatsapp_status" AS ENUM('not_sent', 'queued', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_delivery_status" AS ENUM('queued', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "cleanup_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"retention_boundary" date NOT NULL,
	"deleted_reports_count" integer DEFAULT 0 NOT NULL,
	"deleted_images_count" integer DEFAULT 0 NOT NULL,
	"status" "cleanup_status" DEFAULT 'running' NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "cleanup_logs_deleted_reports_count_nonnegative" CHECK ("cleanup_logs"."deleted_reports_count" >= 0),
	CONSTRAINT "cleanup_logs_deleted_images_count_nonnegative" CHECK ("cleanup_logs"."deleted_images_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"whatsapp_number" text NOT NULL,
	"report_title" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_number" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_cycles_cycle_number_positive" CHECK ("report_cycles"."cycle_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"report_date" date NOT NULL,
	"income" integer NOT NULL,
	"note" text,
	"image_path" text NOT NULL,
	"image_hash" text NOT NULL,
	"ai_detected_income" integer,
	"ai_detected_date" date,
	"ai_confidence" numeric(5, 4),
	"ai_raw_response" jsonb,
	"whatsapp_status" "report_whatsapp_status" DEFAULT 'not_sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_ai_confidence_range" CHECK ("reports"."ai_confidence" is null or ("reports"."ai_confidence" >= 0 and "reports"."ai_confidence" <= 1))
);
--> statement-breakpoint
CREATE TABLE "reset_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"previous_cycle_id" uuid NOT NULL,
	"new_cycle_id" uuid NOT NULL,
	"performed_by" text NOT NULL,
	"reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reset_logs_distinct_cycles" CHECK ("reset_logs"."previous_cycle_id" <> "reset_logs"."new_cycle_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"media_message_id" text,
	"text_message_id" text,
	"status" "whatsapp_delivery_status" DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_deliveries_attempt_number_positive" CHECK ("whatsapp_deliveries"."attempt_number" > 0)
);
--> statement-breakpoint
ALTER TABLE "report_cycles" ADD CONSTRAINT "report_cycles_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_cycle_id_report_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."report_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reset_logs" ADD CONSTRAINT "reset_logs_previous_cycle_id_report_cycles_id_fk" FOREIGN KEY ("previous_cycle_id") REFERENCES "public"."report_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reset_logs" ADD CONSTRAINT "reset_logs_new_cycle_id_report_cycles_id_fk" FOREIGN KEY ("new_cycle_id") REFERENCES "public"."report_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reset_logs" ADD CONSTRAINT "reset_logs_performed_by_user_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_deliveries" ADD CONSTRAINT "whatsapp_deliveries_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cleanup_logs_retention_boundary_idx" ON "cleanup_logs" USING btree ("retention_boundary");--> statement-breakpoint
CREATE UNIQUE INDEX "report_cycles_cycle_number_uidx" ON "report_cycles" USING btree ("cycle_number");--> statement-breakpoint
CREATE UNIQUE INDEX "report_cycles_single_active_uidx" ON "report_cycles" USING btree ("is_active") WHERE "report_cycles"."is_active" = true;--> statement-breakpoint
CREATE INDEX "report_cycles_created_by_idx" ON "report_cycles" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "reports_recipient_id_idx" ON "reports" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "reports_cycle_id_idx" ON "reports" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "reports_report_date_idx" ON "reports" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "reports_image_hash_idx" ON "reports" USING btree ("image_hash");--> statement-breakpoint
CREATE INDEX "reports_recipient_cycle_idx" ON "reports" USING btree ("recipient_id","cycle_id");--> statement-breakpoint
CREATE INDEX "reports_recipient_report_date_idx" ON "reports" USING btree ("recipient_id","report_date");--> statement-breakpoint
CREATE INDEX "reset_logs_previous_cycle_id_idx" ON "reset_logs" USING btree ("previous_cycle_id");--> statement-breakpoint
CREATE INDEX "reset_logs_new_cycle_id_idx" ON "reset_logs" USING btree ("new_cycle_id");--> statement-breakpoint
CREATE INDEX "reset_logs_performed_by_idx" ON "reset_logs" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "whatsapp_deliveries_report_id_idx" ON "whatsapp_deliveries" USING btree ("report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_deliveries_report_attempt_uidx" ON "whatsapp_deliveries" USING btree ("report_id","attempt_number");