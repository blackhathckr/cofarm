import { and, asc, count, eq, gt, ilike, ne, or, sql, sum, type SQL } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { withinScope } from '../../db/scoped.ts';
import {
  cycleMilestones,
  cycles,
  harvests,
  ledgerEntries,
  memberships,
  partnerStatements,
  projects,
} from '../../db/schema.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';

export type ProjectRow = typeof projects.$inferSelect;
export type CycleRow = typeof cycles.$inferSelect;
export type MilestoneRow = typeof cycleMilestones.$inferSelect;

export type ListFilters = {
  status: ProjectRow['status'] | undefined;
  search: string | undefined;
  limit: number;
  cursor: string | undefined;
};

export type ProjectListRow = ProjectRow & { partnerCount: number };

/**
 * Every read takes the caller's scope. `withinScope` resolves to `false` for a
 * partner with no memberships, so a missing filter can never widen the result.
 */
export async function listProjects(
  scope: ProjectScope,
  filters: ListFilters,
): Promise<ProjectListRow[]> {
  const conditions: SQL[] = [withinScope(scope, projects.id)];

  if (filters.status !== undefined) {
    conditions.push(eq(projects.status, filters.status));
  }
  if (filters.search !== undefined && filters.search.length > 0) {
    const term = `%${filters.search}%`;
    const match = or(
      ilike(projects.code, term),
      ilike(projects.name, term),
      ilike(projects.location, term),
    );
    if (match !== undefined) conditions.push(match);
  }
  if (filters.cursor !== undefined) {
    conditions.push(gt(projects.code, filters.cursor));
  }

  return db
    .select({
      id: projects.id,
      code: projects.code,
      name: projects.name,
      location: projects.location,
      acreageAcres: projects.acreageAcres,
      variety: projects.variety,
      startDate: projects.startDate,
      status: projects.status,
      capacityPaise: projects.capacityPaise,
      kiaanShareBps: projects.kiaanShareBps,
      latitude: projects.latitude,
      longitude: projects.longitude,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      partnerCount: sql<number>`count(${memberships.id})::int`,
    })
    .from(projects)
    .leftJoin(
      memberships,
      and(eq(memberships.projectId, projects.id), eq(memberships.status, 'active')),
    )
    .where(and(...conditions))
    .groupBy(projects.id)
    .orderBy(asc(projects.code))
    .limit(filters.limit);
}

export async function findProject(
  scope: ProjectScope,
  projectId: string,
): Promise<ProjectRow | null> {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), withinScope(scope, projects.id)))
    .limit(1);
  return row ?? null;
}

export async function findProjectByCode(code: string): Promise<ProjectRow | null> {
  const [row] = await db.select().from(projects).where(eq(projects.code, code)).limit(1);
  return row ?? null;
}

export type ActiveProjectTotals = { projectCount: number; totalAcreageAcres: string };

export async function activeTotals(scope: ProjectScope): Promise<ActiveProjectTotals> {
  const [row] = await db
    .select({
      projectCount: count(),
      acreage: sum(projects.acreageAcres),
    })
    .from(projects)
    .where(and(eq(projects.status, 'active'), withinScope(scope, projects.id)));

  return {
    projectCount: row?.projectCount ?? 0,
    totalAcreageAcres: row?.acreage ?? '0',
  };
}

export async function countActivePartners(projectId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(memberships)
    .where(and(eq(memberships.projectId, projectId), eq(memberships.status, 'active')));
  return row?.total ?? 0;
}

export async function sumAllocatedPaise(projectId: string): Promise<bigint> {
  const [row] = await db
    .select({ total: sum(memberships.contributionPaise) })
    .from(memberships)
    .where(and(eq(memberships.projectId, projectId), eq(memberships.status, 'active')));
  return BigInt(row?.total ?? '0');
}

export async function insertProject(row: typeof projects.$inferInsert): Promise<ProjectRow> {
  const [created] = await db.insert(projects).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no project row');
  return created;
}

export async function updateProject(
  projectId: string,
  patch: Partial<typeof projects.$inferInsert>,
): Promise<ProjectRow | null> {
  const [updated] = await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();
  return updated ?? null;
}

