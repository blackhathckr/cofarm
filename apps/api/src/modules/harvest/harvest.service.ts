import { ERROR_CODES } from '@cofarm/contracts/errors';
import type {
  CreateHarvestBody,
  Harvest,
  HarvestPreview,
  HarvestShare,
  UpdateHarvestBody,
} from '@cofarm/contracts/harvest';
import { costTotalsSchema, type CostTotals } from '@cofarm/contracts/ledger';
import type { ProjectPartner } from '@cofarm/contracts/partners';
import { fromPaiseString, toPaiseString } from '@cofarm/contracts/primitives';
import type { EntityType } from '@cofarm/contracts/tracking';
import { newId } from '@cofarm/core/id';
import { formatInr, sumPaise } from '@cofarm/core/money';
import {
  computeCyclePnl,
  COST_HEADS,
  returnBasisPoints,
  type CostHead,
  type CyclePnl,
} from '@cofarm/core/pnl';

import { badRequest, conflict, notFound, unprocessable, type AppError } from '../../lib/errors.ts';
import { isFutureInIndia } from '../../lib/india-date.ts';
import { pickDefined } from '../../lib/patch.ts';
import { ADMIN_SCOPE, assertInScope, type ProjectScope } from '../../lib/project-scope.ts';
import * as audit from '../audit/audit.service.ts';
import * as documents from '../documents/documents.service.ts';
import * as ledger from '../ledger/ledger.service.ts';
import * as notifications from '../notifications/notifications.service.ts';
import * as partners from '../partners/partners.service.ts';
import * as projects from '../projects/projects.service.ts';

import * as repo from './harvest.repo.ts';
import { storedCostTotals } from './harvest.statements.ts';

const HARVEST_ENTITY: EntityType = 'harvest';
const ENTITY_TABLE = 'harvests';

export type HarvestViewer = {
  scope: ProjectScope;
  publishedOnly: boolean;
};

type Participant = {
  membershipId: string;
  contributionPaise: bigint;
};

export async function listHarvests(viewer: HarvestViewer, projectId: string): Promise<Harvest[]> {
  assertInScope(viewer.scope, projectId);

  const rows = await repo.listHarvests(viewer.scope, {
    projectId,
    publishedOnly: viewer.publishedOnly,
  });
  const attachments = await attachmentsFor(rows.map((row) => row.id));
  return rows.map((row) => toHarvestDto(row, attachments.get(row.id) ?? NO_ATTACHMENTS));
}

/** A draft is an internal artefact: a partner is told it does not exist. */
export async function getHarvest(
  viewer: HarvestViewer,
  projectId: string,
  harvestId: string,
): Promise<Harvest> {
  assertInScope(viewer.scope, projectId);

  const row = await repo.findHarvest(viewer.scope, projectId, harvestId);
  if (row === null) throw notFound('Harvest');
  if (viewer.publishedOnly && row.status !== 'published') throw notFound('Harvest');

  const attachments = await attachmentsFor([row.id]);
  return toHarvestDto(row, attachments.get(row.id) ?? NO_ATTACHMENTS);
}

export async function createHarvest(
  projectId: string,
  input: CreateHarvestBody,
  actorUserId: string,
): Promise<Harvest> {
  await projects.getProject(ADMIN_SCOPE, projectId);
  assertNotFuture(input.harvestedOn);
  assertVarietySplitMatches(input.yieldKg, input.varietySplit);

  const cycleNo = await cycleNumber(projectId, input.cycleId);
  const existing = await repo.findHarvestByCycle(ADMIN_SCOPE, projectId, input.cycleId);
  if (existing !== null) throw harvestExists(cycleNo);

  await assertDocuments(projectId, input.weighmentSlipDocumentIds);
  await assertDocuments(projectId, input.harvestPhotoDocumentIds);

  const pricePerKgPaise = fromPaiseString(input.pricePerKgPaise);
  const created = await repo.insertHarvest({
    id: newId(),
    projectId,
    cycleId: input.cycleId,
    yieldKg: input.yieldKg,
    varietySplit: input.varietySplit,
    pricePerKgPaise,
    buyer: input.buyer,
    grossRevenuePaise: grossRevenueOf(input.yieldKg, pricePerKgPaise),
    harvestedOn: input.harvestedOn,
    status: 'draft',
    createdBy: actorUserId,
  });
  if (created === null) throw harvestExists(cycleNo);

  await persistDocuments(created.id, projectId, input);

  await audit.record({
    action: 'harvest.created',
    entityTable: ENTITY_TABLE,
    entityId: created.id,
    projectId,
    after: { ...created, ...attachedDocuments(input) },
  });

  const attachments = await attachmentsFor([created.id]);
  return toHarvestDto({ ...created, cycleNo }, attachments.get(created.id) ?? NO_ATTACHMENTS);
}

