import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  notInArray,
  or,
  sum,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { db } from '../../db/client.ts';
import { withinScope } from '../../db/scoped.ts';
import { cycles, ledgerEntries, memberships, projects } from '../../db/schema.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';

export type LedgerEntryRow = typeof ledgerEntries.$inferSelect;
export type LedgerType = LedgerEntryRow['type'];
export type LedgerCostHead = NonNullable<LedgerEntryRow['costHead']>;

export type EntryCursor = { entryDate: string; id: string };

export type EntryFilters = {
  projectId: string;
  type: LedgerType;
  cycleId: string | undefined;
  costHead: LedgerCostHead | undefined;
  membershipId: string | undefined;
  from: string | undefined;
  to: string | undefined;
};

export type EntryPageFilters = EntryFilters & {
  limit: number;
  cursor: EntryCursor | undefined;
};

export type HeadTotalRow = { costHead: LedgerEntryRow['costHead']; totalPaise: string | null };
export type MembershipTotalRow = { membershipId: string | null; totalPaise: string | null };
export type ReversalLinkRow = { id: string; reversesId: string | null };

const reversals = alias(ledgerEntries, 'reversals');

/**
 * A reversed entry and the entry reversing it both drop out of every total, so
 * the pair nets to zero while both rows stay on the record.
 */
function liveConditions(): SQL[] {
  return [
    isNull(ledgerEntries.reversesId),
    notInArray(
      ledgerEntries.id,
      db
        .select({ reversesId: reversals.reversesId })
        .from(reversals)
        .where(isNotNull(reversals.reversesId)),
    ),
  ];
}

function filterConditions(scope: ProjectScope, filters: EntryFilters): SQL[] {
  const conditions: SQL[] = [
    withinScope(scope, ledgerEntries.projectId),
    eq(ledgerEntries.projectId, filters.projectId),
    eq(ledgerEntries.type, filters.type),
  ];

  if (filters.cycleId !== undefined) {
    conditions.push(eq(ledgerEntries.cycleId, filters.cycleId));
  }
  if (filters.costHead !== undefined) {
    conditions.push(eq(ledgerEntries.costHead, filters.costHead));
  }
  if (filters.membershipId !== undefined) {
    conditions.push(eq(ledgerEntries.membershipId, filters.membershipId));
  }
  if (filters.from !== undefined) {
    conditions.push(gte(ledgerEntries.entryDate, filters.from));
  }
  if (filters.to !== undefined) {
    conditions.push(lte(ledgerEntries.entryDate, filters.to));
  }

  return conditions;
}

export async function listEntries(
  scope: ProjectScope,
  filters: EntryPageFilters,
): Promise<LedgerEntryRow[]> {
  const conditions = filterConditions(scope, filters);
  const cursor = filters.cursor;

  if (cursor !== undefined) {
    const afterCursor = or(
      lt(ledgerEntries.entryDate, cursor.entryDate),
      and(eq(ledgerEntries.entryDate, cursor.entryDate), lt(ledgerEntries.id, cursor.id)),
    );
    if (afterCursor !== undefined) conditions.push(afterCursor);
  }

  return db
    .select()
    .from(ledgerEntries)
    .where(and(...conditions))
    .orderBy(desc(ledgerEntries.entryDate), desc(ledgerEntries.id))
    .limit(filters.limit);
}

export async function totalsByCostHead(
  scope: ProjectScope,
  filters: EntryFilters,
): Promise<HeadTotalRow[]> {
  return db
    .select({ costHead: ledgerEntries.costHead, totalPaise: sum(ledgerEntries.amountPaise) })
    .from(ledgerEntries)
    .where(and(...filterConditions(scope, filters), ...liveConditions()))
    .groupBy(ledgerEntries.costHead);
}

export async function totalsByMembership(
  scope: ProjectScope,
  filters: EntryFilters,
): Promise<MembershipTotalRow[]> {
  return db
    .select({
      membershipId: ledgerEntries.membershipId,
      totalPaise: sum(ledgerEntries.amountPaise),
    })
    .from(ledgerEntries)
    .where(and(...filterConditions(scope, filters), ...liveConditions()))
    .groupBy(ledgerEntries.membershipId);
}

/** `sum()` arrives as a decimal string, or null when nothing matched. */
export async function totalOfType(scope: ProjectScope, filters: EntryFilters): Promise<bigint> {
  const [row] = await db
    .select({ totalPaise: sum(ledgerEntries.amountPaise) })
    .from(ledgerEntries)
    .where(and(...filterConditions(scope, filters), ...liveConditions()));
  return BigInt(row?.totalPaise ?? '0');
}

export async function reversalLinks(entryIds: readonly string[]): Promise<ReversalLinkRow[]> {
  if (entryIds.length === 0) return [];
  return db
    .select({ id: ledgerEntries.id, reversesId: ledgerEntries.reversesId })
    .from(ledgerEntries)
    .where(inArray(ledgerEntries.reversesId, [...entryIds]));
}

export async function findEntry(
  scope: ProjectScope,
  projectId: string,
  entryId: string,
): Promise<LedgerEntryRow | null> {
  const [row] = await db
    .select()
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.id, entryId),
        eq(ledgerEntries.projectId, projectId),
        withinScope(scope, ledgerEntries.projectId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findReversalOf(entryId: string): Promise<LedgerEntryRow | null> {
  const [row] = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.reversesId, entryId))
    .limit(1);
  return row ?? null;
}

export async function insertEntry(row: typeof ledgerEntries.$inferInsert): Promise<LedgerEntryRow> {
  const [created] = await db.insert(ledgerEntries).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no ledger entry row');
  return created;
}

export async function projectInScope(scope: ProjectScope, projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), withinScope(scope, projects.id)))
    .limit(1);
  return row !== undefined;
}

export type CycleStatus = (typeof cycles.$inferSelect)['status'];

export async function cycleStatusInProject(
  projectId: string,
  cycleId: string,
): Promise<CycleStatus | null> {
  const [row] = await db
    .select({ status: cycles.status })
    .from(cycles)
    .where(and(eq(cycles.id, cycleId), eq(cycles.projectId, projectId)))
    .limit(1);
  return row?.status ?? null;
}

export async function membershipInProject(
  projectId: string,
  membershipId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.id, membershipId), eq(memberships.projectId, projectId)))
    .limit(1);
  return row !== undefined;
}
