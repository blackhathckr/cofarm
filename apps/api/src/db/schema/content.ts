import {
  boolean,
  date,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { documents } from './documents.ts';
import { milestoneTag, misSource, publishStatus } from './enums.ts';
import { users } from './identity.ts';
import { cycles, projects } from './projects.ts';

export const misReports = pgTable(
  'mis_reports',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    month: smallint('month').notNull(),
    year: smallint('year').notNull(),
    title: text('title').notNull(),
    narrative: text('narrative'),
    outlook: text('outlook'),
    source: misSource('source').notNull().default('uploaded'),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'restrict' }),
    status: publishStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('mis_reports_project_period_key').on(table.projectId, table.year, table.month),
    index('mis_reports_project_status_idx').on(table.projectId, table.status),
  ],
);

export const projectUpdates = pgTable(
  'project_updates',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    cycleId: uuid('cycle_id').references(() => cycles.id, { onDelete: 'set null' }),
    milestoneTag: milestoneTag('milestone_tag').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    /**
     * When the work happened, which may be well before the row was written —
     * a running project's history is backfilled through the console before
     * partners are given access.
     */
    activityDate: date('activity_date').notNull(),
    status: publishStatus('status').notNull().default('draft'),
    /**
     * Updates are posted daily, so notifying on every one trains partners to
     * ignore them. The admin decides per update.
     */
    notifyPartners: boolean('notify_partners').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('project_updates_project_activity_idx').on(table.projectId, table.activityDate),
    index('project_updates_project_status_idx').on(table.projectId, table.status),
  ],
);

export const updatePhotos = pgTable(
  'update_photos',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    updateId: uuid('update_id')
      .notNull()
      .references(() => projectUpdates.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    caption: text('caption'),
    sortOrder: smallint('sort_order').notNull().default(0),
  },
  (table) => [index('update_photos_update_idx').on(table.updateId, table.sortOrder)],
);

export const activityLogEntries = pgTable(
  'activity_log_entries',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    cycleId: uuid('cycle_id').references(() => cycles.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    detail: text('detail'),
    activityDate: date('activity_date').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('activity_log_project_date_idx').on(table.projectId, table.activityDate)],
);
