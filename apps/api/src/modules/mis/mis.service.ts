import { ERROR_CODES } from '@cofarm/contracts/errors';
import {
  misCursor,
  misPeriodLabel,
  type CreateMisBody,
  type ListMisQuery,
  type MisComposePayload,
  type MisCostHead,
  type MisFigureSource,
  type MisLatest,
  type MisMilestoneState,
  type MisPage,
  type MisPhotograph,
  type MisReport,
  type MisSummary,
  type UpdateMisBody,
} from '@cofarm/contracts/mis';
import { toPaiseString } from '@cofarm/contracts/primitives';
import type { Cycle, Project } from '@cofarm/contracts/projects';
import type { EntityReceipts, EntityType } from '@cofarm/contracts/tracking';
import { activeStage, MILESTONE_LABELS } from '@cofarm/core/cycle';
import { newId } from '@cofarm/core/id';
import { formatInr } from '@cofarm/core/money';

import { badRequest, conflict, notFound, unprocessable, type AppError } from '../../lib/errors.ts';
import { indiaToday } from '../../lib/india-date.ts';
import { pickDefined } from '../../lib/patch.ts';
import * as ledger from '../ledger/ledger.service.ts';
import * as updates from '../updates/updates.service.ts';
import { ADMIN_SCOPE, assertInScope, type ProjectScope } from '../../lib/project-scope.ts';
import * as audit from '../audit/audit.service.ts';
import * as documents from '../documents/documents.service.ts';
import * as notifications from '../notifications/notifications.service.ts';
import * as projects from '../projects/projects.service.ts';
import * as tracking from '../tracking/tracking.service.ts';

import { misReportPdfFilename, renderMisReportPdf, type ReportPhoto } from './mis.report-pdf.tsx';
import * as repo from './mis.repo.ts';

const MIS_ENTITY: EntityType = 'mis_report';
const ENTITY_TABLE = 'mis_reports';

/** A representative handful, laid out as a two-by-three grid on one page. A
 * month of daily updates can carry dozens, which no reader wants. */
const REPORT_PHOTO_LIMIT = 6;

export type MisViewer = {
  userId: string;
  scope: ProjectScope;
  canSeeDrafts: boolean;
  isPartner: boolean;
};

type ReadState = {
  isRead: boolean;
  isNew: boolean;
};

type MisPeriod = {
  year: number;
  month: number;
};

type CostTotal = {
  head: MisCostHead;
  amountPaise: bigint;
};

type ComposeFigures = {
  costsByHead: readonly CostTotal[];
  totalCostPaise: bigint;
  updateCount: number;
  photographs: readonly MisPhotograph[];
  unavailable: readonly MisFigureSource[];
};

