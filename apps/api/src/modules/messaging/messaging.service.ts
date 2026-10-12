import type {
  AdminThreadPage,
  AdminThreadSummary,
  ListThreadsQuery,
  Message,
  SendMessageBody,
  Thread,
  ThreadMessagesQuery,
  ThreadReadResult,
  ThreadStatus,
  ThreadSummary,
} from '@cofarm/contracts/messaging';
import type { EntityType } from '@cofarm/contracts/tracking';
import { newId } from '@cofarm/core/id';

import * as cursor from '../../lib/cursor.ts';
import { notFound } from '../../lib/errors.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';
import * as adminUsers from '../admin-users/admin-users.service.ts';
import * as audit from '../audit/audit.service.ts';
import * as documents from '../documents/documents.service.ts';
import * as notifications from '../notifications/notifications.service.ts';

import * as repo from './messaging.repo.ts';

const MESSAGE_ENTITY: EntityType = 'message';

/** The admin team is reached one account at a time; there is no team user id. */
const ADMIN_FANOUT_LIMIT = 100;

type MessagePage = {
  messages: Message[];
  olderCursor: string | null;
};

export async function listMyThreads(scope: ProjectScope, userId: string): Promise<ThreadSummary[]> {
  const rows = await repo.threadsForUser(scope, userId);
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    projectCode: row.projectCode,
    projectName: row.projectName,
    subject: row.subject,
    status: row.status,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    unreadCount: row.unreadCount,
  }));
}

export async function getMyThread(
  scope: ProjectScope,
  userId: string,
  projectId: string,
  query: ThreadMessagesQuery,
): Promise<Thread> {
  const thread = await openThread(scope, projectId, userId);
  return toThread(thread, await messagePage(thread.id, query));
}

export async function sendMyMessage(
  scope: ProjectScope,
  userId: string,
  projectId: string,
  input: SendMessageBody,
): Promise<Message> {
  const thread = await openThread(scope, projectId, userId);
  const created = await appendMessage(thread, userId, input);

  await notifyAdminTeam(thread, created);

  return created;
}

export async function markMyThreadRead(
  scope: ProjectScope,
  userId: string,
  projectId: string,
): Promise<ThreadReadResult> {
  const thread = await repo.findThreadForUser(scope, projectId, userId);
  if (thread === null) throw notFound('Thread');

  const updated = await repo.markAdminMessagesRead(thread.id, userId, new Date());
  return { updated };
}

