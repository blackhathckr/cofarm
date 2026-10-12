import type {
  MyStatements,
  MyStatementsQuery,
  PartnerStatement,
  StatementTotals,
} from '@cofarm/contracts/harvest';
import { costTotalsSchema, type CostTotals } from '@cofarm/contracts/ledger';
import type { ProjectPartner } from '@cofarm/contracts/partners';
import { toPaiseString } from '@cofarm/contracts/primitives';
import { sumPaise } from '@cofarm/core/money';
import { COST_HEADS, returnBasisPoints } from '@cofarm/core/pnl';

import * as cursor from '../../lib/cursor.ts';
import { badRequest, forbidden, notFound } from '../../lib/errors.ts';
import { assertInScope, type ProjectScope } from '../../lib/project-scope.ts';
import * as partners from '../partners/partners.service.ts';
import * as tracking from '../tracking/tracking.service.ts';

import * as repo from './harvest.repo.ts';

const STATEMENT_ENTITY = 'partner_statement' as const;

export type StatementViewer = {
  userId: string;
  scope: ProjectScope;
  isPartner: boolean;
};

export async function cycleStatement(
  viewer: StatementViewer,
  projectId: string,
  cycleId: string,
  membershipId: string | undefined,
): Promise<PartnerStatement> {
  assertInScope(viewer.scope, projectId);

  const roster = await partners.listProjectPartners(viewer.scope, projectId);
  const target = resolveStatementTarget(viewer, roster, membershipId);

  const row = await repo.findStatement(viewer.scope, projectId, cycleId, target.membershipId);
  if (row === null) throw notFound('Statement');

  if (viewer.isPartner) {
    await tracking.markRead({
      userId: viewer.userId,
      projectId,
      entityType: STATEMENT_ENTITY,
      entityId: row.id,
    });
  }

  return toStatementDto(row, target.name);
}

export async function myStatements(
  viewer: StatementViewer,
  query: MyStatementsQuery,
): Promise<MyStatements> {
  if (!viewer.isPartner) return { items: [], nextCursor: null, totals: emptyTotals() };

  const partner = await partners.getPartner(viewer.scope, viewer.userId);
  const membershipIds = partner.memberships.map((membership) => membership.id);

  // Contribution is taken from each membership's newest statement, so the
  // return compares what was earned against the money it was earned on. Both
  // totals span every statement, not the page.
  const [rows, contributions, totalEarnedPaise] = await Promise.all([
    repo.statementsForMemberships(viewer.scope, membershipIds, {
      limit: query.limit + 1,
      cursor: decodeStatementCursor(query.cursor),
    }),
    repo.latestContributionPerMembership(viewer.scope, membershipIds),
    repo.shareTotalForMemberships(viewer.scope, membershipIds),
  ]);

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const oldest = page.at(-1);
  const totalContributedPaise = sumPaise(contributions.map((row) => row.contributionPaise));

  return {
    items: page.map((row) => toStatementDto(row, partner.name)),
    nextCursor: hasMore && oldest !== undefined ? encodeStatementCursor(oldest) : null,
    totals: {
      totalContributedPaise: toPaiseString(totalContributedPaise),
      totalEarnedPaise: toPaiseString(totalEarnedPaise),
      returnBps: returnBasisPoints(totalContributedPaise, totalEarnedPaise),
    },
  };
}

function encodeStatementCursor(row: repo.StatementDetailRow): string {
  return cursor.encodeCursor(row.generatedAt.toISOString(), row.id);
}

function decodeStatementCursor(raw: string | undefined): repo.StatementCursor | undefined {
  const decoded = cursor.decodeCursor(raw);
  if (decoded === undefined) return undefined;
  return { generatedAt: cursor.cursorTimestamp(decoded.sortKey), id: decoded.id };
}

function resolveStatementTarget(
  viewer: StatementViewer,
  roster: readonly ProjectPartner[],
  requested: string | undefined,
): ProjectPartner {
  if (viewer.isPartner) {
    const own = roster.find((row) => row.partnerId === viewer.userId);
    if (own === undefined) throw notFound('Statement');
    if (requested !== undefined && requested !== own.membershipId) {
      throw forbidden('A partner may only read their own statement');
    }
    return own;
  }

  if (requested === undefined) {
    throw badRequest('Pass membershipId to choose which partner statement to read');
  }
  const target = roster.find((row) => row.membershipId === requested);
  if (target === undefined) throw notFound('Membership');
  return target;
}

export function storedCostTotals(stored: Readonly<Record<string, string>>): CostTotals {
  return costTotalsSchema.parse(
    Object.fromEntries(COST_HEADS.map((head) => [head, stored[head] ?? '0'])),
  );
}

function emptyTotals(): StatementTotals {
  return { totalContributedPaise: '0', totalEarnedPaise: '0', returnBps: 0 };
}

function toStatementDto(row: repo.StatementDetailRow, partnerName: string): PartnerStatement {
  return {
    id: row.id,
    projectId: row.projectId,
    projectCode: row.projectCode,
    projectName: row.projectName,
    cycleId: row.cycleId,
    cycleNo: row.cycleNo,
    membershipId: row.membershipId,
    partnerName,
    yieldKg: row.yieldKg,
    varietySplit: row.varietySplit,
    pricePerKgPaise: toPaiseString(row.pricePerKgPaise),
    buyer: row.buyer,
    harvestedOn: row.harvestedOn,
    grossRevenuePaise: toPaiseString(row.grossRevenuePaise),
    costsByHead: storedCostTotals(row.costsByHead),
    totalCostPaise: toPaiseString(row.totalCostPaise),
    netProceedsPaise: toPaiseString(row.netProceedsPaise),
    kiaanShareBps: row.kiaanShareBps,
    kiaanSharePaise: toPaiseString(row.kiaanSharePaise),
    partnerPoolPaise: toPaiseString(row.partnerPoolPaise),
    sharePaise: toPaiseString(row.sharePaise),
    contributionPaise: toPaiseString(row.contributionPaise),
    cumulativeSharePaise: toPaiseString(row.cumulativeSharePaise),
    returnBps: returnBasisPoints(row.contributionPaise, row.sharePaise),
    generatedAt: row.generatedAt.toISOString(),
  };
}
