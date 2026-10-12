import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  notExists,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { withinScope } from '../../db/scoped.ts';
import { documents, harvestDocuments, misReports, updatePhotos } from '../../db/schema.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';

export type DocumentRow = typeof documents.$inferSelect;

export type ListFilters = {
  projectId: string | undefined;
  ownerUserId: string | undefined;
  viewerUserId: string;
  type: DocumentRow['type'] | undefined;
  /** Rows whose upload never completed are hidden unless asked for. */
  includePending: boolean;
  limit: number;
  cursor: string | undefined;
};

/**
 * Project content carries no owner and every member of the project is entitled
 * to it; a document with an owner is personal to that one person, and a
 * person-scoped document carries no project at all. An admin's reach is every
 * document, because the console is what manages these files.
 */
function visibleTo(scope: ProjectScope, viewerUserId: string): SQL {
  if (scope.allProjects) return sql`true`;

  const reach = or(
    and(
      isNotNull(documents.projectId),
      withinScope(scope, documents.projectId),
      or(isNull(documents.ownerUserId), eq(documents.ownerUserId, viewerUserId)),
    ),
    eq(documents.ownerUserId, viewerUserId),
  );
  if (reach === undefined) throw new Error('Document visibility produced no condition');
  return reach;
}

export async function listDocuments(
  scope: ProjectScope,
  filters: ListFilters,
): Promise<DocumentRow[]> {
  const conditions: SQL[] = [visibleTo(scope, filters.viewerUserId)];

  if (filters.projectId !== undefined) {
    conditions.push(eq(documents.projectId, filters.projectId));
  }
  if (filters.ownerUserId !== undefined) {
    conditions.push(eq(documents.ownerUserId, filters.ownerUserId));
  }
  if (filters.type !== undefined) {
    conditions.push(eq(documents.type, filters.type));
  }
  if (!filters.includePending) {
    conditions.push(isNotNull(documents.confirmedAt));
  }
  if (filters.cursor !== undefined) {
    conditions.push(lt(documents.id, filters.cursor));
  }

  return db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.id))
    .limit(filters.limit);
}

export async function findVisible(
  scope: ProjectScope,
  viewerUserId: string,
  documentId: string,
): Promise<DocumentRow | null> {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), visibleTo(scope, viewerUserId)))
    .limit(1);
  return row ?? null;
}

/** Unscoped: only for callers that have already established authorisation. */
export async function findDocument(documentId: string): Promise<DocumentRow | null> {
  const [row] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  return row ?? null;
}

export async function findInProject(
  documentId: string,
  projectId: string,
): Promise<DocumentRow | null> {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.projectId, projectId)))
    .limit(1);
  return row ?? null;
}

export async function findAllInProject(
  documentIds: readonly string[],
  projectId: string,
): Promise<DocumentRow[]> {
  if (documentIds.length === 0) return [];

  return db
    .select()
    .from(documents)
    .where(and(inArray(documents.id, [...documentIds]), eq(documents.projectId, projectId)));
}

export async function insertDocument(row: typeof documents.$inferInsert): Promise<DocumentRow> {
  const [created] = await db.insert(documents).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no document row');
  return created;
}

export async function updateDocument(
  documentId: string,
  patch: Partial<typeof documents.$inferInsert>,
): Promise<DocumentRow | null> {
  const [updated] = await db
    .update(documents)
    .set(patch)
    .where(eq(documents.id, documentId))
    .returning();
  return updated ?? null;
}

/**
 * Returns false when another table still references the row. Postgres is asked
 * rather than each owning module, so a new reference is covered the moment its
 * foreign key exists.
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    await db.delete(documents).where(eq(documents.id, documentId));
    return true;
  } catch (error) {
    if (isForeignKeyViolation(error)) return false;
    throw error;
  }
}

const FOREIGN_KEY_VIOLATION = '23503';

function isForeignKeyViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: unknown }).code;
  if (code === FOREIGN_KEY_VIOLATION) return true;
  const cause = (error as { cause?: unknown }).cause;
  return cause === undefined ? false : isForeignKeyViolation(cause);
}

/** Pending rows older than the cutoff, for the orphan sweeper. */
/**
 * These four types only ever exist as an attachment, so one with nothing
 * pointing at it is dead weight in object storage. Agreements, statements and
 * partner documents are deliberately standalone and are never swept.
 */
const ATTACHED_ONLY_TYPES = [
  'mis_report',
  'update_photo',
  'harvest_photo',
  'weighment_slip',
] as const;

export async function listOrphanedAttachments(before: Date, limit: number): Promise<DocumentRow[]> {
  return db
    .select()
    .from(documents)
    .where(
      and(
        isNotNull(documents.confirmedAt),
        lt(documents.createdAt, before),
        inArray(documents.type, [...ATTACHED_ONLY_TYPES]),
        notExists(
          db
            .select({ one: sql`1` })
            .from(misReports)
            .where(eq(misReports.documentId, documents.id)),
        ),
        notExists(
          db
            .select({ one: sql`1` })
            .from(updatePhotos)
            .where(eq(updatePhotos.documentId, documents.id)),
        ),
        notExists(
          db
            .select({ one: sql`1` })
            .from(harvestDocuments)
            .where(eq(harvestDocuments.documentId, documents.id)),
        ),
      ),
    )
    .limit(limit);
}

export async function listAbandoned(before: Date, limit: number): Promise<DocumentRow[]> {
  return db
    .select()
    .from(documents)
    .where(and(isNull(documents.confirmedAt), lt(documents.createdAt, before)))
    .limit(limit);
}
