# Scope coverage

Every line of the approved solution architecture (§2.1 partner app, §2.2 admin
console, §2.3 cross-cutting) against where it is implemented and the flow
assertion that proves it. The solution-architecture document supersedes the
client handoff document wherever the two differ.

Run `bash docs/flows/all.sh` to execute every assertion referenced below.
It currently reports **327 passed / 0 failed** across nine sections.
`pnpm db:seed:demo` layers a worked cycle on top of the base seed so the P&L,
MIS and chat screens have content for a walkthrough.
Phase 2 items (§2.1.6 sign-up/KYC/payment, §2.2.9 sign-ups & payments) are
explicitly out of scope and are not implemented.

## §2.1 Partner mobile application

| #   | Scope item                                                           | Implementation                                                                                      | Verified by                                         |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | Contribution summary, project code, variety, expected harvest window | `features/dashboard/screens/DashboardScreen.tsx`, `partnerProjectCardSchema` + `partnerCycleSchema` | `dashboard.sh` — partner dashboard                  |
| 1   | Current cycle progress bar                                           | `partnerCycleSchema.progressBps`, weighted per stage in `@cofarm/core/cycle`                        | `smoke.sh` — milestone progress is weighted         |
| 1   | Unread notification banner                                           | `partnerDashboardSchema.banner`                                                                     | `dashboard.sh` — notifications                      |
| 1   | Latest report and update at a glance                                 | `features/dashboard`                                                                                | `scope.sh` — §2.1.1                                 |
| 1   | Project switcher for multi-project partners                          | `partnerDashboardSchema.projects`, scope resolved from live memberships per request                 | `scope.sh` — §2.1.1 project switcher                |
| 2   | Project summary with status badge                                    | `features/project/screens/ProjectStatusScreen.tsx`                                                  | `dashboard.sh`, `smoke.sh`                          |
| 2   | Milestone timeline with the active stage highlighted                 | `components/ui/MilestoneTimeline.tsx`, `cycle_milestones`                                           | `smoke.sh` — the milestone sequence                 |
| 2   | Dated feed of admin updates                                          | `features/project` + `GET /v1/projects/:id/updates`                                                 | `content.sh` — the partner feed                     |
| 2   | Farm photo gallery                                                   | `features/project/components/PhotoGallery.tsx`, `components/ui/PhotoGrid.tsx`                       | `content.sh`, `documents.sh`                        |
| 2   | Farm location on map                                                 | `projects.latitude` / `.longitude`                                                                  | `scope.sh` — §2.1.2                                 |
| 3   | Latest monthly report with unread badge                              | `features/mis/components/MisLatestCard.tsx`                                                         | `content.sh` — the unread badge                     |
| 3   | In-app PDF viewing and download                                      | `features/mis/{components/MisReportDialog.tsx,hooks/use-mis-download.ts}`                           | `documents.sh` — signed url round-trip              |
| 3   | Full archive by month and year                                       | `GET /v1/projects/:id/mis`, cursor keyed on year-month                                              | `content.sh` — the MIS archive                      |
| 3   | Automatic read receipt on open                                       | `read_receipts`, written on read not on an acknowledge step                                         | `content.sh` — a silent read receipt                |
| 3   | Filter by project                                                    | `GET /v1/me/mis/latest` across projects, per-project archive otherwise                              | `scope.sh` — §2.1.3                                 |
| 4   | Yield, variety split, realised price, gross revenue                  | `harvests`, `features/harvest`                                                                      | `money.sh` — the computed gross                     |
| 4   | Full cost breakdown to net proceeds                                  | `@cofarm/core/pnl`, `features/harvest/components/PnlBreakdown.tsx`                                  | `money.sh` — the P&L preview                        |
| 4   | Partner share from the agreed formula                                | `computeCyclePnl` + `splitProRata`, largest remainder                                               | `money.sh` — reproduces the signed-off split        |
| 4   | Per-cycle and cumulative view, cycle selector                        | `partner_statements` per cycle, `GET /v1/me/statements` totals                                      | `money.sh` — cumulative totals; `scope.sh` — §2.1.4 |
| 4   | Export the statement as PDF                                          | `harvest.statement-pdf.tsx` (`@react-pdf/renderer`), shared via `expo-sharing`                      | `money.sh` — the statement renders as a PDF         |
| 5   | Direct thread with the admin team                                    | `features/chat`, `message_threads` created on first access                                          | `messaging.sh` — a partner opens their thread       |
| 5   | Document library: agreement, reports, statements                     | `features/chat` document section, `GET /v1/documents`                                               | `documents.sh`, `scope.sh`                          |
| 5   | Raise queries                                                        | `POST /v1/projects/:projectId/thread/messages`                                                      | `messaging.sh` — the admin inbox sees it            |
| 5   | Push notification on every significant event                         | `notifications` + `push-fanout` job, `expo-notifications`                                           | `content.sh`, `money.sh`, `scope.sh` — §2.3         |
| 6   | Sign-up, KYC & payment                                               | **Phase 2, out of scope**                                                                           | —                                                   |

