ALTER TABLE "documents" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "documents_pending_idx" ON "documents" USING btree ("confirmed_at");