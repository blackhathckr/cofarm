import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  lte,
  or,
  type SQL,
} from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { withinScope } from '../../db/scoped.ts';
import {
  activityLogEntries,
  cycles,
  documents,
  projectUpdates,
  projects,
  updatePhotos,
} from '../../db/schema.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';

export type UpdateRow = typeof projectUpdates.$inferSelect;
export type PhotoRow = typeof updatePhotos.$inferSelect;
export type PhotoInsert = typeof updatePhotos.$inferInsert;
export type ActivityRow = typeof activityLogEntries.$inferSelect;

/** Keyset position: `activity_date` alone is not unique, so the id breaks ties. */
export type FeedCursor = {
  activityDate: string;
  id: string;
};

export type UpdateFilters = {
  projectId: string;
  status: UpdateRow['status'] | undefined;
  publishedOnly: boolean;
  limit: number;
  cursor: FeedCursor | undefined;
};

export type ActivityFilters = {
  projectId: string;
  limit: number;
  cursor: FeedCursor | undefined;
};

export type UpdateWithPhotoCount = UpdateRow & { photoCount: number };

const updateColumns = {
  id: projectUpdates.id,
  projectId: projectUpdates.projectId,
  cycleId: projectUpdates.cycleId,
  milestoneTag: projectUpdates.milestoneTag,
  title: projectUpdates.title,
  description: projectUpdates.description,
  activityDate: projectUpdates.activityDate,
  status: projectUpdates.status,
  notifyPartners: projectUpdates.notifyPartners,
  publishedAt: projectUpdates.publishedAt,
  createdBy: projectUpdates.createdBy,
  createdAt: projectUpdates.createdAt,
  updatedAt: projectUpdates.updatedAt,
};

export async function listUpdates(
  scope: ProjectScope,
  filters: UpdateFilters,
): Promise<UpdateWithPhotoCount[]> {
  const conditions: SQL[] = [
    eq(projectUpdates.projectId, filters.projectId),
    withinScope(scope, projectUpdates.projectId),
  ];

  if (filters.publishedOnly) {
    conditions.push(eq(projectUpdates.status, 'published'));
  } else if (filters.status !== undefined) {
    conditions.push(eq(projectUpdates.status, filters.status));
  }
  if (filters.cursor !== undefined) {
    const page = or(
      lt(projectUpdates.activityDate, filters.cursor.activityDate),
      and(
        eq(projectUpdates.activityDate, filters.cursor.activityDate),
        lt(projectUpdates.id, filters.cursor.id),
      ),
    );
    if (page === undefined) throw new Error('Cursor produced no condition');
    conditions.push(page);
  }

  return db
    .select({ ...updateColumns, photoCount: count(updatePhotos.id) })
    .from(projectUpdates)
    .leftJoin(updatePhotos, eq(updatePhotos.updateId, projectUpdates.id))
    .where(and(...conditions))
    .groupBy(projectUpdates.id)
    .orderBy(desc(projectUpdates.activityDate), desc(projectUpdates.id))
    .limit(filters.limit);
}

export async function findUpdate(
  scope: ProjectScope,
  projectId: string,
  updateId: string,
): Promise<UpdateWithPhotoCount | null> {
  const [row] = await db
    .select({ ...updateColumns, photoCount: count(updatePhotos.id) })
    .from(projectUpdates)
    .leftJoin(updatePhotos, eq(updatePhotos.updateId, projectUpdates.id))
    .where(
      and(
        eq(projectUpdates.id, updateId),
        eq(projectUpdates.projectId, projectId),
        withinScope(scope, projectUpdates.projectId),
      ),
    )
    .groupBy(projectUpdates.id)
    .limit(1);
  return row ?? null;
}

export async function photosForUpdate(updateId: string): Promise<PhotoRow[]> {
  return db
    .select()
    .from(updatePhotos)
    .where(eq(updatePhotos.updateId, updateId))
    .orderBy(updatePhotos.sortOrder, updatePhotos.id);
}

export async function photosForUpdates(updateIds: readonly string[]): Promise<PhotoRow[]> {
  if (updateIds.length === 0) return [];
  return db
    .select()
    .from(updatePhotos)
    .where(inArray(updatePhotos.updateId, [...updateIds]))
    .orderBy(updatePhotos.sortOrder, updatePhotos.id);
}