## §2.2 Admin web console

| #   | Scope item                                             | Implementation                                                                  | Verified by                                                           |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | Active partners, projects, acreage, pending counts     | `dashboard.service.ts`, `adminDashboardCountsSchema`                            | `dashboard.sh`; `scope.sh` — total acreage                            |
| 1   | Task list colour-coded by urgency                      | `dashboardTaskSchema.urgency`, derived from real state                          | `dashboard.sh` — the task list reacts to real state                   |
| 2   | Create partner accounts, no self sign-up               | `POST /v1/partners` (admin-only)                                                | `partners.sh` — admin-provisioned                                     |
| 2   | Profile, contact and contribution details              | `users` + `memberships`                                                         | `partners.sh` — create, duplicate, update                             |
| 2   | Map a partner to one or more projects                  | `POST /v1/partners/:id/memberships`                                             | `partners.sh` — memberships; `scope.sh` — switcher                    |
| 2   | Upload the partner's documents                         | `POST /v1/documents/upload-url` + confirm                                       | `documents.sh` — presigned upload                                     |
| 2   | Search by name, mobile or project code                 | `partners.repo.ts` search over name, mobile, email, project code                | `scope.sh` — §2.2.2                                                   |
| 2   | Partner detail with document and message history       | `features/partners/pages/PartnerDetailPage.tsx`                                 | `scope.sh` — §2.2.2                                                   |
| 2   | Deactivate or remove access                            | `PATCH /v1/partners/:id` status, membership exit, account deletion              | `partners.sh`, `account.sh`                                           |
| 3   | Generate a report from platform data                   | `mis.service.ts` compose — costs by head, activity log, milestones, photographs | `content.sh` — compose pulls real figures                             |
| 3   | Admin adds narrative and outlook before publishing     | `mis_reports.narrative` / `.outlook`                                            | `content.sh` — MIS publish                                            |
| 3   | Manual PDF upload retained as a fallback               | `source: 'uploaded'` requires its document                                      | `content.sh` — a report needs its PDF                                 |
| 3   | Publishing notifies every mapped partner in one action | `notifications` fan-out, idempotent                                             | `content.sh` — publish notifies                                       |
| 4   | Record cost heads against a project and cycle          | `ledger_entries` typed `expense` with a `cost_head`                             | `money.sh` — the four cost heads                                      |
| 4   | Supporting document attachment                         | `ledger_entries.document_id`                                                    | `money.sh`, `documents.sh`                                            |
| 4   | Feeds the P&L automatically                            | `ledger.costTotalsByHead` into `computeCyclePnl`                                | `money.sh` — the figures reconcile                                    |
| 5   | Yield, variety, realised price, buyer                  | `harvests`                                                                      | `money.sh` — the draft                                                |
| 5   | Weighment slips and harvest photographs                | `harvest_documents`                                                             | `money.sh`, `documents.sh`                                            |
| 5   | P&L and every partner's share computed on save         | `previewHarvest`                                                                | `money.sh` — the P&L preview                                          |
| 5   | Record locked once published                           | publish is irreversible, append-only revenue entry                              | `money.sh` — publishing is irreversible                               |
| 6   | Update with milestone tag, title, description, photos  | `project_updates` + `update_photos`                                             | `content.sh` — updates                                                |
| 6   | Activity date settable in the past (backfill)          | `activity_date` independent of `created_at`                                     | `content.sh` — backfill; `scope.sh` — §2.3                            |
| 6   | Choose whether an update notifies partners             | `project_updates.notify_partners`                                               | `content.sh` — publish notifies                                       |
| 6   | Save as draft or publish                               | `publish_status`                                                                | `content.sh` — a draft stays internal                                 |
| 7   | MIS read receipts per partner with timestamps          | `read_receipts`, `GET /v1/tracking/receipts`                                    | `content.sh`, `scope.sh` — §2.2.7                                     |
| 7   | Bulk reminder to partners who have not opened a report | tracking reminder                                                               | `scope.sh` — §2.2.7                                                   |
| 7   | Query inbox with inline reply and resolution status    | `features/messaging`, `thread_status`                                           | `messaging.sh` — resolve and reopen                                   |
| 7   | Update history with seen-by counters                   | update receipts `readCount` / `totalCount`                                      | `scope.sh` — §2.2.7                                                   |
| 8   | Create and manage admin users                          | `POST /v1/admin/users`                                                          | `account.sh` — creating a second admin                                |
| 8   | Create roles, assign permissions, assign roles         | `roles`, `role_permissions`, `user_roles` — all data                            | `roles.sh` — a composed role grants exactly its permissions           |
| 8   | Activate, deactivate, remove                           | `PATCH` / `DELETE /v1/admin/users/:id`                                          | `account.sh` — the last superadmin                                    |
| 8   | Superadmin holds all permissions by definition         | `ALL_PERMISSIONS` at seed                                                       | `smoke.sh`; `roles.sh` — operations and finance hold disjoint subsets |
| 9   | Sign-ups & payments                                    | **Phase 2, out of scope**                                                       | —                                                                     |

