import { and, asc, desc, eq, inArray, lt, or, sum, type SQL } from 'drizzle-orm';

import { newId } from '@cofarm/core/id';

import { db } from '../../db/client.ts';
import { withinScope } from '../../db/scoped.ts';
import {
  cycles,
  harvestDocuments,
  harvests,
  partnerStatements,
  projects,
} from '../../db/schema.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';

export type HarvestRow = typeof harvests.$inferSelect;
export type StatementRow = typeof partnerStatements.$inferSelect;
export type StatementInsert = typeof partnerStatements.$inferInsert;

export type HarvestDetailRow = HarvestRow & { cycleNo: number };

export type StatementDetailRow = StatementRow & {
  projectCode: string;
  projectName: string;
  yieldKg: string;
  varietySplit: Record<string, string>;
  pricePerKgPaise: bigint;
  buyer: string;
  harvestedOn: string;
};

export type MembershipShareTotalRow = {
  membershipId: string;
  totalPaise: string | null;
};

export type MembershipContributionRow = {
  membershipId: string;
  contributionPaise: bigint;
};

/** Keyset position: statements of one publish share a `generated_at`, so the id breaks ties. */
export type StatementCursor = {
  generatedAt: Date;
  id: string;
};

export type StatementPageFilters = {
  limit: number;
  cursor: StatementCursor | undefined;
};

export type PublishInput = {
  harvestId: string;
  publishedAt: Date;
  statements: readonly StatementInsert[];
};

const harvestDetailColumns = {
  id: harvests.id,
  projectId: harvests.projectId,
  cycleId: harvests.cycleId,
  yieldKg: harvests.yieldKg,
  varietySplit: harvests.varietySplit,
  pricePerKgPaise: harvests.pricePerKgPaise,
  buyer: harvests.buyer,
  grossRevenuePaise: harvests.grossRevenuePaise,
  harvestedOn: harvests.harvestedOn,
  status: harvests.status,
  publishedAt: harvests.publishedAt,
  createdBy: harvests.createdBy,
  createdAt: harvests.createdAt,
  updatedAt: harvests.updatedAt,
  cycleNo: cycles.cycleNo,
};

const statementDetailColumns = {
  id: partnerStatements.id,
  projectId: partnerStatements.projectId,
  cycleId: partnerStatements.cycleId,
  membershipId: partnerStatements.membershipId,
  grossRevenuePaise: partnerStatements.grossRevenuePaise,
  totalCostPaise: partnerStatements.totalCostPaise,
  netProceedsPaise: partnerStatements.netProceedsPaise,
  kiaanSharePaise: partnerStatements.kiaanSharePaise,
  partnerPoolPaise: partnerStatements.partnerPoolPaise,
  sharePaise: partnerStatements.sharePaise,
  contributionPaise: partnerStatements.contributionPaise,
  cumulativeSharePaise: partnerStatements.cumulativeSharePaise,
  costsByHead: partnerStatements.costsByHead,
  kiaanShareBps: partnerStatements.kiaanShareBps,
  cycleNo: partnerStatements.cycleNo,
  documentId: partnerStatements.documentId,
  generatedAt: partnerStatements.generatedAt,
  projectCode: projects.code,
  projectName: projects.name,
  yieldKg: harvests.yieldKg,
  varietySplit: harvests.varietySplit,
  pricePerKgPaise: harvests.pricePerKgPaise,
  buyer: harvests.buyer,
  harvestedOn: harvests.harvestedOn,
};

