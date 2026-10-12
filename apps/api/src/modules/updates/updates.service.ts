import { ERROR_CODES } from '@cofarm/contracts/errors';
import type { EntityType } from '@cofarm/contracts/tracking';
import type {
  ActivityEntry,
  CreateActivityBody,
  CreateUpdateBody,
  EditUpdateBody,
  ListActivityQuery,
  ListFeedQuery,
  ListUpdatesQuery,
  ProjectUpdate,
  UpdateFeedItem,
  UpdateSummary,
} from '@cofarm/contracts/updates';
import { newId } from '@cofarm/core/id';

import * as cursor from '../../lib/cursor.ts';
import { badRequest, conflict, notFound } from '../../lib/errors.ts';
import { isFutureInIndia } from '../../lib/india-date.ts';
import { pickDefined } from '../../lib/patch.ts';
import { ADMIN_SCOPE, type ProjectScope } from '../../lib/project-scope.ts';
import * as audit from '../audit/audit.service.ts';
import * as documents from '../documents/documents.service.ts';
import * as notifications from '../notifications/notifications.service.ts';
import * as tracking from '../tracking/tracking.service.ts';

import * as repo from './updates.repo.ts';

const UPDATE_ENTITY: EntityType = 'project_update';

/** A draft is reachable only by an admin holding `update.read`; everyone else
 * sees a published update or a 404. */
export type UpdateViewer = {
  userId: string;
  kind: 'partner' | 'admin';
  scope: ProjectScope;
  canReadDrafts: boolean;
};

export type UpdatePage = {
  items: UpdateSummary[];
  nextCursor: string | null;
};

export type UpdateFeedPage = {
  items: UpdateFeedItem[];
  nextCursor: string | null;
};

export type ActivityPage = {
  items: ActivityEntry[];
  nextCursor: string | null;
};

