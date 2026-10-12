import { ERROR_CODES } from '@cofarm/contracts/errors';
import {
  costTotalsSchema,
  type ContributionPage,
  type CostTotals,
  type ExpensePage,
  type LedgerEntry,
  type LedgerSummary,
  type LedgerSummaryQuery,
  type ListContributionsQuery,
  type ListExpensesQuery,
  type RecordContributionBody,
  type RecordExpenseBody,
  type RecordRevenueBody,
  type ReverseContributionBody,
  type ReverseExpenseBody,
} from '@cofarm/contracts/ledger';
import { toPaiseString } from '@cofarm/contracts/primitives';
import { newId } from '@cofarm/core/id';
import { sumPaise } from '@cofarm/core/money';
import { COST_HEADS, type CostHead } from '@cofarm/core/pnl';

import * as cursor from '../../lib/cursor.ts';
import { badRequest, conflict, notFound } from '../../lib/errors.ts';
import { isFutureInIndia } from '../../lib/india-date.ts';
import { ADMIN_SCOPE, type ProjectScope } from '../../lib/project-scope.ts';
import { currentContext } from '../../lib/request-context.ts';
import * as audit from '../audit/audit.service.ts';
import * as documents from '../documents/documents.service.ts';
import * as repo from './ledger.repo.ts';

export type CycleCosts = {
  totalCostPaise: bigint;
  costsByHead: Partial<Record<CostHead, bigint>>;
};

export type CycleRevenue = { grossRevenuePaise: bigint };

type ReversibleType = 'expense' | 'contribution';

const REVERSIBLE_ARTICLE: Record<ReversibleType, string> = {
  expense: 'an expense',
  contribution: 'a contribution',
};

export async function recordExpense(
  projectId: string,
  input: RecordExpenseBody,
): Promise<LedgerEntry> {
  await assertProject(ADMIN_SCOPE, projectId);
  assertNotFuture(input.entryDate);
  await assertCycleOpen(projectId, input.cycleId);
  await assertDocument(projectId, input.documentId);

  const created = await repo.insertEntry({
    id: newId(),
    projectId,
    cycleId: input.cycleId ?? null,
    membershipId: null,
    type: 'expense',
    costHead: input.costHead,
    amountPaise: BigInt(input.amountPaise),
    entryDate: input.entryDate,
    note: input.note ?? null,
    documentId: input.documentId ?? null,
    reversesId: null,
    createdBy: actorUserId(),
  });

  await audit.record({
    action: 'expense.recorded',
    entityTable: 'ledger_entries',
    entityId: created.id,
    projectId,
    after: created,
  });

  return toEntryDto(created, null);
}

export async function listExpenses(
  scope: ProjectScope,
  projectId: string,
  query: ListExpensesQuery,
): Promise<ExpensePage> {
  await assertProject(scope, projectId);

  const filters = {
    projectId,
    type: 'expense' as const,
    cycleId: query.cycleId,
    costHead: query.costHead,
    membershipId: undefined,
    from: query.from,
    to: query.to,
  };

  const [rows, headRows] = await Promise.all([
    repo.listEntries(scope, {
      ...filters,
      limit: query.limit + 1,
      cursor: decodeCursor(query.cursor),
    }),
    repo.totalsByCostHead(scope, filters),
  ]);

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const reversedBy = await reversalIndex(page);

  return {
    items: page.map((row) => toEntryDto(row, reversedBy.get(row.id) ?? null)),
    nextCursor: hasMore ? encodeCursor(page.at(-1)) : null,
    totalsByHead: toCostTotals(costsByHead(headRows)),
    totalPaise: toPaiseString(sumPaise(headRows.map((row) => BigInt(row.totalPaise ?? '0')))),
  };
}

export function reverseExpense(
  projectId: string,
  entryId: string,
  input: ReverseExpenseBody,
): Promise<LedgerEntry> {
  return reverseEntry(projectId, entryId, 'expense', input);
}

export function reverseContribution(
  projectId: string,
  entryId: string,
  input: ReverseContributionBody,
): Promise<LedgerEntry> {
  return reverseEntry(projectId, entryId, 'contribution', input);
}

export async function recordContribution(
  projectId: string,
  input: RecordContributionBody,
): Promise<LedgerEntry> {
  await assertProject(ADMIN_SCOPE, projectId);
  assertNotFuture(input.entryDate);
  await assertMembership(projectId, input.membershipId);
  await assertDocument(projectId, input.documentId);

  const created = await repo.insertEntry({
    id: newId(),
    projectId,
    cycleId: null,
    membershipId: input.membershipId,
    type: 'contribution',
    costHead: null,
    amountPaise: BigInt(input.amountPaise),
    entryDate: input.entryDate,
    note: input.note ?? null,
    documentId: input.documentId ?? null,
    reversesId: null,
    createdBy: actorUserId(),
  });

  await audit.record({
    action: 'contribution.recorded',
    entityTable: 'ledger_entries',
    entityId: created.id,
    projectId,
    after: created,
  });

  return toEntryDto(created, null);
}