export async function findHarvest(
  scope: ProjectScope,
  projectId: string,
  harvestId: string,
): Promise<HarvestDetailRow | null> {
  const [row] = await db
    .select(harvestDetailColumns)
    .from(harvests)
    .innerJoin(cycles, eq(cycles.id, harvests.cycleId))
    .where(
      and(
        eq(harvests.id, harvestId),
        eq(harvests.projectId, projectId),
        withinScope(scope, harvests.projectId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findHarvestByCycle(
  scope: ProjectScope,
  projectId: string,
  cycleId: string,
): Promise<HarvestDetailRow | null> {
  const [row] = await db
    .select(harvestDetailColumns)
    .from(harvests)
    .innerJoin(cycles, eq(cycles.id, harvests.cycleId))
    .where(
      and(
        eq(harvests.cycleId, cycleId),
        eq(harvests.projectId, projectId),
        withinScope(scope, harvests.projectId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listHarvests(
  scope: ProjectScope,
  filters: { projectId: string; publishedOnly: boolean },
): Promise<HarvestDetailRow[]> {
  const conditions = [
    eq(harvests.projectId, filters.projectId),
    withinScope(scope, harvests.projectId),
  ];
  if (filters.publishedOnly) {
    conditions.push(eq(harvests.status, 'published'));
  }

  return db
    .select(harvestDetailColumns)
    .from(harvests)
    .innerJoin(cycles, eq(cycles.id, harvests.cycleId))
    .where(and(...conditions))
    .orderBy(desc(cycles.cycleNo));
}

/** Null when the one-harvest-per-cycle index rejects the row, which is a conflict. */
export async function insertHarvest(row: typeof harvests.$inferInsert): Promise<HarvestRow | null> {
  try {
    const [created] = await db.insert(harvests).values(row).returning();
    if (created === undefined) throw new Error('Insert returned no harvest row');
    return created;
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

/** Only a draft matches, so a published harvest has no edit path at all. */
export async function updateHarvest(
  harvestId: string,
  patch: Partial<typeof harvests.$inferInsert>,
): Promise<HarvestRow | null> {
  const [updated] = await db
    .update(harvests)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(harvests.id, harvestId), eq(harvests.status, 'draft')))
    .returning();
  return updated ?? null;
}

/**
 * The flip to published and the statements land together, and the update only
 * matches a draft: a second publish racing the first writes nothing and reads
 * back null rather than a duplicate set of statements.
 */
export async function publishHarvest(input: PublishInput): Promise<HarvestRow | null> {
  return db.transaction(async (tx) => {
    const [published] = await tx
      .update(harvests)
      .set({
        status: 'published',
        publishedAt: input.publishedAt,
        updatedAt: input.publishedAt,
      })
      .where(and(eq(harvests.id, input.harvestId), eq(harvests.status, 'draft')))
      .returning();
    if (published === undefined) return null;

    if (input.statements.length > 0) {
      await tx.insert(partnerStatements).values([...input.statements]);
    }
    return published;
  });
}

export async function shareTotalsByMembership(
  projectId: string,
  membershipIds: readonly string[],
): Promise<MembershipShareTotalRow[]> {
  if (membershipIds.length === 0) return [];

  return db
    .select({
      membershipId: partnerStatements.membershipId,
      totalPaise: sum(partnerStatements.sharePaise),
    })
    .from(partnerStatements)
    .where(
      and(
        eq(partnerStatements.projectId, projectId),
        inArray(partnerStatements.membershipId, [...membershipIds]),
      ),
    )
    .groupBy(partnerStatements.membershipId);
}

export async function findStatement(
  scope: ProjectScope,
  projectId: string,
  cycleId: string,
  membershipId: string,
): Promise<StatementDetailRow | null> {
  const [row] = await db
    .select(statementDetailColumns)
    .from(partnerStatements)
    .innerJoin(projects, eq(projects.id, partnerStatements.projectId))
    .innerJoin(harvests, eq(harvests.cycleId, partnerStatements.cycleId))
    .where(
      and(
        eq(partnerStatements.projectId, projectId),
        eq(partnerStatements.cycleId, cycleId),
        eq(partnerStatements.membershipId, membershipId),
        withinScope(scope, partnerStatements.projectId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function statementsForCycle(
  scope: ProjectScope,
  projectId: string,
  cycleId: string,
): Promise<StatementDetailRow[]> {
  return db
    .select(statementDetailColumns)
    .from(partnerStatements)
    .innerJoin(projects, eq(projects.id, partnerStatements.projectId))
    .innerJoin(harvests, eq(harvests.cycleId, partnerStatements.cycleId))
    .where(
      and(
        eq(partnerStatements.projectId, projectId),
        eq(partnerStatements.cycleId, cycleId),
        withinScope(scope, partnerStatements.projectId),
      ),
    )
    .orderBy(desc(partnerStatements.sharePaise));
}

export async function statementsForMemberships(
  scope: ProjectScope,
  membershipIds: readonly string[],
  filters: StatementPageFilters,
): Promise<StatementDetailRow[]> {
  if (membershipIds.length === 0) return [];

  const conditions: SQL[] = [
    inArray(partnerStatements.membershipId, [...membershipIds]),
    withinScope(scope, partnerStatements.projectId),
  ];

  const cursor = filters.cursor;
  if (cursor !== undefined) {
    const afterCursor = or(
      lt(partnerStatements.generatedAt, cursor.generatedAt),
      and(
        eq(partnerStatements.generatedAt, cursor.generatedAt),
        lt(partnerStatements.id, cursor.id),
      ),
    );
    if (afterCursor !== undefined) conditions.push(afterCursor);
  }

  return db
    .select(statementDetailColumns)
    .from(partnerStatements)
    .innerJoin(projects, eq(projects.id, partnerStatements.projectId))
    .innerJoin(harvests, eq(harvests.cycleId, partnerStatements.cycleId))
    .where(and(...conditions))
    .orderBy(desc(partnerStatements.generatedAt), desc(partnerStatements.id))
    .limit(filters.limit);
}

/** One row per membership, its newest statement first. */
export async function latestContributionPerMembership(
  scope: ProjectScope,
  membershipIds: readonly string[],
): Promise<MembershipContributionRow[]> {
  if (membershipIds.length === 0) return [];

  return db
    .selectDistinctOn([partnerStatements.membershipId], {
      membershipId: partnerStatements.membershipId,
      contributionPaise: partnerStatements.contributionPaise,
    })
    .from(partnerStatements)
    .where(
      and(
        inArray(partnerStatements.membershipId, [...membershipIds]),
        withinScope(scope, partnerStatements.projectId),
      ),
    )
    .orderBy(
      partnerStatements.membershipId,
      desc(partnerStatements.generatedAt),
      desc(partnerStatements.id),
    );
}

/** `sum()` arrives as a decimal string, or null when nothing matched. */
export async function shareTotalForMemberships(
  scope: ProjectScope,
  membershipIds: readonly string[],
): Promise<bigint> {
  if (membershipIds.length === 0) return 0n;

  const [row] = await db
    .select({ totalPaise: sum(partnerStatements.sharePaise) })
    .from(partnerStatements)
    .where(
      and(
        inArray(partnerStatements.membershipId, [...membershipIds]),
        withinScope(scope, partnerStatements.projectId),
      ),
    );
  return BigInt(row?.totalPaise ?? '0');
}

const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: unknown }).code;
  if (code === UNIQUE_VIOLATION) return true;
  const cause = (error as { cause?: unknown }).cause;
  return cause === undefined ? false : isUniqueViolation(cause);
}

export type HarvestDocumentRow = typeof harvestDocuments.$inferSelect;

export async function replaceHarvestDocuments(
  harvestId: string,
  projectId: string,
  kind: HarvestDocumentRow['kind'],
  documentIds: readonly string[],
): Promise<void> {
  await db
    .delete(harvestDocuments)
    .where(and(eq(harvestDocuments.harvestId, harvestId), eq(harvestDocuments.kind, kind)));

  if (documentIds.length === 0) return;
  await db.insert(harvestDocuments).values(
    documentIds.map((documentId, index) => ({
      id: newId(),
      projectId,
      harvestId,
      documentId,
      kind,
      sortOrder: index,
    })),
  );
}

export async function documentsForHarvests(
  harvestIds: readonly string[],
): Promise<HarvestDocumentRow[]> {
  if (harvestIds.length === 0) return [];
  return db
    .select()
    .from(harvestDocuments)
    .where(inArray(harvestDocuments.harvestId, [...harvestIds]))
    .orderBy(asc(harvestDocuments.kind), asc(harvestDocuments.sortOrder));
}

export type DraftHarvestRow = {
  id: string;
  projectId: string;
  projectCode: string;
  cycleNo: number;
};

/** Its own projection: the shared detail columns carry no project code. */
export async function listDraftHarvests(scope: ProjectScope): Promise<DraftHarvestRow[]> {
  return db
    .select({
      id: harvests.id,
      projectId: harvests.projectId,
      projectCode: projects.code,
      cycleNo: cycles.cycleNo,
    })
    .from(harvests)
    .innerJoin(cycles, eq(cycles.id, harvests.cycleId))
    .innerJoin(projects, eq(projects.id, harvests.projectId))
    .where(and(eq(harvests.status, 'draft'), withinScope(scope, harvests.projectId)))
    .orderBy(desc(harvests.createdAt));
}
