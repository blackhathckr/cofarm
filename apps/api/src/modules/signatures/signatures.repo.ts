import { and, count, desc, eq, inArray, lt, or, type SQL } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { withinScope } from '../../db/scoped.ts';
import { documents, projects, signatureRequests, users } from '../../db/schema.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';

export type SignatureRow = typeof signatureRequests.$inferSelect;
export type DocumentType = (typeof documents.$inferSelect)['type'];

export type SignatureDetailRow = SignatureRow & {
  projectCode: string;
  projectName: string;
  partnerName: string;
  documentName: string;
  documentType: DocumentType;
};

/** Keyset position: `sent_at` is not unique, so the id breaks ties. */
export type SignatureCursor = {
  sentAt: Date;
  id: string;
};

export type SignatureFilters = {
  status: SignatureRow['status'] | undefined;
  projectId: string | undefined;
  limit: number;
  cursor: SignatureCursor | undefined;
};

const detailColumns = {
  id: signatureRequests.id,
  projectId: signatureRequests.projectId,
  documentId: signatureRequests.documentId,
  userId: signatureRequests.userId,
  status: signatureRequests.status,
  provider: signatureRequests.provider,
  providerRef: signatureRequests.providerRef,
  signedName: signatureRequests.signedName,
  signedIp: signatureRequests.signedIp,
  sentAt: signatureRequests.sentAt,
  signedAt: signatureRequests.signedAt,
  remindedAt: signatureRequests.remindedAt,
  projectCode: projects.code,
  projectName: projects.name,
  partnerName: users.name,
  documentName: documents.originalName,
  documentType: documents.type,
};

export async function listRequests(
  scope: ProjectScope,
  filters: SignatureFilters,
): Promise<SignatureDetailRow[]> {
  const conditions: SQL[] = [withinScope(scope, signatureRequests.projectId)];

  if (filters.status !== undefined) {
    conditions.push(eq(signatureRequests.status, filters.status));
  }
  if (filters.projectId !== undefined) {
    conditions.push(eq(signatureRequests.projectId, filters.projectId));
  }
  if (filters.cursor !== undefined) {
    const page = or(
      lt(signatureRequests.sentAt, filters.cursor.sentAt),
      and(
        eq(signatureRequests.sentAt, filters.cursor.sentAt),
        lt(signatureRequests.id, filters.cursor.id),
      ),
    );
    if (page === undefined) throw new Error('Cursor produced no condition');
    conditions.push(page);
  }

  return joined()
    .where(and(...conditions))
    .orderBy(desc(signatureRequests.sentAt), desc(signatureRequests.id))
    .limit(filters.limit);
}

export async function requestsForUser(
  scope: ProjectScope,
  userId: string,
): Promise<SignatureDetailRow[]> {
  return joined()
    .where(
      and(eq(signatureRequests.userId, userId), withinScope(scope, signatureRequests.projectId)),
    )
    .orderBy(desc(signatureRequests.sentAt), desc(signatureRequests.id));
}

export async function pendingForProject(
  scope: ProjectScope,
  projectId: string,
): Promise<SignatureDetailRow[]> {
  return joined()
    .where(
      and(
        eq(signatureRequests.projectId, projectId),
        eq(signatureRequests.status, 'pending'),
        withinScope(scope, signatureRequests.projectId),
      ),
    )
    .orderBy(desc(signatureRequests.sentAt), desc(signatureRequests.id));
}

/**
 * `userId` is part of the match, not a later check: a request that belongs to
 * another partner is absent rather than forbidden.
 */
export async function findRequest(
  scope: ProjectScope,
  requestId: string,
  userId: string | undefined,
): Promise<SignatureDetailRow | null> {
  const conditions: SQL[] = [
    eq(signatureRequests.id, requestId),
    withinScope(scope, signatureRequests.projectId),
  ];
  if (userId !== undefined) {
    conditions.push(eq(signatureRequests.userId, userId));
  }

  const [row] = await joined()
    .where(and(...conditions))
    .limit(1);
  return row ?? null;
}

export async function insertRequest(
  row: typeof signatureRequests.$inferInsert,
): Promise<SignatureRow> {
  const [created] = await db.insert(signatureRequests).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no signature request row');
  return created;
}

export async function patchRequest(
  requestId: string,
  patch: Partial<typeof signatureRequests.$inferInsert>,
): Promise<SignatureRow | null> {
  const [updated] = await db
    .update(signatureRequests)
    .set(patch)
    .where(eq(signatureRequests.id, requestId))
    .returning();
  return updated ?? null;
}

export async function stampReminded(
  requestIds: readonly string[],
  remindedAt: Date,
): Promise<number> {
  if (requestIds.length === 0) return 0;
  const updated = await db
    .update(signatureRequests)
    .set({ remindedAt })
    .where(inArray(signatureRequests.id, [...requestIds]))
    .returning({ id: signatureRequests.id });
  return updated.length;
}

function joined() {
  return db
    .select(detailColumns)
    .from(signatureRequests)
    .innerJoin(projects, eq(projects.id, signatureRequests.projectId))
    .innerJoin(users, eq(users.id, signatureRequests.userId))
    .innerJoin(documents, eq(documents.id, signatureRequests.documentId));
}

export async function countPendingForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(signatureRequests)
    .where(and(eq(signatureRequests.userId, userId), eq(signatureRequests.status, 'pending')));
  return row?.total ?? 0;
}