export async function updateHarvest(
  projectId: string,
  harvestId: string,
  input: UpdateHarvestBody,
): Promise<Harvest> {
  const before = await repo.findHarvest(ADMIN_SCOPE, projectId, harvestId);
  if (before === null) throw notFound('Harvest');
  if (before.status === 'published') throw alreadyPublished();

  const yieldKg = input.yieldKg ?? before.yieldKg;
  const varietySplit = input.varietySplit ?? before.varietySplit;
  const pricePerKgPaise =
    input.pricePerKgPaise === undefined
      ? before.pricePerKgPaise
      : fromPaiseString(input.pricePerKgPaise);

  assertVarietySplitMatches(yieldKg, varietySplit);
  if (input.harvestedOn !== undefined) assertNotFuture(input.harvestedOn);
  await assertDocuments(projectId, input.weighmentSlipDocumentIds);
  await assertDocuments(projectId, input.harvestPhotoDocumentIds);

  const updated = await repo.updateHarvest(harvestId, {
    yieldKg,
    varietySplit,
    pricePerKgPaise,
    grossRevenuePaise: grossRevenueOf(yieldKg, pricePerKgPaise),
    ...pickDefined({ buyer: input.buyer, harvestedOn: input.harvestedOn }),
  });
  if (updated === null) throw alreadyPublished();

  await persistDocuments(harvestId, projectId, input);

  await audit.record({
    action: 'harvest.updated',
    entityTable: ENTITY_TABLE,
    entityId: harvestId,
    projectId,
    before,
    after: { ...updated, ...attachedDocuments(input) },
  });

  const attachments = await attachmentsFor([harvestId]);
  return toHarvestDto(
    { ...updated, cycleNo: before.cycleNo },
    attachments.get(harvestId) ?? NO_ATTACHMENTS,
  );
}

export async function previewHarvest(
  scope: ProjectScope,
  projectId: string,
  harvestId: string,
): Promise<HarvestPreview> {
  const harvest = await repo.findHarvest(scope, projectId, harvestId);
  if (harvest === null) throw notFound('Harvest');

  const roster = await partners.listProjectPartners(scope, projectId);

  // A published harvest reports its own snapshot: costs recorded afterwards
  // must not restate a statement partners have already been shown.
  if (harvest.status === 'published') {
    const statements = await repo.statementsForCycle(scope, projectId, harvest.cycleId);
    return previewFromStatements(harvest, statements, roster);
  }

  const project = await projects.getProject(scope, projectId);
  const pnl = await computePnl(projectId, harvest, roster, project.kiaanShareBps);
  return {
    harvestId: harvest.id,
    projectId,
    cycleId: harvest.cycleId,
    cycleNo: harvest.cycleNo,
    status: harvest.status,
    grossRevenuePaise: toPaiseString(pnl.grossRevenuePaise),
    costsByHead: toCostTotals(pnl.costsByHead),
    totalCostPaise: toPaiseString(pnl.totalCostPaise),
    netProceedsPaise: toPaiseString(pnl.netProceedsPaise),
    kiaanShareBps: project.kiaanShareBps,
    kiaanSharePaise: toPaiseString(pnl.kiaanSharePaise),
    partnerPoolPaise: toPaiseString(pnl.partnerPoolPaise),
    partners: pnl.partnerShares.map((share) =>
      toShareDto(share.membershipId, share.contributionPaise, share.sharePaise, roster),
    ),
  };
}