## §2.3 Cross-cutting

| Scope item                                                 | Implementation                                      | Verified by                                                                                   |
| ---------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Partner OTP login (no DLT registration)                    | `AUTH_PROVIDER` seam, `dev` echoes the code locally | `smoke.sh` — partner OTP sign-in                                                              |
| Admin email, password and two-factor                       | scrypt via `node:crypto`, RFC 6238 TOTP             | `smoke.sh`, `account.sh` — two-factor enrolment                                               |
| RBAC stored as data, not code                              | `roles` / `role_permissions` tables                 | `roles.sh` — widening or narrowing a role applies on the next request, no re-login, no deploy |
| Notifications on MIS, update, harvest, message, document   | `notification_type` enum, five event types          | `content.sh`, `money.sh`, `messaging.sh`, `scope.sh`                                          |
| Per-partner delivery tracking                              | `notifications.delivered_at` / `.delivery_error`    | `dashboard.sh` — notifications                                                                |
| Admin decides per update; significant events always notify | `notify_partners` on updates only                   | `content.sh` — publish notifies                                                               |
| Server-side PDF for statements and generated MIS reports   | `@react-pdf/renderer`                               | `money.sh`, `content.sh`                                                                      |
| Audit trail with actor, timestamp, before/after            | `audit_logs`, written by every mutating service     | `scope.sh` — §2.3 the audit trail                                                             |
| Account deletion, store-mandatory                          | anonymise the user, retain the financial record     | `account.sh` — deletion                                                                       |
| Historical backfill of every operational record            | past dates on updates, costs, harvest, reports      | `content.sh`, `scope.sh` — §2.3 backfill                                                      |

## Deliberately not added

- **An audit-trail viewer.** §2.3 requires the trail to be _recorded_, which it
  is; no screen for reading it is in scope. The permission that gated the
  job-queue viewer was named `audit.read`, which would have offered a
  superadmin an "audit" grant that actually hands over the background job
  queue. It is now `jobs.read`, and the finance role no longer carries it.
