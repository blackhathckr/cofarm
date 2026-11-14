import { XLSX_MIME } from '@cofarm/contracts/documents';
import { ERROR_CODES } from '@cofarm/contracts/errors';
import {
  misCursor,
  misPeriodLabel,
  type CreateMisBody,
  type ListMisQuery,
  type MisLatest,
  type MisPage,
  type MisReport,
  type MisSummary,
  type UpdateMisBody,
} from '@cofarm/contracts/mis';
import type { EntityReceipts, EntityType } from '@cofarm/contracts/tracking';
import { newId } from '@cofarm/core/id';

import { badRequest, conflict, notFound, type AppError } from '../../lib/errors.ts';
import { pickDefined } from '../../lib/patch.ts';
import { ADMIN_SCOPE, assertInScope, type ProjectScope } from '../../lib/project-scope.ts';
import * as audit from '../audit/audit.service.ts';
import * as documents from '../documents/documents.service.ts';
import * as notifications from '../notifications/notifications.service.ts';
import * as projects from '../projects/projects.service.ts';
import * as tracking from '../tracking/tracking.service.ts';

import * as repo from './mis.repo.ts';

const MIS_ENTITY: EntityType = 'mis_report';
const ENTITY_TABLE = 'mis_reports';

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
    nextCursor: hasMore && last !== undefined ? misCursor(last.year, last.quarter) : null,
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
  await assertWorkbook(input.documentId, projectId);

  const existing = await repo.findByPeriod(ADMIN_SCOPE, projectId, input.year, input.quarter);
  if (existing !== null) throw periodConflict(input.quarter, input.year);

  const created = await repo.insertReport({
    id: newId(),
    projectId,
    quarter: input.quarter,
    year: input.year,
    title: input.title,
    documentId: input.documentId,
    status: 'draft',
    createdBy: actorUserId,
  });
  if (created === null) throw periodConflict(input.quarter, input.year);

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
      'Unpublish it first, then correct it.',
    );
  }

  if (input.documentId !== undefined) await assertWorkbook(input.documentId, projectId);

  const updated = await repo.updateReport(
    reportId,
    pickDefined({ title: input.title, documentId: input.documentId }),
  );
  if (updated === null) throw notFound('MIS report');

  if (input.documentId !== undefined && input.documentId !== before.documentId) {
    await documents.discardMany([before.documentId]);
  }

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

  const published = await repo.updateReport(reportId, {
    status: 'published',
    publishedAt: new Date(),
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

  const label = misPeriodLabel(published.quarter, published.year);
  await notifications.notifyProjectPartners({
    projectId,
    type: 'mis_published',
    title: `MIS report: ${label}`,
    body: published.title,
    entityType: MIS_ENTITY,
    entityId: published.id,
    payload: {
      reportId: published.id,
      quarter: published.quarter.toString(),
      year: published.year.toString(),
    },
  });

  return toReport(published, { isRead: false, isNew: false });
}

/**
 * Pulls a published report back to a draft so a wrong figure can be corrected.
 * The period is unique per project, so without this a published mistake could
 * never be fixed: it cannot be edited, deleted, or superseded by a second
 * report for the same quarter.
 */
export async function unpublishReport(projectId: string, reportId: string): Promise<MisReport> {
  const before = await repo.findReport(ADMIN_SCOPE, projectId, reportId);
  if (before === null) throw notFound('MIS report');
  if (before.status !== 'published') {
    throw conflict(ERROR_CODES.notPublished, 'This report is not published');
  }

  const draft = await repo.updateReport(reportId, { status: 'draft', publishedAt: null });
  if (draft === null) throw notFound('MIS report');

  await tracking.clearReceipts({
    projectId,
    entityType: MIS_ENTITY,
    entityId: reportId,
  });

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
  await documents.discardMany([row.documentId]);

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

async function assertWorkbook(documentId: string, projectId: string): Promise<void> {
  const document = await documents.assertDocumentInProject(documentId, projectId);
  if (document.mime !== XLSX_MIME) {
    throw badRequest('An MIS report is uploaded as an Excel workbook (.xlsx)');
  }
}

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

  const [year, quarter] = cursor.split('-');
  if (year === undefined || quarter === undefined) return undefined;

  const parsed = { year: Number(year), quarter: Number(quarter) };
  if (!Number.isInteger(parsed.year) || !Number.isInteger(parsed.quarter)) return undefined;
  return parsed;
}

function periodConflict(quarter: number, year: number): AppError {
  return conflict(
    ERROR_CODES.misPeriodExists,
    `${misPeriodLabel(quarter, year)} already has a report for this project`,
  );
}

function toReport(row: repo.MisReportRow, state: ReadState): MisReport {
  return {
    id: row.id,
    projectId: row.projectId,
    quarter: row.quarter,
    year: row.year,
    label: misPeriodLabel(row.quarter, row.year),
    title: row.title,
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
    quarter: row.quarter,
    year: row.year,
    label: misPeriodLabel(row.quarter, row.year),
    title: row.title,
    status: row.status,
    documentId: row.documentId,
    publishedAt: row.publishedAt === null ? null : row.publishedAt.toISOString(),
    isRead: state.isRead,
    isNew: state.isNew,
  };
}
