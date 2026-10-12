import { and, asc, eq, inArray } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { withinScope } from '../../db/scoped.ts';
import { memberships, projects, readReceipts, users } from '../../db/schema.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';

export type ReadReceiptRow = typeof readReceipts.$inferSelect;

export type EntityKey = {
  projectId: string;
  entityType: ReadReceiptRow['entityType'];
  entityId: string;
};

export type RecipientRow = {
  userId: string;
  name: string;
  readAt: Date | null;
};

export type ProjectHeaderRow = {
  code: string;
  name: string;
};

export async function findProjectHeader(
  scope: ProjectScope,
  projectId: string,
): Promise<ProjectHeaderRow | null> {
  const [row] = await db
    .select({ code: projects.code, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, projectId), withinScope(scope, projects.id)))
    .limit(1);
  return row ?? null;
}

export async function hasActiveMembership(userId: string, projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.projectId, projectId),
        eq(memberships.status, 'active'),
      ),
    )
    .limit(1);
  return row !== undefined;
}

/**
 * Ignoring the conflict keeps the first open as the read moment; the tracking
 * screen reports when a partner saw the artefact, not when they last reopened it.
 */
export async function upsertReceipt(row: typeof readReceipts.$inferInsert): Promise<void> {
  await db
    .insert(readReceipts)
    .values(row)
    .onConflictDoNothing({
      target: [readReceipts.userId, readReceipts.entityType, readReceipts.entityId],
    });
}

export async function recipientsFor(scope: ProjectScope, key: EntityKey): Promise<RecipientRow[]> {
  return db
    .select({ userId: memberships.userId, name: users.name, readAt: readReceipts.readAt })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .leftJoin(
      readReceipts,
      and(
        eq(readReceipts.userId, memberships.userId),
        eq(readReceipts.projectId, key.projectId),
        eq(readReceipts.entityType, key.entityType),
        eq(readReceipts.entityId, key.entityId),
      ),
    )
    .where(
      and(
        eq(memberships.projectId, key.projectId),
        eq(memberships.status, 'active'),
        withinScope(scope, memberships.projectId),
      ),
    )
    .orderBy(asc(users.name), asc(memberships.userId));
}

export async function deleteReceiptsFor(input: EntityKey): Promise<number> {
  const removed = await db
    .delete(readReceipts)
    .where(
      and(
        eq(readReceipts.projectId, input.projectId),
        eq(readReceipts.entityType, input.entityType),
        eq(readReceipts.entityId, input.entityId),
      ),
    )
    .returning({ id: readReceipts.id });
  return removed.length;
}

export async function readEntityIdsFor(
  userId: string,
  projectId: string,
  entityType: ReadReceiptRow['entityType'],
  entityIds: readonly string[],
): Promise<string[]> {
  if (entityIds.length === 0) return [];

  const rows = await db
    .select({ entityId: readReceipts.entityId })
    .from(readReceipts)
    .where(
      and(
        eq(readReceipts.userId, userId),
        eq(readReceipts.projectId, projectId),
        eq(readReceipts.entityType, entityType),
        inArray(readReceipts.entityId, [...entityIds]),
      ),
    );

  return rows.map((row) => row.entityId);
}