export type PeriodPhotoRow = {
  documentId: string;
  caption: string | null;
  activityDate: string;
};

/** Photographs on published updates whose activity date falls in the period. */
export async function photosInPeriod(filters: {
  projectId: string;
  fromDate: string;
  toDate: string;
  limit: number;
}): Promise<PeriodPhotoRow[]> {
  return db
    .select({
      documentId: updatePhotos.documentId,
      caption: updatePhotos.caption,
      activityDate: projectUpdates.activityDate,
    })
    .from(updatePhotos)
    .innerJoin(projectUpdates, eq(projectUpdates.id, updatePhotos.updateId))
    .innerJoin(documents, eq(documents.id, updatePhotos.documentId))
    .where(
      and(
        eq(updatePhotos.projectId, filters.projectId),
        eq(projectUpdates.status, 'published'),
        gte(projectUpdates.activityDate, filters.fromDate),
        lte(projectUpdates.activityDate, filters.toDate),
        isNotNull(documents.confirmedAt),
      ),
    )
    .orderBy(asc(projectUpdates.activityDate), asc(updatePhotos.sortOrder), asc(updatePhotos.id))
    .limit(filters.limit);
}

export async function insertUpdate(row: typeof projectUpdates.$inferInsert): Promise<UpdateRow> {
  const [created] = await db.insert(projectUpdates).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no project update row');
  return created;
}

export async function patchUpdate(
  updateId: string,
  patch: Partial<typeof projectUpdates.$inferInsert>,
): Promise<UpdateRow | null> {
  const [updated] = await db
    .update(projectUpdates)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(projectUpdates.id, updateId))
    .returning();
  return updated ?? null;
}

export async function deleteUpdate(updateId: string): Promise<boolean> {
  const removed = await db
    .delete(projectUpdates)
    .where(eq(projectUpdates.id, updateId))
    .returning({ id: projectUpdates.id });
  return removed.length > 0;
}

export async function replacePhotos(
  updateId: string,
  rows: readonly (typeof updatePhotos.$inferInsert)[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(updatePhotos).where(eq(updatePhotos.updateId, updateId));
    if (rows.length > 0) await tx.insert(updatePhotos).values([...rows]);
  });
}

export async function listActivity(
  scope: ProjectScope,
  filters: ActivityFilters,
): Promise<ActivityRow[]> {
  const conditions: SQL[] = [
    eq(activityLogEntries.projectId, filters.projectId),
    withinScope(scope, activityLogEntries.projectId),
  ];

  if (filters.cursor !== undefined) {
    const page = or(
      lt(activityLogEntries.activityDate, filters.cursor.activityDate),
      and(
        eq(activityLogEntries.activityDate, filters.cursor.activityDate),
        lt(activityLogEntries.id, filters.cursor.id),
      ),
    );
    if (page === undefined) throw new Error('Cursor produced no condition');
    conditions.push(page);
  }

  return db
    .select()
    .from(activityLogEntries)
    .where(and(...conditions))
    .orderBy(desc(activityLogEntries.activityDate), desc(activityLogEntries.id))
    .limit(filters.limit);
}

export async function insertActivity(
  row: typeof activityLogEntries.$inferInsert,
): Promise<ActivityRow> {
  const [created] = await db.insert(activityLogEntries).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no activity log row');
  return created;
}

export async function findProjectHeader(
  scope: ProjectScope,
  projectId: string,
): Promise<{ id: string; code: string; name: string } | null> {
  const [row] = await db
    .select({ id: projects.id, code: projects.code, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, projectId), withinScope(scope, projects.id)))
    .limit(1);
  return row ?? null;
}

export async function cycleIsInProject(cycleId: string, projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: cycles.id })
    .from(cycles)
    .where(and(eq(cycles.id, cycleId), eq(cycles.projectId, projectId)))
    .limit(1);
  return row !== undefined;
}

export async function countPublishedInPeriod(
  projectId: string,
  fromDate: string,
  toDate: string,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(projectUpdates)
    .where(
      and(
        eq(projectUpdates.projectId, projectId),
        eq(projectUpdates.status, 'published'),
        gte(projectUpdates.activityDate, fromDate),
        lte(projectUpdates.activityDate, toDate),
      ),
    );
  return row?.total ?? 0;
}