export async function listUpdates(
  scope: ProjectScope,
  projectId: string,
  query: ListUpdatesQuery,
): Promise<UpdatePage> {
  await assertProject(scope, projectId);

  const rows = await repo.listUpdates(scope, {
    projectId,
    status: query.status,
    publishedOnly: false,
    limit: query.limit + 1,
    cursor: decodeCursor(query.cursor),
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  const items = await Promise.all(
    page.map(async (row) => {
      if (row.status !== 'published') return toSummary(row, null);
      const receipts = await tracking.receiptsFor(scope, {
        projectId,
        entityType: UPDATE_ENTITY,
        entityId: row.id,
      });
      return toSummary(row, receipts);
    }),
  );

  return { items, nextCursor: nextCursorOf(page, hasMore) };
}

export async function listFeed(
  scope: ProjectScope,
  projectId: string,
  query: ListFeedQuery,
): Promise<UpdateFeedPage> {
  await assertProject(scope, projectId);

  const rows = await repo.listUpdates(scope, {
    projectId,
    status: undefined,
    publishedOnly: true,
    limit: query.limit + 1,
    cursor: decodeCursor(query.cursor),
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const photos = await repo.photosForUpdates(page.map((row) => row.id));

  return {
    items: page.map((row) => ({
      id: row.id,
      milestoneTag: row.milestoneTag,
      title: row.title,
      description: row.description,
      activityDate: row.activityDate,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      photoCount: row.photoCount,
      photoDocumentIds: photos
        .filter((photo) => photo.updateId === row.id)
        .map((photo) => photo.documentId),
    })),
    nextCursor: nextCursorOf(page, hasMore),
  };
}

export async function getUpdate(
  viewer: UpdateViewer,
  projectId: string,
  updateId: string,
): Promise<ProjectUpdate> {
  const row = await repo.findUpdate(viewer.scope, projectId, updateId);
  if (row === null) throw notFound('Update');
  if (row.status !== 'published' && !viewer.canReadDrafts) throw notFound('Update');

  const photos = await repo.photosForUpdate(updateId);

  if (viewer.kind === 'partner' && row.status === 'published') {
    await tracking.markRead({
      userId: viewer.userId,
      projectId,
      entityType: UPDATE_ENTITY,
      entityId: row.id,
    });
  }

  return toUpdate(row, photos);
}

export async function createUpdate(
  projectId: string,
  actorUserId: string,
  input: CreateUpdateBody,
): Promise<ProjectUpdate> {
  await assertProject(ADMIN_SCOPE, projectId);
  assertActivityDate(input.activityDate);
  await assertCycle(projectId, input.cycleId);
  await assertPhotos(projectId, input.photoDocumentIds);

  const created = await repo.insertUpdate({
    id: newId(),
    projectId,
    cycleId: input.cycleId ?? null,
    milestoneTag: input.milestoneTag,
    title: input.title,
    description: input.description,
    activityDate: input.activityDate,
    status: input.publish ? 'published' : 'draft',
    notifyPartners: input.notifyPartners,
    publishedAt: input.publish ? new Date() : null,
    createdBy: actorUserId,
  });

  if (input.photoDocumentIds.length > 0) {
    await repo.replacePhotos(created.id, photoRows(projectId, created.id, input.photoDocumentIds));
  }

  await audit.record({
    action: 'update.created',
    entityTable: 'project_updates',
    entityId: created.id,
    projectId,
    after: created,
  });

  if (created.status === 'published') {
    await audit.record({
      action: 'update.published',
      entityTable: 'project_updates',
      entityId: created.id,
      projectId,
      after: created,
    });
    if (created.notifyPartners) await notifyPublished(created);
  }

  return detailOf(projectId, created.id);
}

export async function editUpdate(
  projectId: string,
  updateId: string,
  input: EditUpdateBody,
): Promise<ProjectUpdate> {
  const before = await repo.findUpdate(ADMIN_SCOPE, projectId, updateId);
  if (before === null) throw notFound('Update');

  if (input.activityDate !== undefined) assertActivityDate(input.activityDate);
  await assertCycle(projectId, input.cycleId);
  if (input.photoDocumentIds !== undefined) {
    await assertPhotos(projectId, input.photoDocumentIds);
  }

  const updated = await repo.patchUpdate(
    updateId,
    pickDefined({
      milestoneTag: input.milestoneTag,
      title: input.title,
      description: input.description,
      activityDate: input.activityDate,
      cycleId: input.cycleId,
      notifyPartners: input.notifyPartners,
    }),
  );
  if (updated === null) throw notFound('Update');

  if (input.photoDocumentIds !== undefined) {
    const kept = new Set(input.photoDocumentIds);
    const existing = await repo.photosForUpdate(updateId);
    await repo.replacePhotos(updateId, photoRows(projectId, updateId, input.photoDocumentIds));

    // A photo taken off an update has nowhere else to live.
    await documents.discardMany(
      existing.map((photo) => photo.documentId).filter((id) => !kept.has(id)),
    );
  }

  await audit.record({
    action: 'update.edited',
    entityTable: 'project_updates',
    entityId: updateId,
    projectId,
    before,
    after: updated,
  });

  return detailOf(projectId, updateId);
}

export async function publishUpdate(projectId: string, updateId: string): Promise<ProjectUpdate> {
  const before = await repo.findUpdate(ADMIN_SCOPE, projectId, updateId);
  if (before === null) throw notFound('Update');
  if (before.status === 'published') {
    throw conflict(ERROR_CODES.alreadyPublished, 'This update has already been published');
  }

  const updated = await repo.patchUpdate(updateId, {
    status: 'published',
    publishedAt: new Date(),
  });
  if (updated === null) throw notFound('Update');

  await audit.record({
    action: 'update.published',
    entityTable: 'project_updates',
    entityId: updateId,
    projectId,
    before,
    after: updated,
  });

  if (updated.notifyPartners) await notifyPublished(updated);

  return detailOf(projectId, updateId);
}

/** Pulls a published update back to a draft, hiding it from partners again. */
export async function unpublishUpdate(projectId: string, updateId: string): Promise<ProjectUpdate> {
  const before = await repo.findUpdate(ADMIN_SCOPE, projectId, updateId);
  if (before === null) throw notFound('Update');
  if (before.status !== 'published') {
    throw conflict(ERROR_CODES.notPublished, 'This update is not published');
  }

  const draft = await repo.patchUpdate(updateId, { status: 'draft', publishedAt: null });
  if (draft === null) throw notFound('Update');

  await tracking.clearReceipts({ projectId, entityType: UPDATE_ENTITY, entityId: updateId });
  await notifications.discardForEntity({ entityType: UPDATE_ENTITY, entityId: updateId });

  await audit.record({
    action: 'update.unpublished',
    entityTable: 'project_updates',
    entityId: updateId,
    projectId,
    before,
    after: draft,
  });

  return detailOf(projectId, updateId);
}

export async function deleteUpdate(projectId: string, updateId: string): Promise<void> {
  const before = await repo.findUpdate(ADMIN_SCOPE, projectId, updateId);
  if (before === null) throw notFound('Update');

  const photos = await repo.photosForUpdate(updateId);
  const removed = await repo.deleteUpdate(updateId);
  if (!removed) throw notFound('Update');

  await documents.discardMany(photos.map((photo) => photo.documentId));
  await tracking.clearReceipts({ projectId, entityType: UPDATE_ENTITY, entityId: updateId });
  await notifications.discardForEntity({ entityType: UPDATE_ENTITY, entityId: updateId });

  await audit.record({
    action: 'update.deleted',
    entityTable: 'project_updates',
    entityId: updateId,
    projectId,
    before,
  });
}

export async function createActivity(
  projectId: string,
  actorUserId: string,
  input: CreateActivityBody,
): Promise<ActivityEntry> {
  await assertProject(ADMIN_SCOPE, projectId);
  assertActivityDate(input.activityDate);
  await assertCycle(projectId, input.cycleId);

  const created = await repo.insertActivity({
    id: newId(),
    projectId,
    cycleId: input.cycleId ?? null,
    title: input.title,
    detail: input.detail ?? null,
    activityDate: input.activityDate,
    createdBy: actorUserId,
  });

  await audit.record({
    action: 'activity.created',
    entityTable: 'activity_log_entries',
    entityId: created.id,
    projectId,
    after: created,
  });

  return toActivity(created);
}

export async function listActivity(
  scope: ProjectScope,
  projectId: string,
  query: ListActivityQuery,
): Promise<ActivityPage> {
  await assertProject(scope, projectId);

  const rows = await repo.listActivity(scope, {
    projectId,
    limit: query.limit + 1,
    cursor: decodeCursor(query.cursor),
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  return { items: page.map(toActivity), nextCursor: nextCursorOf(page, hasMore) };
}

async function assertProject(scope: ProjectScope, projectId: string): Promise<void> {
  const project = await repo.findProjectHeader(scope, projectId);
  if (project === null) throw notFound('Project');
}

async function assertCycle(projectId: string, cycleId: string | undefined): Promise<void> {
  if (cycleId === undefined) return;
  const belongs = await repo.cycleIsInProject(cycleId, projectId);
  if (!belongs) throw notFound('Cycle');
}

async function assertPhotos(projectId: string, documentIds: readonly string[]): Promise<void> {
  const unique = new Set(documentIds);
  if (unique.size !== documentIds.length) {
    throw badRequest('A photo may be attached to an update only once');
  }
  await Promise.all(
    [...unique].map((documentId) => documents.assertDocumentInProject(documentId, projectId)),
  );
}

function photoRows(
  projectId: string,
  updateId: string,
  documentIds: readonly string[],
): repo.PhotoInsert[] {
  return documentIds.map((documentId, index) => ({
    id: newId(),
    projectId,
    updateId,
    documentId,
    sortOrder: index,
  }));
}

async function notifyPublished(row: repo.UpdateRow): Promise<void> {
  await notifications.notifyProjectPartners({
    projectId: row.projectId,
    type: 'update_published',
    title: row.title,
    body: previewOf(row.description),
    entityType: UPDATE_ENTITY,
    entityId: row.id,
    payload: {
      projectId: row.projectId,
      updateId: row.id,
      activityDate: row.activityDate,
    },
  });
}

async function detailOf(projectId: string, updateId: string): Promise<ProjectUpdate> {
  const row = await repo.findUpdate(ADMIN_SCOPE, projectId, updateId);
  if (row === null) throw notFound('Update');
  return toUpdate(row, await repo.photosForUpdate(updateId));
}

function toUpdate(row: repo.UpdateWithPhotoCount, photos: repo.PhotoRow[]): ProjectUpdate {
  return {
    id: row.id,
    projectId: row.projectId,
    cycleId: row.cycleId,
    milestoneTag: row.milestoneTag,
    title: row.title,
    description: row.description,
    activityDate: row.activityDate,
    status: row.status,
    notifyPartners: row.notifyPartners,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    photoCount: row.photoCount,
    photos: photos.map((photo) => ({
      id: photo.id,
      documentId: photo.documentId,
      caption: photo.caption,
      sortOrder: photo.sortOrder,
    })),
    createdAt: row.createdAt.toISOString(),
  };
}

function toSummary(
  row: repo.UpdateWithPhotoCount,
  receipts: { readCount: number; totalCount: number } | null,
): UpdateSummary {
  return {
    id: row.id,
    cycleId: row.cycleId,
    milestoneTag: row.milestoneTag,
    title: row.title,
    activityDate: row.activityDate,
    status: row.status,
    notifyPartners: row.notifyPartners,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    photoCount: row.photoCount,
    seenByCount: receipts?.readCount ?? null,
    recipientCount: receipts?.totalCount ?? null,
  };
}

function toActivity(row: repo.ActivityRow): ActivityEntry {
  return {
    id: row.id,
    projectId: row.projectId,
    cycleId: row.cycleId,
    title: row.title,
    detail: row.detail,
    activityDate: row.activityDate,
    createdAt: row.createdAt.toISOString(),
  };
}

function nextCursorOf(
  page: readonly { activityDate: string; id: string }[],
  hasMore: boolean,
): string | null {
  if (!hasMore) return null;
  const last = page.at(-1);
  return last === undefined ? null : `${last.activityDate}|${last.id}`;
}

function decodeCursor(raw: string | undefined): repo.FeedCursor | undefined {
  const decoded = cursor.decodeCursor(raw);
  if (decoded === undefined) return undefined;
  return { activityDate: cursor.cursorDate(decoded.sortKey), id: decoded.id };
}

/** Backfilled history is normal, so only a future date is rejected. */
function assertActivityDate(activityDate: string): void {
  if (isFutureInIndia(activityDate)) {
    throw badRequest('An activity date cannot be in the future');
  }
}

function previewOf(description: string): string {
  const flat = description.replaceAll(/\s+/gu, ' ').trim();
  return flat.length > 160 ? `${flat.slice(0, 157)}...` : flat;
}

/** Published updates whose activity date falls in a calendar month. */
export async function countInPeriod(input: {
  projectId: string;
  year: number;
  month: number;
}): Promise<number> {
  const period = monthBounds(input.year, input.month);
  return repo.countPublishedInPeriod(input.projectId, period.from, period.to);
}

export type PeriodPhoto = {
  documentId: string;
  caption: string | null;
};

/** Photographs from the month's published updates, oldest activity first. */
export async function photosInPeriod(input: {
  projectId: string;
  year: number;
  month: number;
  limit: number;
}): Promise<PeriodPhoto[]> {
  const period = monthBounds(input.year, input.month);
  const rows = await repo.photosInPeriod({
    projectId: input.projectId,
    fromDate: period.from,
    toDate: period.to,
    limit: input.limit,
  });
  return rows.map((row) => ({ documentId: row.documentId, caption: row.caption }));
}

function monthBounds(year: number, month: number): { from: string; to: string } {
  const prefix = `${year.toString()}-${month.toString().padStart(2, '0')}`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${prefix}-01`, to: `${prefix}-${lastDay.toString()}` };
}
