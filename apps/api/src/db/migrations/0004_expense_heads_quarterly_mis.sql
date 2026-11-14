CREATE TABLE "expense_heads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cost_head" "cost_head" NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_heads_parent_name_key" UNIQUE NULLS NOT DISTINCT("cost_head","parent_id","name")
);
--> statement-breakpoint
ALTER TABLE "expense_heads" ADD CONSTRAINT "expense_heads_parent_id_expense_heads_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."expense_heads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "expense_head_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_expense_head_id_expense_heads_id_fk" FOREIGN KEY ("expense_head_id") REFERENCES "public"."expense_heads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_statements" ADD COLUMN "cost_lines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
DELETE FROM "mis_reports";--> statement-breakpoint
DROP INDEX "mis_reports_project_period_key";--> statement-breakpoint
ALTER TABLE "mis_reports" DROP COLUMN "month";--> statement-breakpoint
ALTER TABLE "mis_reports" DROP COLUMN "narrative";--> statement-breakpoint
ALTER TABLE "mis_reports" DROP COLUMN "outlook";--> statement-breakpoint
ALTER TABLE "mis_reports" DROP COLUMN "source";--> statement-breakpoint
ALTER TABLE "mis_reports" ADD COLUMN "quarter" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "mis_reports" ALTER COLUMN "document_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "mis_reports_project_period_key" ON "mis_reports" USING btree ("project_id","year","quarter");--> statement-breakpoint
DROP TYPE "public"."mis_source";