export async function listReports(
  viewer: MisViewer,
  projectId: string,
  query: ListMisQuery,
): Promise<MisPage> {
  assertInScope(viewer.scope, projectId);

  const rows = await repo.listReports(viewer.scope, {
    projectId,
    publishedOnly: !viewer.canSeeDrafts,
    cursor: parsePeriodCursor(query.cursor),
    limit: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const read = await readIdsFor(viewer, projectId, page);
  const last = page.at(-1);

  return {
    items: page.map((row) => toSummary(row, readState(viewer, row, read.has(row.id)))),
    nextCursor: hasMore && last !== undefined ? misCursor(last.year, last.month) : null,
  };
}

export async function getReport(
  viewer: MisViewer,
  projectId: string,
  reportId: string,
): Promise<MisReport> {
  assertInScope(viewer.scope, projectId);

  const row = await repo.findReport(viewer.scope, projectId, reportId);
  if (row === null) throw notFound('MIS report');
  assertVisibleTo(viewer, row);

  if (viewer.isPartner) {
    await tracking.markRead({
      userId: viewer.userId,
      projectId,
      entityType: MIS_ENTITY,
      entityId: row.id,
    });
  }

  return toReport(row, readState(viewer, row, viewer.isPartner));
}

export async function latestForMember(viewer: MisViewer): Promise<MisLatest[]> {
  const rows = await repo.latestPublishedPerProject(viewer.scope);
  const reads = await Promise.all(rows.map((row) => isReadByViewer(viewer, row.projectId, row)));

  return rows
    .map((row, index) => ({
      ...toSummary(row, readState(viewer, row, reads[index] ?? false)),
      projectId: row.projectId,
      projectCode: row.projectCode,
      projectName: row.projectName,
    }))
    .sort((left, right) => (right.publishedAt ?? '').localeCompare(left.publishedAt ?? ''));
}

export async function createReport(
  projectId: string,
  input: CreateMisBody,
  actorUserId: string,
): Promise<MisReport> {
  await projects.getProject(ADMIN_SCOPE, projectId);

  if (input.source === 'uploaded' && input.documentId === undefined) {
    throw badRequest('An uploaded report needs the documentId of its PDF');
  }
  if (input.documentId !== undefined) {
    await documents.assertDocumentInProject(input.documentId, projectId);
  }

  const existing = await repo.findByPeriod(ADMIN_SCOPE, projectId, input.year, input.month);
  if (existing !== null) throw periodConflict(input.month, input.year);

  const created = await repo.insertReport({
    id: newId(),
    projectId,
    month: input.month,
    year: input.year,
    title: input.title,
    narrative: input.narrative ?? null,
    outlook: input.outlook ?? null,
    source: input.source,
    documentId: input.documentId ?? null,
    status: 'draft',
    createdBy: actorUserId,
  });
  if (created === null) throw periodConflict(input.month, input.year);

  await audit.record({
    action: 'mis.created',
    entityTable: ENTITY_TABLE,
    entityId: created.id,
    projectId,
    after: created,
  });

  return toReport(created, { isRead: false, isNew: false });
}

export async function updateReport(
  projectId: string,
  reportId: string,
  input: UpdateMisBody,
): Promise<MisReport> {
  const before = await repo.findReport(ADMIN_SCOPE, projectId, reportId);
  if (before === null) throw notFound('MIS report');
  if (before.status === 'published') {
    throw conflict(
      ERROR_CODES.alreadyPublished,
      'A published report can no longer be edited',
      'Publish a corrected report for a later period instead.',
    );
  }

  if (input.documentId !== undefined && input.documentId !== null) {
    await documents.assertDocumentInProject(input.documentId, projectId);
  }
  if (before.source === 'uploaded' && input.documentId === null) {
    throw badRequest('An uploaded report cannot drop its PDF');
  }

  const updated = await repo.updateReport(
    reportId,
    pickDefined({
      title: input.title,
      narrative: input.narrative,
      outlook: input.outlook,
      documentId: input.documentId,
    }),
  );
  if (updated === null) throw notFound('MIS report');

  await audit.record({
    action: 'mis.updated',
    entityTable: ENTITY_TABLE,
    entityId: reportId,
    projectId,
    before,
    after: updated,
  });

  return toReport(updated, { isRead: false, isNew: false });
}

export async function publishReport(projectId: string, reportId: string): Promise<MisReport> {
  const before = await repo.findReport(ADMIN_SCOPE, projectId, reportId);
  if (before === null) throw notFound('MIS report');
  if (before.status === 'published') {
    throw conflict(ERROR_CODES.alreadyPublished, 'This report is already published');
  }

  // A generated report renders its own PDF here; a manual upload is the
  // fallback rather than the only path, so an uploaded one still needs its own.
  const documentId = before.documentId ?? (await generateReportDocumentId(projectId, before));

  const published = await repo.updateReport(reportId, {
    status: 'published',
    publishedAt: new Date(),
    documentId,
  });
  if (published === null) throw notFound('MIS report');

  await audit.record({
    action: 'mis.published',
    entityTable: ENTITY_TABLE,
    entityId: reportId,
    projectId,
    before,
    after: published,
  });

  const label = misPeriodLabel(published.month, published.year);
  await notifications.notifyProjectPartners({
    projectId,
    type: 'mis_published',
    title: `MIS report: ${label}`,
    body: published.title,
    entityType: MIS_ENTITY,
    entityId: published.id,
    payload: {
      reportId: published.id,
      month: published.month.toString(),
      year: published.year.toString(),
    },
  });

  return toReport(published, { isRead: false, isNew: false });
}

/**
 * Pulls a published report back to a draft so a wrong figure can be corrected.
 * The period is unique per project, so without this a published mistake could
 * never be fixed: it cannot be edited, deleted, or superseded by a second
 * report for the same month.
 */
export async function unpublishReport(projectId: string, reportId: string): Promise<MisReport> {
  const before = await repo.findReport(ADMIN_SCOPE, projectId, reportId);
  if (before === null) throw notFound('MIS report');
  if (before.status !== 'published') {
    throw conflict(ERROR_CODES.notPublished, 'This report is not published');
  }

  // A generated PDF holds the figures as they were. Dropping it makes the next
  // publish render the corrected ones instead of silently reusing the old file.
  const staleDocumentId = before.source === 'generated' ? before.documentId : null;

  const draft = await repo.updateReport(reportId, {
    status: 'draft',
    publishedAt: null,
    ...(staleDocumentId === null ? {} : { documentId: null }),
  });
  if (draft === null) throw notFound('MIS report');

  await tracking.clearReceipts({
    projectId,
    entityType: MIS_ENTITY,
    entityId: reportId,
  });

  if (staleDocumentId !== null) {
    await documents.discardGenerated(staleDocumentId);
  }

  await audit.record({
    action: 'mis.unpublished',
    entityTable: ENTITY_TABLE,
    entityId: reportId,
    projectId,
    before,
    after: draft,
  });

  return toReport(draft, { isRead: false, isNew: false });
}

export async function deleteReport(projectId: string, reportId: string): Promise<void> {
  const row = await repo.findReport(ADMIN_SCOPE, projectId, reportId);
  if (row === null) throw notFound('MIS report');

  await repo.deleteReport(reportId);

  // The report is gone, so what partners read of it and were told about it
  // goes too; otherwise a receipt counts a document nobody can open.
  await tracking.clearReceipts({ projectId, entityType: MIS_ENTITY, entityId: reportId });
  await notifications.discardForEntity({ entityType: MIS_ENTITY, entityId: reportId });
  // Generated or uploaded, the PDF existed only for this report.
  if (row.documentId !== null) await documents.discardMany([row.documentId]);

  await audit.record({
    action: 'mis.deleted',
    entityTable: ENTITY_TABLE,
    entityId: reportId,
    projectId,
    before: row,
  });
}

export async function receiptsForReport(
  scope: ProjectScope,
  projectId: string,
  reportId: string,
): Promise<EntityReceipts> {
  const row = await repo.findReport(scope, projectId, reportId);
  if (row === null) throw notFound('MIS report');

  return tracking.receiptsFor(scope, {
    projectId,
    entityType: MIS_ENTITY,
    entityId: reportId,
  });
}

type StoreComposedInput = {
  projectId: string;
  row: repo.MisReportRow;
  narrative?: string;
  outlook?: string;
};

async function storeComposedText(input: StoreComposedInput): Promise<void> {
  const stored = await repo.updateReport(
    input.row.id,
    pickDefined({ narrative: input.narrative, outlook: input.outlook }),
  );
  if (stored === null) return;

  await audit.record({
    action: 'mis.updated',
    entityTable: ENTITY_TABLE,
    entityId: input.row.id,
    projectId: input.projectId,
    before: input.row,
    after: stored,
  });
}

export async function composeReport(
  projectId: string,
  reportId: string,
): Promise<MisComposePayload> {
  const row = await repo.findReport(ADMIN_SCOPE, projectId, reportId);
  if (row === null) throw notFound('MIS report');

  const project = await projects.getProject(ADMIN_SCOPE, projectId);
  const figures = await composeFigures(
    projectId,
    { year: row.year, month: row.month },
    project.currentCycle?.id ?? null,
  );
  const milestone = toMilestoneState(project.currentCycle);
  const label = misPeriodLabel(row.month, row.year);

  const narrative = row.narrative ?? composeNarrative(project, label, figures, milestone);
  const outlook = row.outlook ?? composeOutlook(project);

  // Text built on figures no module has supplied yet would read as a month of
  // zero spend, so nothing is written back until they are wired.
  const canStore = missingFigures(figures).length === 0;
  const narrativeStored = canStore && row.narrative === null;
  const outlookStored = canStore && row.outlook === null;

  if (narrativeStored || outlookStored) {
    await storeComposedText({
      projectId,
      row,
      ...(narrativeStored ? { narrative } : {}),
      ...(outlookStored ? { outlook } : {}),
    });
  }

  return {
    reportId: row.id,
    projectId,
    month: row.month,
    year: row.year,
    label,
    narrative,
    outlook,
    narrativeStored,
    outlookStored,
    costs: composedCosts(project.currentCycle, figures),
    updateCount: figures.updateCount,
    milestone,
    photographs: [...figures.photographs],
    unavailableFigures: [...figures.unavailable],
  };
}

function composedCosts(
  cycle: Project['currentCycle'],
  figures: ComposeFigures,
): MisComposePayload['costs'] {
  return {
    cycleId: cycle?.id ?? null,
    cycleNo: cycle?.cycleNo ?? null,
    totalPaise: toPaiseString(figures.totalCostPaise),
    byHead: figures.costsByHead.map((total) => ({
      head: total.head,
      amountPaise: toPaiseString(total.amountPaise),
    })),
  };
}

async function generateReportDocumentId(
  projectId: string,
  row: repo.MisReportRow,
): Promise<string> {
  if (row.source !== 'generated') {
    throw unprocessable(
      ERROR_CODES.misDocumentMissing,
      'Attach the report PDF before publishing',
      'A partner opens the MIS as a document, so a report without one is not publishable.',
    );
  }

  const project = await projects.getProject(ADMIN_SCOPE, projectId);
  const period = { year: row.year, month: row.month };
  const figures = await composeFigures(projectId, period, project.currentCycle?.id ?? null);

  const missing = missingFigures(figures);
  if (missing.length > 0) {
    throw unprocessable(
      ERROR_CODES.misDocumentMissing,
      'The figures this report is generated from are not available, so no PDF can be rendered',
      `Unavailable: ${missing.join(', ')}. Attach a PDF and publish the report as an upload instead.`,
    );
  }

  const milestone = toMilestoneState(project.currentCycle);
  const label = misPeriodLabel(row.month, row.year);

  const pdf = await renderMisReportPdf({
    projectCode: project.code,
    projectName: project.name,
    label,
    title: row.title,
    narrative: row.narrative ?? composeNarrative(project, label, figures, milestone),
    outlook: row.outlook ?? composeOutlook(project),
    costsByHead: costsByHeadRecord(figures.costsByHead),
    totalCostPaise: figures.totalCostPaise,
    updateCount: figures.updateCount,
    milestone,
    photos: await reportPhotos(figures.photographs),
    generatedOn: indiaToday(),
  });

  const document = await documents.storeGeneratedDocument({
    projectId,
    type: 'mis_report',
    originalName: misReportPdfFilename(project.code, row.year, row.month),
    mime: 'application/pdf',
    body: pdf,
  });

  return document.id;
}

function costsByHeadRecord(totals: readonly CostTotal[]): Partial<Record<MisCostHead, bigint>> {
  const byHead: Partial<Record<MisCostHead, bigint>> = {};
  for (const total of totals) byHead[total.head] = total.amountPaise;
  return byHead;
}

/**
 * Cost totals come from the ledger and the period's update count from the
 * updates module, each through its service. A project with no open cycle has
 * no cycle costs to report, so that figure is marked unavailable rather than
 * reported as zero spend.
 */
async function composeFigures(
  projectId: string,
  period: MisPeriod,
  cycleId: string | null,
): Promise<ComposeFigures> {
  const unavailable: MisFigureSource[] = [];

  const [costs, updateCount, photographs] = await Promise.all([
    cycleId === null ? Promise.resolve(null) : ledger.costTotalsByHead({ projectId, cycleId }),
    updates.countInPeriod({ projectId, year: period.year, month: period.month }),
    updates.photosInPeriod({
      projectId,
      year: period.year,
      month: period.month,
      limit: REPORT_PHOTO_LIMIT,
    }),
  ]);

  if (costs === null) unavailable.push('cost_totals');
  if (photographs.length === 0) unavailable.push('photographs');

  return {
    costsByHead: (costs?.totals ?? []).map((total) => ({
      head: total.head,
      amountPaise: total.amountPaise,
    })),
    totalCostPaise: costs?.totalCostPaise ?? 0n,
    updateCount,
    photographs,
    unavailable,
  };
}

/**
 * A month with no photographs is normal and publishes; a figure no module has
 * supplied is not, because the report would read as a month of zero spend.
 */
function missingFigures(figures: ComposeFigures): MisFigureSource[] {
  return figures.unavailable.filter((source) => source !== 'photographs');
}

/** A photograph whose object has gone from storage is skipped: a report must
 * still be publishable without it. */
async function reportPhotos(photographs: readonly MisPhotograph[]): Promise<ReportPhoto[]> {
  const stored = await Promise.all(
    photographs.map(async (photograph) => {
      const object = await documents.readDocumentObject(photograph.documentId);
      if (object === null) return null;
      const format = PDF_IMAGE_FORMATS[object.mime];
      if (format === undefined) return null;
      return { caption: photograph.caption, body: object.body, format };
    }),
  );
  return stored.flatMap((photo) => (photo === null ? [] : [photo]));
}

const PDF_IMAGE_FORMATS: Readonly<Record<string, 'png' | 'jpg' | undefined>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/** One query for the whole page rather than a receipt lookup per report. */
async function readIdsFor(
  viewer: MisViewer,
  projectId: string,
  rows: readonly repo.MisReportRow[],
): Promise<ReadonlySet<string>> {
  if (!viewer.isPartner) return new Set();

  const publishedIds = rows.filter((row) => row.status === 'published').map((row) => row.id);
  if (publishedIds.length === 0) return new Set();

  return tracking.readEntityIds({
    userId: viewer.userId,
    projectId,
    entityType: MIS_ENTITY,
    entityIds: publishedIds,
  });
}

/** A draft is an internal artefact: a partner is told it does not exist. */
function assertVisibleTo(viewer: MisViewer, row: repo.MisReportRow): void {
  if (viewer.canSeeDrafts) return;
  if (row.status !== 'published') throw notFound('MIS report');
}

async function isReadByViewer(
  viewer: MisViewer,
  projectId: string,
  row: repo.MisReportRow,
): Promise<boolean> {
  if (!viewer.isPartner || row.status !== 'published') return false;

  const receipts = await tracking.receiptsFor(viewer.scope, {
    projectId,
    entityType: MIS_ENTITY,
    entityId: row.id,
  });
  return receipts.recipients.some(
    (recipient) => recipient.userId === viewer.userId && recipient.isRead,
  );
}

function readState(viewer: MisViewer, row: repo.MisReportRow, isRead: boolean): ReadState {
  return {
    isRead,
    isNew: viewer.isPartner && row.status === 'published' && !isRead,
  };
}

function parsePeriodCursor(cursor: string | undefined): repo.PeriodCursor | undefined {
  if (cursor === undefined) return undefined;

  const [year, month] = cursor.split('-');
  if (year === undefined || month === undefined) return undefined;

  const parsed = { year: Number(year), month: Number(month) };
  if (!Number.isInteger(parsed.year) || !Number.isInteger(parsed.month)) return undefined;
  return parsed;
}

function periodConflict(month: number, year: number): AppError {
  return conflict(
    ERROR_CODES.misPeriodExists,
    `${misPeriodLabel(month, year)} already has a report for this project`,
  );
}

function toMilestoneState(cycle: Cycle | null): MisMilestoneState | null {
  if (cycle === null) return null;

  const stages = cycle.milestones.map((milestone) => ({
    stage: milestone.stage,
    status: milestone.status,
  }));
  const stage = activeStage(stages);

  return {
    cycleId: cycle.id,
    cycleNo: cycle.cycleNo,
    progressBps: cycle.progressBps,
    activeStage: stage,
    activeStageLabel: stage === null ? null : MILESTONE_LABELS[stage],
    stages,
  };
}

function composeNarrative(
  project: Project,
  label: string,
  figures: ComposeFigures,
  milestone: MisMilestoneState | null,
): string {
  const progress =
    milestone === null ? 'no cycle open' : `${Math.round(milestone.progressBps / 100)}% complete`;
  const stage = milestone?.activeStageLabel ?? 'no stage in progress';
  const spend = formatInr(figures.totalCostPaise);

  return [
    `${project.name} (${project.code}) — ${label}.`,
    `${figures.updateCount} field updates were posted in the period.`,
    `Cycle spend stands at ${spend} across ${figures.costsByHead.length} cost heads.`,
    `The cycle is ${progress}, with ${stage}.`,
  ].join(' ');
}

function composeOutlook(project: Project): string {
  const cycle = project.currentCycle;
  if (cycle === null) {
    return [
      `No cycle is open at ${project.name}.`,
      "The next cycle's plan follows once land preparation is scheduled.",
    ].join(' ');
  }

  const window =
    cycle.expectedHarvestFrom === null
      ? 'a window still being firmed up'
      : `${cycle.expectedHarvestFrom} to ${cycle.expectedHarvestTo ?? cycle.expectedHarvestFrom}`;

  return `Cycle ${cycle.cycleNo} continues at ${project.name}, with harvest expected in ${window}.`;
}

function toReport(row: repo.MisReportRow, state: ReadState): MisReport {
  return {
    id: row.id,
    projectId: row.projectId,
    month: row.month,
    year: row.year,
    label: misPeriodLabel(row.month, row.year),
    title: row.title,
    narrative: row.narrative,
    outlook: row.outlook,
    source: row.source,
    documentId: row.documentId,
    status: row.status,
    publishedAt: row.publishedAt === null ? null : row.publishedAt.toISOString(),
    isRead: state.isRead,
    isNew: state.isNew,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSummary(row: repo.MisReportRow, state: ReadState): MisSummary {
  return {
    id: row.id,
    month: row.month,
    year: row.year,
    label: misPeriodLabel(row.month, row.year),
    title: row.title,
    status: row.status,
    // On the summary so the archive can label a row without opening the
    // report, which is what records the read receipt.
    source: row.source,
    documentId: row.documentId,
    publishedAt: row.publishedAt === null ? null : row.publishedAt.toISOString(),
    isRead: state.isRead,
    isNew: state.isNew,
  };
}
