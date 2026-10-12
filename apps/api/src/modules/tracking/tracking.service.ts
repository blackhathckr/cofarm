import type {
  EntityReceipts,
  EntityType,
  ReceiptsQuery,
  RemindableEntityType,
  RemindUnreadBody,
  RemindUnreadResult,
} from '@cofarm/contracts/tracking';
import { newId } from '@cofarm/core/id';

import { notFound } from '../../lib/errors.ts';
import { assertInScope, type ProjectScope } from '../../lib/project-scope.ts';
import * as audit from '../audit/audit.service.ts';
import * as notifications from '../notifications/notifications.service.ts';

import * as repo from './tracking.repo.ts';

/**
 * A partner is reminded about one artefact at most once a day. The reminder
 * notification itself is the record of it, so an impatient second click reaches
 * nobody twice.
 */
const REMIND_INTERVAL_HOURS = 24;

const REMINDER_SUBJECTS: Readonly<Record<RemindableEntityType, string>> = {
  mis_report: 'monthly report',
  project_update: 'field update',
};

export type MarkReadInput = {
  userId: string;
  projectId: string;
  entityType: EntityType;
  entityId: string;
};

/**
 * A receipt is only meaningful for someone the artefact was addressed to, so a
 * caller with no active membership records nothing and raises nothing.
 */
export async function markRead(input: MarkReadInput): Promise<void> {
  const isMember = await repo.hasActiveMembership(input.userId, input.projectId);
  if (!isMember) return;

  await repo.upsertReceipt({
    id: newId(),
    userId: input.userId,
    projectId: input.projectId,
    entityType: input.entityType,
    entityId: input.entityId,
    readAt: new Date(),
  });
}

export async function receiptsFor(
  scope: ProjectScope,
  query: ReceiptsQuery,
): Promise<EntityReceipts> {
  assertInScope(scope, query.projectId);

  const rows = await repo.recipientsFor(scope, {
    projectId: query.projectId,
    entityType: query.entityType,
    entityId: query.entityId,
  });

  const recipients = rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    isRead: row.readAt !== null,
    readAt: row.readAt === null ? null : row.readAt.toISOString(),
  }));

  return {
    projectId: query.projectId,
    entityType: query.entityType,
    entityId: query.entityId,
    totalCount: recipients.length,
    readCount: recipients.filter((recipient) => recipient.isRead).length,
    recipients,
  };
}

/** Reminds only the partners who have not opened it, the way the signature
 * reminder chases only the requests still pending. */
export async function remindUnread(
  scope: ProjectScope,
  input: RemindUnreadBody,
): Promise<RemindUnreadResult> {
  assertInScope(scope, input.projectId);

  const project = await repo.findProjectHeader(scope, input.projectId);
  if (project === null) throw notFound('Project');

  const recipients = await repo.recipientsFor(scope, {
    projectId: input.projectId,
    entityType: input.entityType,
    entityId: input.entityId,
  });
  const unread = recipients.filter((recipient) => recipient.readAt === null);

  const remindedRecently = await notifications.usersNotifiedSince({
    userIds: unread.map((recipient) => recipient.userId),
    type: 'reminder',
    entityType: input.entityType,
    entityId: input.entityId,
    since: new Date(Date.now() - REMIND_INTERVAL_HOURS * 3_600_000),
  });
  const targets = unread.filter((recipient) => !remindedRecently.has(recipient.userId));

  const subject = REMINDER_SUBJECTS[input.entityType];
  for (const target of targets) {
    await notifications.notifyUser({
      userId: target.userId,
      projectId: input.projectId,
      type: 'reminder',
      title: `Reminder: ${project.code} ${subject}`,
      body: `The latest ${subject} for ${project.name} is still unopened.`,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: {
        projectId: input.projectId,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    });
  }

  const outcome: RemindUnreadResult = {
    projectId: input.projectId,
    entityType: input.entityType,
    entityId: input.entityId,
    reminded: targets.length,
    alreadyRead: recipients.length - unread.length,
    recentlyReminded: unread.length - targets.length,
  };

  await audit.record({
    action: 'tracking.reminded',
    entityTable: 'read_receipts',
    entityId: input.entityId,
    projectId: input.projectId,
    after: outcome,
  });

  return outcome;
}

export type ReadEntityIdsInput = {
  userId: string;
  projectId: string;
  entityType: MarkReadInput['entityType'];
  entityIds: readonly string[];
};

/**
 * Which of these entities the user has already opened. One query for a whole
 * page, so a list does not ask per row.
 */
/**
 * A corrected artefact has not been read by anyone yet, so its receipts go
 * with the correction. Leaving them would report a partner as having read
 * figures that have since changed.
 */
export async function clearReceipts(input: repo.EntityKey): Promise<number> {
  return repo.deleteReceiptsFor(input);
}

export async function readEntityIds(input: ReadEntityIdsInput): Promise<Set<string>> {
  const ids = await repo.readEntityIdsFor(
    input.userId,
    input.projectId,
    input.entityType,
    input.entityIds,
  );
  return new Set(ids);
}