export async function publishHarvest(projectId: string, harvestId: string): Promise<Harvest> {
  const harvest = await repo.findHarvest(ADMIN_SCOPE, projectId, harvestId);
  if (harvest === null) throw notFound('Harvest');
  if (harvest.status === 'published') throw alreadyPublished();

  const project = await projects.getProject(ADMIN_SCOPE, projectId);
  const roster = await partners.listProjectPartners(ADMIN_SCOPE, projectId);
  const pnl = await computePnl(projectId, harvest, roster, project.kiaanShareBps);

  const priorShares = await priorShareIndex(
    projectId,
    pnl.partnerShares.map((share) => share.membershipId),
  );

  const publishedAt = new Date();
  const costsByHead = toCostTotals(pnl.costsByHead);
  const published = await repo.publishHarvest({
    harvestId,
    publishedAt,
    statements: pnl.partnerShares.map((share) => ({
      id: newId(),
      projectId,
      cycleId: harvest.cycleId,
      membershipId: share.membershipId,
      grossRevenuePaise: pnl.grossRevenuePaise,
      totalCostPaise: pnl.totalCostPaise,
      netProceedsPaise: pnl.netProceedsPaise,
      kiaanSharePaise: pnl.kiaanSharePaise,
      partnerPoolPaise: pnl.partnerPoolPaise,
      sharePaise: share.sharePaise,
      contributionPaise: share.contributionPaise,
      cumulativeSharePaise: (priorShares.get(share.membershipId) ?? 0n) + share.sharePaise,
      costsByHead,
      kiaanShareBps: project.kiaanShareBps,
      cycleNo: harvest.cycleNo,
      generatedAt: publishedAt,
    })),
  });
  if (published === null) throw alreadyPublished();

  // The statements commit first: a revenue entry missing after a failure here
  // can be appended, while an entry the append-only ledger already holds for a
  // harvest that never published could not be taken back.
  await ledger.recordRevenue({
    projectId,
    cycleId: harvest.cycleId,
    amountPaise: harvest.grossRevenuePaise,
    entryDate: harvest.harvestedOn,
    note: `Cycle ${harvest.cycleNo} harvest sold to ${harvest.buyer}`,
  });

  // After the revenue entry, so the sale itself still reaches an open cycle.
  await projects.settleCycle(projectId, harvest.cycleId);

  await audit.record({
    action: 'harvest.published',
    entityTable: ENTITY_TABLE,
    entityId: harvestId,
    projectId,
    before: harvest,
    after: published,
  });

  await notifications.notifyProjectPartners({
    projectId,
    type: 'harvest_published',
    title: `Cycle ${harvest.cycleNo} statement is ready`,
    body: `${project.name} sold ${harvest.yieldKg} kg to ${harvest.buyer}. Net proceeds ${formatInr(pnl.netProceedsPaise)}.`,
    entityType: HARVEST_ENTITY,
    entityId: harvestId,
    payload: {
      harvestId,
      cycleId: harvest.cycleId,
      cycleNo: harvest.cycleNo.toString(),
    },
  });

  const attachments = await attachmentsFor([published.id]);
  return toHarvestDto(
    { ...published, cycleNo: harvest.cycleNo },
    attachments.get(published.id) ?? NO_ATTACHMENTS,
  );
}

async function computePnl(
  projectId: string,
  harvest: repo.HarvestDetailRow,
  roster: readonly ProjectPartner[],
  kiaanShareBps: number,
): Promise<CyclePnl> {
  const participants = activeParticipants(roster);
  if (
    participants.length === 0 ||
    sumPaise(participants.map((participant) => participant.contributionPaise)) === 0n
  ) {
    throw unprocessable(
      ERROR_CODES.noActiveMembership,
      'This project has no active partner contribution to divide',
      'Map partners and record their contribution before publishing a harvest.',
    );
  }

  const costs = await ledger.cycleCosts(projectId, harvest.cycleId);
  return computeCyclePnl({
    grossRevenuePaise: harvest.grossRevenuePaise,
    costsByHead: costs.costsByHead,
    kiaanShareBasisPoints: kiaanShareBps,
    participants,
  });
}

