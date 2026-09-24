ALTER TABLE "whatsapp_deliveries" ADD COLUMN "message_id" text;--> statement-breakpoint
ALTER TABLE "whatsapp_deliveries" DROP COLUMN "media_message_id";--> statement-breakpoint
ALTER TABLE "whatsapp_deliveries" DROP COLUMN "text_message_id";