export async function listContributions(
  scope: ProjectScope,
  projectId: string,
  query: ListContributionsQuery,
): Promise<ContributionPage> {
  await assertProject(scope, projectId);

  const filters = {
    projectId,
    type: 'contribution' as const,
    cycleId: query.cycleId,
    costHead: undefined,
    membershipId: query.membershipId,
    from: query.from,
    to: query.to,
  };

  const [rows, membershipRows] = await Promise.all([
    repo.listEntries(scope, {
      ...filters,
      limit: query.limit + 1,
      cursor: decodeCursor(query.cursor),
    }),
    repo.totalsByMembership(scope, filters),
  ]);

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const reversedBy = await reversalIndex(page);

  return {
    items: page.map((row) => toEntryDto(row, reversedBy.get(row.id) ?? null)),
    nextCursor: hasMore ? encodeCursor(page.at(-1)) : null,
    totalsByMembership: membershipRows.flatMap((row) =>
      row.membershipId === null
        ? []
        : [
            {
              membershipId: row.membershipId,
              totalPaise: toPaiseString(BigInt(row.totalPaise ?? '0')),
            },
          ],
    ),
    totalPaise: toPaiseString(sumPaise(membershipRows.map((row) => BigInt(row.totalPaise ?? '0')))),
  };
}

export async function recordRevenueEntry(
  projectId: string,
  input: RecordRevenueBody,
): Promise<LedgerEntry> {
  const created = await appendRevenue({
    projectId,
    cycleId: input.cycleId,
    amountPaise: BigInt(input.amountPaise),
    entryDate: input.entryDate,
    ...(input.buyerNote === undefined ? {} : { note: input.buyerNote }),
    ...(input.documentId === undefined ? {} : { documentId: input.documentId }),
  });
  return toEntryDto(created, null);
}

/** Appends a revenue entry; used when a harvest is published. */
export async function recordRevenue(input: {
  projectId: string;
  cycleId: string;
  amountPaise: bigint;
  entryDate: string;
  note?: string;
  documentId?: string;
}): Promise<void> {
  await appendRevenue(input);
}

/** Appends a payout entry against one membership, when a share is disbursed. */
export async function recordPayout(input: {
  projectId: string;
  cycleId: string;
  membershipId: string;
  amountPaise: bigint;
  entryDate: string;
  note?: string;
}): Promise<void> {
  await assertProject(ADMIN_SCOPE, input.projectId);
  assertNotFuture(input.entryDate);
  assertPositive(input.amountPaise);
  await assertCycle(input.projectId, input.cycleId);
  await assertMembership(input.projectId, input.membershipId);

  const created = await repo.insertEntry({
    id: newId(),
    projectId: input.projectId,
    cycleId: input.cycleId,
    membershipId: input.membershipId,
    type: 'payout',
    costHead: null,
    amountPaise: input.amountPaise,
    entryDate: input.entryDate,
    note: input.note ?? null,
    documentId: null,
    reversesId: null,
    createdBy: actorUserId(),
  });

  await audit.record({
    action: 'payout.recorded',
    entityTable: 'ledger_entries',
    entityId: created.id,
    projectId: input.projectId,
    after: created,
  });
}

export async function cycleCosts(projectId: string, cycleId: string): Promise<CycleCosts> {
  const rows = await repo.totalsByCostHead(ADMIN_SCOPE, {
    projectId,
    type: 'expense',
    cycleId,
    costHead: undefined,
    membershipId: undefined,
    from: undefined,
    to: undefined,
  });

  return {
    totalCostPaise: sumPaise(rows.map((row) => BigInt(row.totalPaise ?? '0'))),
    costsByHead: costsByHead(rows),
  };
}

export async function cycleRevenue(projectId: string, cycleId: string): Promise<CycleRevenue> {
  const grossRevenuePaise = await repo.totalOfType(ADMIN_SCOPE, {
    projectId,
    type: 'revenue',
    cycleId,
    costHead: undefined,
    membershipId: undefined,
    from: undefined,
    to: undefined,
  });
  return { grossRevenuePaise };
}

/** Contributions are held against the project rather than a cycle, so the
 * cycle filter never narrows them. */
