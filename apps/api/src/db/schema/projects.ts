import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import {
  agreementStatus,
  cycleStatus,
  membershipStatus,
  milestoneStage,
  milestoneStatus,
  projectStatus,
  shareBasis,
} from './enums.ts';
import { users } from './identity.ts';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    location: text('location').notNull(),
    acreageAcres: numeric('acreage_acres', { precision: 6, scale: 2 }).notNull(),
    variety: text('variety').notNull(),
    startDate: date('start_date').notNull(),
    status: projectStatus('status').notNull().default('planned'),
    capacityPaise: bigint('capacity_paise', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    kiaanShareBps: integer('kiaan_share_bps').notNull().default(5000),
    latitude: numeric('latitude', { precision: 9, scale: 6 }),
    longitude: numeric('longitude', { precision: 9, scale: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('projects_code_key').on(table.code),
    index('projects_status_idx').on(table.status),
  ],
);

export const cycles = pgTable(
  'cycles',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    cycleNo: smallint('cycle_no').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    expectedHarvestFrom: date('expected_harvest_from'),
    expectedHarvestTo: date('expected_harvest_to'),
    status: cycleStatus('status').notNull().default('planned'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('cycles_project_no_key').on(table.projectId, table.cycleNo),
    index('cycles_project_status_idx').on(table.projectId, table.status),
  ],
);

export const cycleMilestones = pgTable(
  'cycle_milestones',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => cycles.id, { onDelete: 'cascade' }),
    stage: milestoneStage('stage').notNull(),
    status: milestoneStatus('status').notNull().default('upcoming'),
    plannedFrom: date('planned_from'),
    plannedTo: date('planned_to'),
    actualFrom: date('actual_from'),
    actualTo: date('actual_to'),
    sortOrder: smallint('sort_order').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('cycle_milestones_cycle_stage_key').on(table.cycleId, table.stage)],
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    contributionPaise: bigint('contribution_paise', { mode: 'bigint' }).notNull(),
    shareBasis: shareBasis('share_basis').notNull().default('pro_rata_contribution'),
    sharePctBps: integer('share_pct_bps'),
    agreementStatus: agreementStatus('agreement_status').notNull().default('not_sent'),
    agreementSignedAt: timestamp('agreement_signed_at', { withTimezone: true }),
    status: membershipStatus('status').notNull().default('active'),
    joinedAt: date('joined_at').notNull(),
    exitedAt: date('exited_at'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('memberships_project_user_key').on(table.projectId, table.userId),
    index('memberships_user_status_idx').on(table.userId, table.status),
    index('memberships_project_status_idx').on(table.projectId, table.status),
  ],
);

export const projectsRelations = relations(projects, ({ many }) => ({
  cycles: many(cycles),
  memberships: many(memberships),
}));

export const cyclesRelations = relations(cycles, ({ one, many }) => ({
  project: one(projects, { fields: [cycles.projectId], references: [projects.id] }),
  milestones: many(cycleMilestones),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  project: one(projects, { fields: [memberships.projectId], references: [projects.id] }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));
