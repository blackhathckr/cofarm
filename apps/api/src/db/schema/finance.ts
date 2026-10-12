import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { documents } from './documents.ts';
import { costHead, harvestDocumentKind, ledgerType, publishStatus } from './enums.ts';
import { users } from './identity.ts';
import { cycles, memberships, projects } from './projects.ts';

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    cycleId: uuid('cycle_id').references(() => cycles.id, { onDelete: 'restrict' }),
    membershipId: uuid('membership_id').references(() => memberships.id, { onDelete: 'restrict' }),
    type: ledgerType('type').notNull(),
    costHead: costHead('cost_head'),
    amountPaise: bigint('amount_paise', { mode: 'bigint' }).notNull(),
    entryDate: date('entry_date').notNull(),
    note: text('note'),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
    reversesId: uuid('reverses_id'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ledger_project_cycle_type_idx').on(table.projectId, table.cycleId, table.type),
    index('ledger_membership_idx').on(table.membershipId),
    index('ledger_entry_date_idx').on(table.projectId, table.entryDate),
  ],
);

export const harvests = pgTable(
  'harvests',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => cycles.id, { onDelete: 'restrict' }),
    yieldKg: numeric('yield_kg', { precision: 12, scale: 2 }).notNull(),
    /** Variety name to kilograms, e.g. { "Yelakki": "28100", "G9": "40300" }. */
    varietySplit: jsonb('variety_split').$type<Record<string, string>>().notNull().default({}),
    pricePerKgPaise: bigint('price_per_kg_paise', { mode: 'bigint' }).notNull(),
    buyer: text('buyer').notNull(),
    grossRevenuePaise: bigint('gross_revenue_paise', { mode: 'bigint' }).notNull(),
    harvestedOn: date('harvested_on').notNull(),
    status: publishStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('harvests_cycle_key').on(table.cycleId),
    index('harvests_project_status_idx').on(table.projectId, table.status),
  ],
);

export const partnerStatements = pgTable(
  'partner_statements',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => cycles.id, { onDelete: 'restrict' }),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => memberships.id, { onDelete: 'restrict' }),
    grossRevenuePaise: bigint('gross_revenue_paise', { mode: 'bigint' }).notNull(),
    totalCostPaise: bigint('total_cost_paise', { mode: 'bigint' }).notNull(),
    netProceedsPaise: bigint('net_proceeds_paise', { mode: 'bigint' }).notNull(),
    kiaanSharePaise: bigint('kiaan_share_paise', { mode: 'bigint' }).notNull(),
    partnerPoolPaise: bigint('partner_pool_paise', { mode: 'bigint' }).notNull(),
    sharePaise: bigint('share_paise', { mode: 'bigint' }).notNull(),
    contributionPaise: bigint('contribution_paise', { mode: 'bigint' }).notNull(),
    cumulativeSharePaise: bigint('cumulative_share_paise', { mode: 'bigint' }).notNull(),
    costsByHead: jsonb('costs_by_head').$type<Record<string, string>>().notNull().default({}),
    kiaanShareBps: integer('kiaan_share_bps').notNull(),
    cycleNo: smallint('cycle_no').notNull(),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('partner_statements_cycle_membership_key').on(table.cycleId, table.membershipId),
    index('partner_statements_membership_idx').on(table.membershipId),
    index('partner_statements_project_idx').on(table.projectId),
  ],
);

export const harvestDocuments = pgTable(
  'harvest_documents',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    harvestId: uuid('harvest_id')
      .notNull()
      .references(() => harvests.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    kind: harvestDocumentKind('kind').notNull(),
    sortOrder: smallint('sort_order').notNull().default(0),
  },
  (table) => [
    uniqueIndex('harvest_documents_harvest_document_key').on(table.harvestId, table.documentId),
    index('harvest_documents_harvest_kind_idx').on(table.harvestId, table.kind, table.sortOrder),
  ],
);