export async function ledgerSummary(
  scope: ProjectScope,
  projectId: string,
  query: LedgerSummaryQuery,
): Promise<LedgerSummary> {
  await assertProject(scope, projectId);

  const base = {
    projectId,
    cycleId: query.cycleId,
    costHead: undefined,
    membershipId: undefined,
    from: undefined,
    to: undefined,
  };

  const [headRows, grossRevenuePaise, contributionsPaise, payoutsPaise] = await Promise.all([
    repo.totalsByCostHead(scope, { ...base, type: 'expense' }),
    repo.totalOfType(scope, { ...base, type: 'revenue' }),
    repo.totalOfType(scope, { ...base, type: 'contribution', cycleId: undefined }),
    repo.totalOfType(scope, { ...base, type: 'payout' }),
  ]);

  const totalCostPaise = sumPaise(headRows.map((row) => BigInt(row.totalPaise ?? '0')));

  return {
    projectId,
    cycleId: query.cycleId ?? null,
    grossRevenuePaise: toPaiseString(grossRevenuePaise),
    totalCostPaise: toPaiseString(totalCostPaise),
    costsByHead: toCostTotals(costsByHead(headRows)),
    netProceedsPaise: toPaiseString(grossRevenuePaise - totalCostPaise),
    contributionsPaise: toPaiseString(contributionsPaise),
    payoutsPaise: toPaiseString(payoutsPaise),
  };
}

/**
 * The reversal carries the original's entry date, cycle and membership, so a
 * filtered period or a partner's own listing holds both halves of a cancelled
 * pair instead of splitting them.
 */
async function reverseEntry(
  projectId: string,
  entryId: string,
  type: ReversibleType,
  input: { note: string },
): Promise<LedgerEntry> {
  await assertProject(ADMIN_SCOPE, projectId);

  const original = await repo.findEntry(ADMIN_SCOPE, projectId, entryId);
  if (original === null) throw notFound('Ledger entry');
  if (original.type !== type) {
    throw badRequest(`Only ${REVERSIBLE_ARTICLE[type]} entry is reversed here`);
  }
  if (original.reversesId !== null) {
    throw conflict(ERROR_CODES.ledgerImmutable, 'A reversing entry cannot itself be reversed');
  }

  const existing = await repo.findReversalOf(entryId);
  if (existing !== null) {
    throw conflict(ERROR_CODES.ledgerImmutable, 'This entry has already been reversed');
  }

  const created = await repo.insertEntry({
    id: newId(),
    projectId,
    cycleId: original.cycleId,
    membershipId: original.membershipId,
    type,
    costHead: original.costHead,
    amountPaise: original.amountPaise,
    entryDate: original.entryDate,
    note: input.note,
    documentId: null,
    reversesId: original.id,
    createdBy: actorUserId(),
  });

  await audit.record({
    action: `${type}.reversed`,
    entityTable: 'ledger_entries',
    entityId: created.id,
    projectId,
    before: original,
    after: created,
  });

  return toEntryDto(created, null);
}

async function appendRevenue(input: {
  projectId: string;
  cycleId: string;
  amountPaise: bigint;
  entryDate: string;
  note?: string;
  documentId?: string;
}): Promise<repo.LedgerEntryRow> {
  await assertProject(ADMIN_SCOPE, input.projectId);
  assertNotFuture(input.entryDate);
  assertPositive(input.amountPaise);
  await assertCycleOpen(input.projectId, input.cycleId);
  await assertDocument(input.projectId, input.documentId);

  const created = await repo.insertEntry({
    id: newId(),
    projectId: input.projectId,
    cycleId: input.cycleId,
    membershipId: null,
    type: 'revenue',
    costHead: null,
    amountPaise: input.amountPaise,
    entryDate: input.entryDate,
    note: input.note ?? null,
    documentId: input.documentId ?? null,
    reversesId: null,
    createdBy: actorUserId(),
  });

  await audit.record({
    action: 'revenue.recorded',
    entityTable: 'ledger_entries',
    entityId: created.id,
    projectId: input.projectId,
    after: created,
  });

  return created;
}

async function reversalIndex(rows: readonly repo.LedgerEntryRow[]): Promise<Map<string, string>> {
  const links = await repo.reversalLinks(rows.map((row) => row.id));
  const index = new Map<string, string>();
  for (const link of links) {
    if (link.reversesId !== null) index.set(link.reversesId, link.id);
  }
  return index;
}

function costsByHead(rows: readonly repo.HeadTotalRow[]): Partial<Record<CostHead, bigint>> {
  const totals: Partial<Record<CostHead, bigint>> = {};
  for (const row of rows) {
    if (row.costHead !== null) totals[row.costHead] = BigInt(row.totalPaise ?? '0');
  }
  return totals;
}

