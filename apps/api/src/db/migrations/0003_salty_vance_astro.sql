ALTER TABLE "auth_challenges" ALTER COLUMN "code_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD COLUMN "provider_ref" text;