export async function listThreads(
  scope: ProjectScope,
  query: ListThreadsQuery,
): Promise<AdminThreadPage> {
  const rows = await repo.listAdminThreads(scope, {
    threadId: undefined,
    status: query.status,
    projectId: query.projectId,
    userId: query.userId,
    limit: query.limit + 1,
    cursor: decodeThreadCursor(query.cursor),
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const previews = await repo.latestMessagePerThread(page.map((row) => row.id));

  const last = page.at(-1);
  return {
    items: page.map((row) =>
      toAdminSummary(row, previews.find((preview) => preview.threadId === row.id)?.body ?? null),
    ),
    nextCursor: hasMore && last !== undefined ? encodeThreadCursor(last) : null,
  };
}

export async function getThread(
  scope: ProjectScope,
  threadId: string,
  query: ThreadMessagesQuery,
): Promise<Thread> {
  const thread = await repo.findThreadById(scope, threadId);
  if (thread === null) throw notFound('Thread');

  return toThread(thread, await messagePage(thread.id, query));
}

export async function sendAdminMessage(
  scope: ProjectScope,
  adminUserId: string,
  threadId: string,
  input: SendMessageBody,
): Promise<Message> {
  const thread = await repo.findThreadById(scope, threadId);
  if (thread === null) throw notFound('Thread');

  const created = await appendMessage(thread, adminUserId, input);

  // Answering a partner is reading them: nothing else clears the inbox counter.
  await repo.markPartnerMessagesRead(thread.id, thread.userId, new Date());

  await notifications.notifyUser({
    userId: thread.userId,
    projectId: thread.projectId,
    type: 'message_received',
    title: `New message on ${thread.projectCode}`,
    body: previewOf(created.body),
    entityType: MESSAGE_ENTITY,
    entityId: created.id,
    payload: {
      projectId: thread.projectId,
      threadId: thread.id,
      messageId: created.id,
    },
  });

  return created;
}

export async function setThreadStatus(
  scope: ProjectScope,
  threadId: string,
  status: ThreadStatus,
): Promise<AdminThreadSummary> {
  const before = await repo.findThreadById(scope, threadId);
  if (before === null) throw notFound('Thread');

  const updated = await repo.updateThread(threadId, { status });
  if (updated === null) throw notFound('Thread');

  await audit.record({
    action: status === 'resolved' ? 'thread.resolved' : 'thread.reopened',
    entityTable: 'message_threads',
    entityId: threadId,
    projectId: before.projectId,
    before,
    after: updated,
  });

  const row = await repo.findAdminThread(scope, threadId);
  if (row === null) throw notFound('Thread');

  const [preview] = await repo.latestMessagePerThread([threadId]);
  return toAdminSummary(row, preview?.body ?? null);
}

/**
 * `message_threads_project_user_key` makes the thread a get-or-create: the
 * partner's first visit opens it and every later one lands on the same row.
 */
async function openThread(
  scope: ProjectScope,
  projectId: string,
  userId: string,
): Promise<repo.ThreadContextRow> {
  const existing = await repo.findThreadForUser(scope, projectId, userId);
  if (existing !== null) return existing;

  await repo.insertThread({ id: newId(), projectId, userId });

  const opened = await repo.findThreadForUser(scope, projectId, userId);
  if (opened === null) throw notFound('Project');
  return opened;
}

async function appendMessage(
  thread: repo.ThreadContextRow,
  senderUserId: string,
  input: SendMessageBody,
): Promise<Message> {
  if (input.documentId !== undefined) {
    await documents.assertDocumentInProject(input.documentId, thread.projectId);
  }

  const sentAt = new Date();
  const created = await repo.insertMessage({
    id: newId(),
    projectId: thread.projectId,
    threadId: thread.id,
    senderUserId,
    body: input.body,
    documentId: input.documentId ?? null,
    sentAt,
  });

  await repo.updateThread(thread.id, { lastMessageAt: sentAt });

  await audit.record({
    action: 'message.sent',
    entityTable: 'messages',
    entityId: created.id,
    projectId: thread.projectId,
    after: created,
  });

  const stored = await repo.findMessage(created.id);
  if (stored === null) throw notFound('Message');
  return toMessage(stored);
}

async function notifyAdminTeam(thread: repo.ThreadContextRow, message: Message): Promise<void> {
  const team = await adminUsers.listAdminUsers({ status: 'active', limit: ADMIN_FANOUT_LIMIT });

  await Promise.all(
    team.items.map((admin) =>
      notifications.notifyUser({
        userId: admin.id,
        projectId: thread.projectId,
        type: 'message_received',
        title: `${thread.partnerName} · ${thread.projectCode}`,
        body: previewOf(message.body),
        entityType: MESSAGE_ENTITY,
        entityId: message.id,
        payload: {
          projectId: thread.projectId,
          threadId: thread.id,
          messageId: message.id,
        },
      }),
    ),
  );
}

async function messagePage(threadId: string, query: ThreadMessagesQuery): Promise<MessagePage> {
  const rows = await repo.listMessages(threadId, {
    limit: query.limit + 1,
    cursor: decodeMessageCursor(query.cursor),
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const oldest = page.at(-1);

  return {
    messages: [...page].reverse().map(toMessage),
    olderCursor: hasMore && oldest !== undefined ? encodeMessageCursor(oldest) : null,
  };
}

function toThread(row: repo.ThreadContextRow, page: MessagePage): Thread {
  return {
    id: row.id,
    projectId: row.projectId,
    projectCode: row.projectCode,
    projectName: row.projectName,
    userId: row.userId,
    partnerName: row.partnerName,
    subject: row.subject,
    status: row.status,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    messages: page.messages,
    olderCursor: page.olderCursor,
  };
}

function toAdminSummary(
  row: repo.AdminThreadRow,
  lastMessagePreview: string | null,
): AdminThreadSummary {
  return {
    id: row.id,
    projectId: row.projectId,
    projectCode: row.projectCode,
    projectName: row.projectName,
    userId: row.userId,
    partnerName: row.partnerName,
    subject: row.subject,
    status: row.status,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: lastMessagePreview === null ? null : previewOf(lastMessagePreview),
    unreadFromPartnerCount: row.unreadFromPartnerCount,
  };
}

function toMessage(row: repo.MessageWithSender): Message {
  return {
    id: row.id,
    threadId: row.threadId,
    senderUserId: row.senderUserId,
    senderName: row.senderName,
    senderKind: row.senderKind,
    body: row.body,
    documentId: row.documentId,
    documentName: row.documentName,
    sentAt: row.sentAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  };
}

function encodeThreadCursor(row: repo.AdminThreadRow): string {
  return cursor.encodeCursor(row.lastMessageAt?.toISOString() ?? null, row.id);
}

/** A thread that has never been written to sorts with a null key. */
function decodeThreadCursor(raw: string | undefined): repo.ThreadCursor | undefined {
  const decoded = cursor.decodeCursor(raw);
  if (decoded === undefined) return undefined;
  if (decoded.sortKey === null) return { lastMessageAt: null, id: decoded.id };
  return { lastMessageAt: cursor.cursorTimestamp(decoded.sortKey), id: decoded.id };
}

function encodeMessageCursor(row: repo.MessageWithSender): string {
  return cursor.encodeCursor(row.sentAt.toISOString(), row.id);
}

function decodeMessageCursor(raw: string | undefined): repo.MessageCursor | undefined {
  const decoded = cursor.decodeCursor(raw);
  if (decoded === undefined) return undefined;
  return { sentAt: cursor.cursorTimestamp(decoded.sortKey), id: decoded.id };
}

function previewOf(body: string): string {
  const flat = body.replaceAll(/\s+/gu, ' ').trim();
  return flat.length > 160 ? `${flat.slice(0, 157)}...` : flat;
}