/** The one cycle marked active, which is what every screen means by "current". */
export async function activeCycle(projectId: string): Promise<CycleRow | null> {
  const [row] = await db
    .select()
    .from(cycles)
    .where(and(eq(cycles.projectId, projectId), eq(cycles.status, 'active')))
    .orderBy(sql`${cycles.cycleNo} desc`)
    .limit(1);
  return row ?? null;
}

export async function demoteActiveCycles(
  projectId: string,
  status: CycleRow['status'],
  endDate: string,
  exceptCycleId?: string,
): Promise<CycleRow[]> {
  const conditions = [eq(cycles.projectId, projectId), eq(cycles.status, 'active')];
  if (exceptCycleId !== undefined) conditions.push(ne(cycles.id, exceptCycleId));

  return db
    .update(cycles)
    .set({ status, endDate, updatedAt: new Date() })
    .where(and(...conditions))
    .returning();
}

export async function hasPublishedHarvest(cycleId: string): Promise<boolean> {
  const [row] = await db
    .select({ total: count() })
    .from(harvests)
    .where(and(eq(harvests.cycleId, cycleId), eq(harvests.status, 'published')))
    .limit(1);
  return (row?.total ?? 0) > 0;
}

/** Highest numbered, whatever its status. Only numbering the next cycle needs this. */
export async function latestCycle(projectId: string): Promise<CycleRow | null> {
  const [row] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.projectId, projectId))
    .orderBy(sql`${cycles.cycleNo} desc`)
    .limit(1);
  return row ?? null;
}

export async function updateCycle(
  cycleId: string,
  patch: Partial<typeof cycles.$inferInsert>,
): Promise<CycleRow | null> {
  const [updated] = await db
    .update(cycles)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(cycles.id, cycleId))
    .returning();
  return updated ?? null;
}

export async function cyclesForProject(projectId: string): Promise<CycleRow[]> {
  return db
    .select()
    .from(cycles)
    .where(eq(cycles.projectId, projectId))
    .orderBy(asc(cycles.cycleNo));
}

export async function milestonesForCycle(cycleId: string): Promise<MilestoneRow[]> {
  return db
    .select()
    .from(cycleMilestones)
    .where(eq(cycleMilestones.cycleId, cycleId))
    .orderBy(asc(cycleMilestones.sortOrder));
}

export type CycleDependants = {
  harvests: number;
  ledgerEntries: number;
  statements: number;
};

/** What a cycle delete would break. The schema restricts these; this names them. */
export async function cycleDependants(cycleId: string): Promise<CycleDependants> {
  const [[harvestRow], [ledgerRow], [statementRow]] = await Promise.all([
    db.select({ total: count() }).from(harvests).where(eq(harvests.cycleId, cycleId)),
    db.select({ total: count() }).from(ledgerEntries).where(eq(ledgerEntries.cycleId, cycleId)),
    db
      .select({ total: count() })
      .from(partnerStatements)
      .where(eq(partnerStatements.cycleId, cycleId)),
  ]);

  return {
    harvests: harvestRow?.total ?? 0,
    ledgerEntries: ledgerRow?.total ?? 0,
    statements: statementRow?.total ?? 0,
  };
}

export async function findCycle(cycleId: string): Promise<CycleRow | null> {
  const [row] = await db.select().from(cycles).where(eq(cycles.id, cycleId)).limit(1);
  return row ?? null;
}

export async function deleteCycle(cycleId: string): Promise<CycleRow | null> {
  const [removed] = await db.delete(cycles).where(eq(cycles.id, cycleId)).returning();
  return removed ?? null;
}

export async function insertCycle(row: typeof cycles.$inferInsert): Promise<CycleRow> {
  const [created] = await db.insert(cycles).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no cycle row');
  return created;
}

export async function insertMilestones(
  rows: readonly (typeof cycleMilestones.$inferInsert)[],
): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(cycleMilestones).values([...rows]);
}

export async function upsertMilestoneStatus(
  cycleId: string,
  stage: MilestoneRow['stage'],
  patch: Partial<typeof cycleMilestones.$inferInsert>,
): Promise<MilestoneRow | null> {
  const [updated] = await db
    .update(cycleMilestones)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(cycleMilestones.cycleId, cycleId), eq(cycleMilestones.stage, stage)))
    .returning();
  return updated ?? null;
}
