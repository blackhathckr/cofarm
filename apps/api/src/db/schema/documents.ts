import { bigint, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { documentType, signatureStatus } from './enums.ts';
import { users } from './identity.ts';
import { projects } from './projects.ts';

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'restrict' }),
    ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'restrict' }),
    type: documentType('type').notNull(),
    storageKey: text('storage_key').notNull(),
    originalName: text('original_name').notNull(),
    mime: text('mime').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('documents_storage_key_key').on(table.storageKey),
    index('documents_pending_idx').on(table.confirmedAt),
    index('documents_project_type_idx').on(table.projectId, table.type),
    index('documents_owner_idx').on(table.ownerUserId),
  ],
);

export const signatureRequests = pgTable(
  'signature_requests',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: signatureStatus('status').notNull().default('pending'),
    provider: text('provider').notNull().default('manual'),
    providerRef: text('provider_ref'),
    signedName: text('signed_name'),
    signedIp: text('signed_ip'),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    signedAt: timestamp('signed_at', { withTimezone: true }),
    remindedAt: timestamp('reminded_at', { withTimezone: true }),
  },
  (table) => [
    index('signature_requests_user_status_idx').on(table.userId, table.status),
    index('signature_requests_project_idx').on(table.projectId, table.status),
  ],
);