function previewFromStatements(
  harvest: repo.HarvestDetailRow,
  statements: readonly repo.StatementDetailRow[],
  roster: readonly ProjectPartner[],
): HarvestPreview {
  const head = statements.at(0);
  if (head === undefined) throw notFound('Statement');

  return {
    harvestId: harvest.id,
    projectId: harvest.projectId,
    cycleId: harvest.cycleId,
    cycleNo: harvest.cycleNo,
    status: harvest.status,
    grossRevenuePaise: toPaiseString(head.grossRevenuePaise),
    costsByHead: storedCostTotals(head.costsByHead),
    totalCostPaise: toPaiseString(head.totalCostPaise),
    netProceedsPaise: toPaiseString(head.netProceedsPaise),
    kiaanShareBps: head.kiaanShareBps,
    kiaanSharePaise: toPaiseString(head.kiaanSharePaise),
    partnerPoolPaise: toPaiseString(head.partnerPoolPaise),
    partners: statements.map((statement) =>
      toShareDto(statement.membershipId, statement.contributionPaise, statement.sharePaise, roster),
    ),
  };
}

function toShareDto(
  membershipId: string,
  contributionPaise: bigint,
  sharePaise: bigint,
  roster: readonly ProjectPartner[],
): HarvestShare {
  const member = roster.find((row) => row.membershipId === membershipId);
  return {
    membershipId,
    partnerId: member?.partnerId ?? membershipId,
    name: member?.name ?? 'Former partner',
    contributionPaise: toPaiseString(contributionPaise),
    sharePaise: toPaiseString(sharePaise),
    returnBps: returnBasisPoints(contributionPaise, sharePaise),
  };
}

/** A partner sees their own row and nothing else; an admin names the row. */

function activeParticipants(roster: readonly ProjectPartner[]): Participant[] {
  return roster
    .filter((row) => row.status === 'active')
    .map((row) => ({
      membershipId: row.membershipId,
      contributionPaise: fromPaiseString(row.contributionPaise),
    }));
}

async function priorShareIndex(
  projectId: string,
  membershipIds: readonly string[],
): Promise<Map<string, bigint>> {
  const rows = await repo.shareTotalsByMembership(projectId, membershipIds);
  return new Map(rows.map((row) => [row.membershipId, BigInt(row.totalPaise ?? '0')]));
}

async function cycleNumber(projectId: string, cycleId: string): Promise<number> {
  const cycles = await projects.listCycles(ADMIN_SCOPE, projectId);
  const cycle = cycles.find((row) => row.id === cycleId);
  if (cycle === undefined) throw notFound('Cycle');
  return cycle.cycleNo;
}

async function assertDocuments(
  projectId: string,
  documentIds: readonly string[] | undefined,
): Promise<void> {
  if (documentIds === undefined) return;
  await documents.assertDocumentsInProject(documentIds, projectId);
}

/** Slips and photos are stored on their own rows, so order and kind survive. */
async function persistDocuments(
  harvestId: string,
  projectId: string,
  input: Pick<UpdateHarvestBody, 'weighmentSlipDocumentIds' | 'harvestPhotoDocumentIds'>,
): Promise<void> {
  if (input.weighmentSlipDocumentIds !== undefined) {
    await repo.replaceHarvestDocuments(
      harvestId,
      projectId,
      'weighment_slip',
      input.weighmentSlipDocumentIds,
    );
  }
  if (input.harvestPhotoDocumentIds !== undefined) {
    await repo.replaceHarvestDocuments(
      harvestId,
      projectId,
      'harvest_photo',
      input.harvestPhotoDocumentIds,
    );
  }
}

async function attachmentsFor(
  harvestIds: readonly string[],
): Promise<Map<string, { weighmentSlipDocumentIds: string[]; harvestPhotoDocumentIds: string[] }>> {
  const rows = await repo.documentsForHarvests(harvestIds);
  const byHarvest = new Map<
    string,
    { weighmentSlipDocumentIds: string[]; harvestPhotoDocumentIds: string[] }
  >();

  for (const row of rows) {
    const entry = byHarvest.get(row.harvestId) ?? {
      weighmentSlipDocumentIds: [],
      harvestPhotoDocumentIds: [],
    };
    if (row.kind === 'weighment_slip') entry.weighmentSlipDocumentIds.push(row.documentId);
    else entry.harvestPhotoDocumentIds.push(row.documentId);
    byHarvest.set(row.harvestId, entry);
  }

  return byHarvest;
}

