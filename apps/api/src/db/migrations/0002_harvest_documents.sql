CREATE TYPE "public"."harvest_document_kind" AS ENUM('weighment_slip', 'harvest_photo');--> statement-breakpoint
CREATE TABLE "harvest_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"harvest_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"kind" "harvest_document_kind" NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "harvest_documents" ADD CONSTRAINT "harvest_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_documents" ADD CONSTRAINT "harvest_documents_harvest_id_harvests_id_fk" FOREIGN KEY ("harvest_id") REFERENCES "public"."harvests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_documents" ADD CONSTRAINT "harvest_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "harvest_documents_harvest_document_key" ON "harvest_documents" USING btree ("harvest_id","document_id");--> statement-breakpoint
CREATE INDEX "harvest_documents_harvest_kind_idx" ON "harvest_documents" USING btree ("harvest_id","kind","sort_order");