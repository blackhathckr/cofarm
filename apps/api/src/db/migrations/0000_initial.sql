CREATE TYPE "public"."agreement_status" AS ENUM('not_sent', 'sent', 'signed');--> statement-breakpoint
CREATE TYPE "public"."cost_head" AS ENUM('lease_land', 'saplings_infra', 'manure_nutrition', 'labour_maintenance', 'misc');--> statement-breakpoint
CREATE TYPE "public"."cycle_status" AS ENUM('planned', 'active', 'harvested', 'closed');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('mis_report', 'agreement', 'statement', 'weighment_slip', 'harvest_photo', 'update_photo', 'partner_document', 'other');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('mis_report', 'project_update', 'partner_statement', 'harvest', 'message', 'document');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ledger_type" AS ENUM('contribution', 'expense', 'revenue', 'payout', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'exited');--> statement-breakpoint
CREATE TYPE "public"."milestone_stage" AS ENUM('land_prep', 'planting', 'growth', 'bunch_formation', 'harvest');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('done', 'active', 'upcoming');--> statement-breakpoint
CREATE TYPE "public"."milestone_tag" AS ENUM('land_prep', 'planting', 'growth', 'irrigation', 'nutrition', 'disease_mgmt', 'bunch_formation', 'harvest', 'general');--> statement-breakpoint
CREATE TYPE "public"."mis_source" AS ENUM('generated', 'uploaded');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('mis_published', 'update_published', 'harvest_published', 'message_received', 'document_issued', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planned', 'active', 'harvested', 'closed');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."share_basis" AS ENUM('pro_rata_contribution', 'fixed_pct');--> statement-breakpoint
CREATE TYPE "public"."signature_status" AS ENUM('pending', 'signed', 'declined', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."thread_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."user_kind" AS ENUM('partner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "auth_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mobile" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" "device_platform" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_pk" PRIMARY KEY("role_id","permission")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" "user_kind" NOT NULL,
	"name" text NOT NULL,
	"mobile" text,
	"email" text,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"password_hash" text,
	"totp_secret" text,
	"totp_enabled_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cycle_milestones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"stage" "milestone_stage" NOT NULL,
	"status" "milestone_status" DEFAULT 'upcoming' NOT NULL,
	"planned_from" date,
	"planned_to" date,
	"actual_from" date,
	"actual_to" date,
	"sort_order" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"cycle_no" smallint NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"expected_harvest_from" date,
	"expected_harvest_to" date,
	"status" "cycle_status" DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"contribution_paise" bigint NOT NULL,
	"share_basis" "share_basis" DEFAULT 'pro_rata_contribution' NOT NULL,
	"share_pct_bps" integer,
	"agreement_status" "agreement_status" DEFAULT 'not_sent' NOT NULL,
	"agreement_signed_at" timestamp with time zone,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"joined_at" date NOT NULL,
	"exited_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"acreage_acres" numeric(6, 2) NOT NULL,
	"variety" text NOT NULL,
	"start_date" date NOT NULL,
	"status" "project_status" DEFAULT 'planned' NOT NULL,
	"capacity_paise" bigint DEFAULT 0 NOT NULL,
	"kiaan_share_bps" integer DEFAULT 5000 NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid,
	"owner_user_id" uuid,
	"type" "document_type" NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "signature_status" DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"provider_ref" text,
	"signed_name" text,
	"signed_ip" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signed_at" timestamp with time zone,
	"reminded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "harvests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"yield_kg" numeric(12, 2) NOT NULL,
	"variety_split" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price_per_kg_paise" bigint NOT NULL,
	"buyer" text NOT NULL,
	"gross_revenue_paise" bigint NOT NULL,
	"harvested_on" date NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"cycle_id" uuid,
	"membership_id" uuid,
	"type" "ledger_type" NOT NULL,
	"cost_head" "cost_head",
	"amount_paise" bigint NOT NULL,
	"entry_date" date NOT NULL,
	"note" text,
	"document_id" uuid,
	"reverses_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_statements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"gross_revenue_paise" bigint NOT NULL,
	"total_cost_paise" bigint NOT NULL,
	"net_proceeds_paise" bigint NOT NULL,
	"kiaan_share_paise" bigint NOT NULL,
	"partner_pool_paise" bigint NOT NULL,
	"share_paise" bigint NOT NULL,
	"contribution_paise" bigint NOT NULL,
	"cumulative_share_paise" bigint NOT NULL,
	"costs_by_head" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"kiaan_share_bps" integer NOT NULL,
	"cycle_no" smallint NOT NULL,
	"document_id" uuid,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_log_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"cycle_id" uuid,
	"title" text NOT NULL,
	"detail" text,
	"activity_date" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mis_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"month" smallint NOT NULL,
	"year" smallint NOT NULL,
	"title" text NOT NULL,
	"narrative" text,
	"outlook" text,
	"source" "mis_source" DEFAULT 'uploaded' NOT NULL,
	"document_id" uuid,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_updates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"cycle_id" uuid,
	"milestone_tag" "milestone_tag" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"activity_date" date NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"notify_partners" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "update_photos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"update_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"caption" text,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text,
	"status" "thread_status" DEFAULT 'open' NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"document_id" uuid,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"project_id" uuid,
	"action" text NOT NULL,
	"entity_table" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"request_id" text,
	"ip" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"user_id" uuid NOT NULL,
	"route" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"last_error" text,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"entity_type" "entity_type",
	"entity_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"delivered_at" timestamp with time zone,
	"delivery_error" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "read_receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_milestones" ADD CONSTRAINT "cycle_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_milestones" ADD CONSTRAINT "cycle_milestones_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_statements" ADD CONSTRAINT "partner_statements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_statements" ADD CONSTRAINT "partner_statements_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_statements" ADD CONSTRAINT "partner_statements_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_statements" ADD CONSTRAINT "partner_statements_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log_entries" ADD CONSTRAINT "activity_log_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log_entries" ADD CONSTRAINT "activity_log_entries_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log_entries" ADD CONSTRAINT "activity_log_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mis_reports" ADD CONSTRAINT "mis_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mis_reports" ADD CONSTRAINT "mis_reports_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mis_reports" ADD CONSTRAINT "mis_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_photos" ADD CONSTRAINT "update_photos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_photos" ADD CONSTRAINT "update_photos_update_id_project_updates_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."project_updates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_photos" ADD CONSTRAINT "update_photos_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_receipts" ADD CONSTRAINT "read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_receipts" ADD CONSTRAINT "read_receipts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_challenges_mobile_idx" ON "auth_challenges" USING btree ("mobile","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash_key" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_key" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_mobile_key" ON "users" USING btree ("mobile");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_kind_status_idx" ON "users" USING btree ("kind","status");--> statement-breakpoint
CREATE UNIQUE INDEX "cycle_milestones_cycle_stage_key" ON "cycle_milestones" USING btree ("cycle_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "cycles_project_no_key" ON "cycles" USING btree ("project_id","cycle_no");--> statement-breakpoint
CREATE INDEX "cycles_project_status_idx" ON "cycles" USING btree ("project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_project_user_key" ON "memberships" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_status_idx" ON "memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "memberships_project_status_idx" ON "memberships" USING btree ("project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_code_key" ON "projects" USING btree ("code");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_storage_key_key" ON "documents" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "documents_project_type_idx" ON "documents" USING btree ("project_id","type");--> statement-breakpoint
CREATE INDEX "documents_owner_idx" ON "documents" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "signature_requests_user_status_idx" ON "signature_requests" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "signature_requests_project_idx" ON "signature_requests" USING btree ("project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "harvests_cycle_key" ON "harvests" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "harvests_project_status_idx" ON "harvests" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "ledger_project_cycle_type_idx" ON "ledger_entries" USING btree ("project_id","cycle_id","type");--> statement-breakpoint
CREATE INDEX "ledger_membership_idx" ON "ledger_entries" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "ledger_entry_date_idx" ON "ledger_entries" USING btree ("project_id","entry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_statements_cycle_membership_key" ON "partner_statements" USING btree ("cycle_id","membership_id");--> statement-breakpoint
CREATE INDEX "partner_statements_membership_idx" ON "partner_statements" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "partner_statements_project_idx" ON "partner_statements" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "activity_log_project_date_idx" ON "activity_log_entries" USING btree ("project_id","activity_date");--> statement-breakpoint
CREATE UNIQUE INDEX "mis_reports_project_period_key" ON "mis_reports" USING btree ("project_id","year","month");--> statement-breakpoint
CREATE INDEX "mis_reports_project_status_idx" ON "mis_reports" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "project_updates_project_activity_idx" ON "project_updates" USING btree ("project_id","activity_date");--> statement-breakpoint
CREATE INDEX "project_updates_project_status_idx" ON "project_updates" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "update_photos_update_idx" ON "update_photos" USING btree ("update_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "message_threads_project_user_key" ON "message_threads" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "message_threads_status_idx" ON "message_threads" USING btree ("status","last_message_at");--> statement-breakpoint
CREATE INDEX "messages_thread_sent_idx" ON "messages" USING btree ("thread_id","sent_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_table","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_at_idx" ON "audit_logs" USING btree ("actor_user_id","at");--> statement-breakpoint
CREATE INDEX "audit_logs_project_at_idx" ON "audit_logs" USING btree ("project_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_user_route_key" ON "idempotency_keys" USING btree ("user_id","route","key");--> statement-breakpoint
CREATE INDEX "jobs_claim_idx" ON "jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_dedupe_key_key" ON "jobs" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "read_receipts_user_entity_key" ON "read_receipts" USING btree ("user_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "read_receipts_entity_idx" ON "read_receipts" USING btree ("entity_type","entity_id");