function attachedDocuments(
  input: Pick<UpdateHarvestBody, 'weighmentSlipDocumentIds' | 'harvestPhotoDocumentIds'>,
): Record<string, readonly string[]> {
  return {
    ...(input.weighmentSlipDocumentIds === undefined
      ? {}
      : { weighmentSlipDocumentIds: input.weighmentSlipDocumentIds }),
    ...(input.harvestPhotoDocumentIds === undefined
      ? {}
      : { harvestPhotoDocumentIds: input.harvestPhotoDocumentIds }),
  };
}

function assertVarietySplitMatches(
  yieldKg: string,
  varietySplit: Readonly<Record<string, string>>,
): void {
  const split = Object.values(varietySplit).reduce<bigint>(
    (total, kilograms) => total + kilogramsToHundredths(kilograms),
    0n,
  );
  const total = kilogramsToHundredths(yieldKg);
  if (split !== total) {
    throw badRequest(
      `The variety split totals ${hundredthsToKilograms(split)} kg against a yield of ${yieldKg} kg`,
    );
  }
}

function assertNotFuture(harvestedOn: string): void {
  if (isFutureInIndia(harvestedOn)) {
    throw badRequest('A harvest cannot be dated in the future');
  }
}

/**
 * Yield carries two decimal places and the price is already whole paise, so
 * their product is exact in hundredths of a paisa and rounded half-up from
 * there: paise is the smallest unit the ledger holds.
 */
function grossRevenueOf(yieldKg: string, pricePerKgPaise: bigint): bigint {
  return (kilogramsToHundredths(yieldKg) * pricePerKgPaise + 50n) / 100n;
}

function kilogramsToHundredths(kilograms: string): bigint {
  const [whole = '0', fraction = ''] = kilograms.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function hundredthsToKilograms(hundredths: bigint): string {
  const fraction = (hundredths % 100n).toString().padStart(2, '0');
  return `${hundredths / 100n}.${fraction}`;
}

function toCostTotals(totals: Readonly<Partial<Record<CostHead, bigint>>>): CostTotals {
  return costTotalsSchema.parse(
    Object.fromEntries(COST_HEADS.map((head) => [head, toPaiseString(totals[head] ?? 0n)])),
  );
}

function alreadyPublished(): AppError {
  return conflict(
    ERROR_CODES.harvestAlreadyPublished,
    'This harvest is published and can no longer be changed',
    'Record a correction as a new ledger adjustment.',
  );
}

function harvestExists(cycleNo: number): AppError {
  return conflict(
    ERROR_CODES.harvestExists,
    `Cycle ${cycleNo} already has a harvest`,
    'A cycle carries one harvest; edit the existing draft instead.',
  );
}

const NO_ATTACHMENTS = { weighmentSlipDocumentIds: [], harvestPhotoDocumentIds: [] };

function toHarvestDto(
  row: repo.HarvestDetailRow,
  attachments: { weighmentSlipDocumentIds: string[]; harvestPhotoDocumentIds: string[] } = {
    weighmentSlipDocumentIds: [],
    harvestPhotoDocumentIds: [],
  },
): Harvest {
  return {
    id: row.id,
    projectId: row.projectId,
    cycleId: row.cycleId,
    cycleNo: row.cycleNo,
    yieldKg: row.yieldKg,
    varietySplit: row.varietySplit,
    pricePerKgPaise: toPaiseString(row.pricePerKgPaise),
    buyer: row.buyer,
    grossRevenuePaise: toPaiseString(row.grossRevenuePaise),
    harvestedOn: row.harvestedOn,
    status: row.status,
    weighmentSlipDocumentIds: attachments.weighmentSlipDocumentIds,
    harvestPhotoDocumentIds: attachments.harvestPhotoDocumentIds,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export type HarvestDraft = {
  projectId: string;
  projectCode: string;
  harvestId: string;
  label: string;
};

/** Drafts awaiting publish, for the admin dashboard's task list. */
export async function listDrafts(scope: ProjectScope): Promise<HarvestDraft[]> {
  const rows = await repo.listDraftHarvests(scope);
  return rows.map((row) => ({
    projectId: row.projectId,
    projectCode: row.projectCode,
    harvestId: row.id,
    label: `Cycle ${row.cycleNo.toString()} harvest is entered but not published`,
  }));
}
