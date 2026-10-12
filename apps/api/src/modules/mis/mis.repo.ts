import { and, desc, eq, lt, or, type SQL } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { withinScope } from '../../db/scoped.ts';
import { misReports, projects } from '../../db/schema.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';

export type MisReportRow = typeof misReports.$inferSelect;

export type PeriodCursor = {
  year: number;
  month: number;
};

export type ListFilters = {
  projectId: string;
  publishedOnly: boolean;
  limit: number;
  cursor: PeriodCursor | undefined;
};

export type LatestReportRow = MisReportRow & {
  projectCode: string;
  projectName: string;
};

export async function listReports(
  scope: ProjectScope,
  filters: ListFilters,
): Promise<MisReportRow[]> {
  const conditions: SQL[] = [
    withinScope(scope, misReports.projectId),
    eq(misReports.projectId, filters.projectId),
  ];

  if (filters.publishedOnly) {
    conditions.push(eq(misReports.status, 'published'));
  }
  if (filters.cursor !== undefined) {
    const older = or(
      lt(misReports.year, filters.cursor.year),
      and(eq(misReports.year, filters.cursor.year), lt(misReports.month, filters.cursor.month)),
    );
    if (older !== undefined) conditions.push(older);
  }

  return db
    .select()
    .from(misReports)
    .where(and(...conditions))
    .orderBy(desc(misReports.year), desc(misReports.month))
    .limit(filters.limit);
}

export async function findReport(
  scope: ProjectScope,
  projectId: string,
  reportId: string,
): Promise<MisReportRow | null> {
  const [row] = await db
    .select()
    .from(misReports)
    .where(
      and(
        eq(misReports.id, reportId),
        eq(misReports.projectId, projectId),
        withinScope(scope, misReports.projectId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findByPeriod(
  scope: ProjectScope,
  projectId: string,
  year: number,
  month: number,
): Promise<MisReportRow | null> {
  const [row] = await db
    .select()
    .from(misReports)
    .where(
      and(
        eq(misReports.projectId, projectId),
        eq(misReports.year, year),
        eq(misReports.month, month),
        withinScope(scope, misReports.projectId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * One row per project, newest period first. `distinct on` keeps it a single
 * scan: a per-project maximum written as a correlated subquery would not
 * table-qualify its columns.
 */
export async function latestPublishedPerProject(scope: ProjectScope): Promise<LatestReportRow[]> {
  return db
    .selectDistinctOn([misReports.projectId], {
      id: misReports.id,
      projectId: misReports.projectId,
      month: misReports.month,
      year: misReports.year,
      title: misReports.title,
      narrative: misReports.narrative,
      outlook: misReports.outlook,
      source: misReports.source,
      documentId: misReports.documentId,
      status: misReports.status,
      publishedAt: misReports.publishedAt,
      createdBy: misReports.createdBy,
      createdAt: misReports.createdAt,
      updatedAt: misReports.updatedAt,
      projectCode: projects.code,
      projectName: projects.name,
    })
    .from(misReports)
    .innerJoin(projects, eq(projects.id, misReports.projectId))
    .where(and(eq(misReports.status, 'published'), withinScope(scope, misReports.projectId)))
    .orderBy(misReports.projectId, desc(misReports.year), desc(misReports.month));
}

/** Null when the period's unique index rejects the row, which is a conflict. */
export async function insertReport(
  row: typeof misReports.$inferInsert,
): Promise<MisReportRow | null> {
  try {
    const [created] = await db.insert(misReports).values(row).returning();
    if (created === undefined) throw new Error('Insert returned no mis report row');
    return created;
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

export async function updateReport(
  reportId: string,
  patch: Partial<typeof misReports.$inferInsert>,
): Promise<MisReportRow | null> {
  const [updated] = await db
    .update(misReports)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(misReports.id, reportId))
    .returning();
  return updated ?? null;
}

export async function deleteReport(reportId: string): Promise<void> {
  await db.delete(misReports).where(eq(misReports.id, reportId));
}

const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: unknown }).code;
  if (code === UNIQUE_VIOLATION) return true;
  const cause = (error as { cause?: unknown }).cause;
  return cause === undefined ? false : isUniqueViolation(cause);
}