function toCostTotals(totals: Partial<Record<CostHead, bigint>>): CostTotals {
  const entries = COST_HEADS.map((head) => [head, toPaiseString(totals[head] ?? 0n)]);
  return costTotalsSchema.parse(Object.fromEntries(entries));
}

function toEntryDto(row: repo.LedgerEntryRow, reversedByEntryId: string | null): LedgerEntry {
  return {
    id: row.id,
    projectId: row.projectId,
    cycleId: row.cycleId,
    membershipId: row.membershipId,
    type: row.type,
    costHead: row.costHead,
    amountPaise: toPaiseString(row.amountPaise),
    entryDate: row.entryDate,
    note: row.note,
    documentId: row.documentId,
    reversesId: row.reversesId,
    reversedByEntryId,
    createdAt: row.createdAt.toISOString(),
  };
}

async function assertProject(scope: ProjectScope, projectId: string): Promise<void> {
  const visible = await repo.projectInScope(scope, projectId);
  if (!visible) throw notFound('Project');
}

async function assertCycle(projectId: string, cycleId: string | undefined): Promise<void> {
  if (cycleId === undefined) return;
  const status = await repo.cycleStatusInProject(projectId, cycleId);
  if (status === null) throw notFound('Cycle');
}

/**
 * Once a cycle is harvested its statements are issued and paid, so a new cost
 * or sale against it would leave the ledger and those statements disagreeing.
 * A reversal is still allowed: correcting a mis-keyed entry is what the
 * append-only ledger is for, and a statement is explicitly a snapshot.
 */
async function assertCycleOpen(projectId: string, cycleId: string | undefined): Promise<void> {
  if (cycleId === undefined) return;
  const status = await repo.cycleStatusInProject(projectId, cycleId);
  if (status === null) throw notFound('Cycle');
  if (status === 'active' || status === 'planned') return;

  throw conflict(
    ERROR_CODES.cycleNotOpen,
    `This cycle is ${status} and takes no further entries`,
    'Record it against the open cycle, or reverse the entry that was wrong.',
  );
}

async function assertMembership(projectId: string, membershipId: string): Promise<void> {
  const belongs = await repo.membershipInProject(projectId, membershipId);
  if (!belongs) throw notFound('Membership');
}

async function assertDocument(projectId: string, documentId: string | undefined): Promise<void> {
  if (documentId === undefined) return;
  await documents.assertDocumentInProject(documentId, projectId);
}

function assertPositive(amountPaise: bigint): void {
  if (amountPaise <= 0n) throw badRequest('A ledger amount must be greater than zero');
}

function assertNotFuture(entryDate: string): void {
  if (isFutureInIndia(entryDate)) {
    throw badRequest('A ledger entry cannot be dated in the future');
  }
}

function actorUserId(): string | null {
  return currentContext()?.actorUserId ?? null;
}

function encodeCursor(row: repo.LedgerEntryRow | undefined): string | null {
  if (row === undefined) return null;
  return cursor.encodeCursor(row.entryDate, row.id);
}

function decodeCursor(raw: string | undefined): repo.EntryCursor | undefined {
  const decoded = cursor.decodeCursor(raw);
  if (decoded === undefined) return undefined;
  return { entryDate: cursor.cursorDate(decoded.sortKey), id: decoded.id };
}

export type CostHeadTotal = { head: CostHead; amountPaise: bigint };

/** Flat form of `cycleCosts`, for callers that render a cost table. */
export async function costTotalsByHead(input: {
  projectId: string;
  cycleId: string;
}): Promise<{ totals: CostHeadTotal[]; totalCostPaise: bigint }> {
  const costs = await cycleCosts(input.projectId, input.cycleId);
  const totals = COST_HEADS.filter((head) => (costs.costsByHead[head] ?? 0n) !== 0n).map(
    (head) => ({ head, amountPaise: costs.costsByHead[head] ?? 0n }),
  );
  return { totals, totalCostPaise: costs.totalCostPaise };
}

/** Total already paid out for a cycle, so a second disbursement can be refused. */
export async function payoutTotalsByCycle(
  projectId: string,
  cycleId: string,
): Promise<{ paidOutPaise: bigint }> {
  const paidOutPaise = await repo.totalOfType(ADMIN_SCOPE, {
    projectId,
    type: 'payout',
    cycleId,
    costHead: undefined,
    membershipId: undefined,
    from: undefined,
    to: undefined,
  });
  return { paidOutPaise };
}
