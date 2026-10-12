import { and, count, desc, eq, inArray, isNull, lt, ne, or, sql, type SQL } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { withinScope } from '../../db/scoped.ts';
import { documents, messageThreads, messages, projects, users } from '../../db/schema.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';

export type ThreadRow = typeof messageThreads.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type UserKind = (typeof users.$inferSelect)['kind'];

export type ThreadContextRow = ThreadRow & {
  projectCode: string;
  projectName: string;
  partnerName: string;
};

export type InboxThreadRow = ThreadRow & {
  projectCode: string;
  projectName: string;
  unreadCount: number;
};

export type AdminThreadRow = ThreadContextRow & { unreadFromPartnerCount: number };

export type MessageWithSender = MessageRow & {
  senderName: string;
  senderKind: UserKind;
  documentName: string | null;
};

/** Keyset position: `last_message_at` is nullable and not unique, so the id breaks ties. */
export type ThreadCursor = {
  lastMessageAt: Date | null;
  id: string;
};

export type MessageCursor = {
  sentAt: Date;
  id: string;
};

export type AdminThreadFilters = {
  threadId: string | undefined;
  status: ThreadRow['status'] | undefined;
  projectId: string | undefined;
  userId: string | undefined;
  limit: number;
  cursor: ThreadCursor | undefined;
};

export type MessagePageFilters = {
  limit: number;
  cursor: MessageCursor | undefined;
};

const threadColumns = {
  id: messageThreads.id,
  projectId: messageThreads.projectId,
  userId: messageThreads.userId,
  subject: messageThreads.subject,
  status: messageThreads.status,
  lastMessageAt: messageThreads.lastMessageAt,
  createdAt: messageThreads.createdAt,
};

/**
 * A thread has exactly two parties, so anything not sent by the thread's own
 * partner came from the admin team — no join to `users` is needed to tell them
 * apart.
 */
const unreadFromAdmin = and(
  eq(messages.threadId, messageThreads.id),
  isNull(messages.readAt),
  ne(messages.senderUserId, messageThreads.userId),
);

const unreadFromPartner = and(
  eq(messages.threadId, messageThreads.id),
  isNull(messages.readAt),
  eq(messages.senderUserId, messageThreads.userId),
);

const newestActivityFirst = sql`${messageThreads.lastMessageAt} desc nulls last`;

export async function threadsForUser(
  scope: ProjectScope,
  userId: string,
): Promise<InboxThreadRow[]> {
  return db
    .select({
      ...threadColumns,
      projectCode: projects.code,
      projectName: projects.name,
      unreadCount: count(messages.id),
    })
    .from(messageThreads)
    .innerJoin(projects, eq(projects.id, messageThreads.projectId))
    .leftJoin(messages, unreadFromAdmin)
    .where(and(eq(messageThreads.userId, userId), withinScope(scope, messageThreads.projectId)))
    .groupBy(messageThreads.id, projects.id)
    .orderBy(newestActivityFirst, desc(messageThreads.id));
}

export async function listAdminThreads(
  scope: ProjectScope,
  filters: AdminThreadFilters,
): Promise<AdminThreadRow[]> {
  const conditions: SQL[] = [withinScope(scope, messageThreads.projectId)];

  if (filters.threadId !== undefined) {
    conditions.push(eq(messageThreads.id, filters.threadId));
  }
  if (filters.status !== undefined) {
    conditions.push(eq(messageThreads.status, filters.status));
  }
  if (filters.projectId !== undefined) {
    conditions.push(eq(messageThreads.projectId, filters.projectId));
  }
  if (filters.userId !== undefined) {
    conditions.push(eq(messageThreads.userId, filters.userId));
  }
  if (filters.cursor !== undefined) {
    conditions.push(threadPageCondition(filters.cursor));
  }

  return db
    .select({
      ...threadColumns,
      projectCode: projects.code,
      projectName: projects.name,
      partnerName: users.name,
      unreadFromPartnerCount: count(messages.id),
    })
    .from(messageThreads)
    .innerJoin(projects, eq(projects.id, messageThreads.projectId))
    .innerJoin(users, eq(users.id, messageThreads.userId))
    .leftJoin(messages, unreadFromPartner)
    .where(and(...conditions))
    .groupBy(messageThreads.id, projects.id, users.id)
    .orderBy(newestActivityFirst, desc(messageThreads.id))
    .limit(filters.limit);
}

export async function findAdminThread(
  scope: ProjectScope,
  threadId: string,
): Promise<AdminThreadRow | null> {
  const [row] = await listAdminThreads(scope, {
    threadId,
    status: undefined,
    projectId: undefined,
    userId: undefined,
    limit: 1,
    cursor: undefined,
  });
  return row ?? null;
}

export async function findThreadById(
  scope: ProjectScope,
  threadId: string,
): Promise<ThreadContextRow | null> {
  const [row] = await db
    .select({
      ...threadColumns,
      projectCode: projects.code,
      projectName: projects.name,
      partnerName: users.name,
    })
    .from(messageThreads)
    .innerJoin(projects, eq(projects.id, messageThreads.projectId))
    .innerJoin(users, eq(users.id, messageThreads.userId))
    .where(and(eq(messageThreads.id, threadId), withinScope(scope, messageThreads.projectId)))
    .limit(1);
  return row ?? null;
}

export async function findThreadForUser(
  scope: ProjectScope,
  projectId: string,
  userId: string,
): Promise<ThreadContextRow | null> {
  const [row] = await db
    .select({
      ...threadColumns,
      projectCode: projects.code,
      projectName: projects.name,
      partnerName: users.name,
    })
    .from(messageThreads)
    .innerJoin(projects, eq(projects.id, messageThreads.projectId))
    .innerJoin(users, eq(users.id, messageThreads.userId))
    .where(
      and(
        eq(messageThreads.projectId, projectId),
        eq(messageThreads.userId, userId),
        withinScope(scope, messageThreads.projectId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Ignoring the conflict keeps `message_threads_project_user_key` as the single
 * source of the one-thread-per-partner rule even under a concurrent first open. */
export async function insertThread(row: typeof messageThreads.$inferInsert): Promise<void> {
  await db
    .insert(messageThreads)
    .values(row)
    .onConflictDoNothing({ target: [messageThreads.projectId, messageThreads.userId] });
}

export async function updateThread(
  threadId: string,
  patch: Partial<typeof messageThreads.$inferInsert>,
): Promise<ThreadRow | null> {
  const [updated] = await db
    .update(messageThreads)
    .set(patch)
    .where(eq(messageThreads.id, threadId))
    .returning();
  return updated ?? null;
}

export async function listMessages(
  threadId: string,
  filters: MessagePageFilters,
): Promise<MessageWithSender[]> {
  const conditions: SQL[] = [eq(messages.threadId, threadId)];

  if (filters.cursor !== undefined) {
    const page = or(
      lt(messages.sentAt, filters.cursor.sentAt),
      and(eq(messages.sentAt, filters.cursor.sentAt), lt(messages.id, filters.cursor.id)),
    );
    if (page === undefined) throw new Error('Cursor produced no condition');
    conditions.push(page);
  }

  return db
    .select({
      id: messages.id,
      projectId: messages.projectId,
      threadId: messages.threadId,
      senderUserId: messages.senderUserId,
      body: messages.body,
      documentId: messages.documentId,
      sentAt: messages.sentAt,
      readAt: messages.readAt,
      senderName: users.name,
      senderKind: users.kind,
      documentName: documents.originalName,
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.senderUserId))
    .leftJoin(documents, eq(documents.id, messages.documentId))
    .where(and(...conditions))
    .orderBy(desc(messages.sentAt), desc(messages.id))
    .limit(filters.limit);
}

export async function findMessage(messageId: string): Promise<MessageWithSender | null> {
  const [row] = await db
    .select({
      id: messages.id,
      projectId: messages.projectId,
      threadId: messages.threadId,
      senderUserId: messages.senderUserId,
      body: messages.body,
      documentId: messages.documentId,
      sentAt: messages.sentAt,
      readAt: messages.readAt,
      senderName: users.name,
      senderKind: users.kind,
      documentName: documents.originalName,
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.senderUserId))
    .leftJoin(documents, eq(documents.id, messages.documentId))
    .where(eq(messages.id, messageId))
    .limit(1);
  return row ?? null;
}

export async function insertMessage(row: typeof messages.$inferInsert): Promise<MessageRow> {
  const [created] = await db.insert(messages).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no message row');
  return created;
}

export async function markAdminMessagesRead(
  threadId: string,
  partnerUserId: string,
  readAt: Date,
): Promise<number> {
  const updated = await db
    .update(messages)
    .set({ readAt })
    .where(
      and(
        eq(messages.threadId, threadId),
        isNull(messages.readAt),
        ne(messages.senderUserId, partnerUserId),
      ),
    )
    .returning({ id: messages.id });
  return updated.length;
}

export async function markPartnerMessagesRead(
  threadId: string,
  partnerUserId: string,
  readAt: Date,
): Promise<number> {
  const updated = await db
    .update(messages)
    .set({ readAt })
    .where(
      and(
        eq(messages.threadId, threadId),
        isNull(messages.readAt),
        eq(messages.senderUserId, partnerUserId),
      ),
    )
    .returning({ id: messages.id });
  return updated.length;
}

/** One row per thread, newest message first: a per-thread maximum written as a
 * correlated subquery would not table-qualify its columns. */
export async function latestMessagePerThread(
  threadIds: readonly string[],
): Promise<{ threadId: string; body: string }[]> {
  if (threadIds.length === 0) return [];
  return db
    .selectDistinctOn([messages.threadId], { threadId: messages.threadId, body: messages.body })
    .from(messages)
    .where(inArray(messages.threadId, [...threadIds]))
    .orderBy(messages.threadId, desc(messages.sentAt), desc(messages.id));
}

function threadPageCondition(cursor: ThreadCursor): SQL {
  if (cursor.lastMessageAt === null) {
    const tail = and(isNull(messageThreads.lastMessageAt), lt(messageThreads.id, cursor.id));
    if (tail === undefined) throw new Error('Cursor produced no condition');
    return tail;
  }

  const page = or(
    lt(messageThreads.lastMessageAt, cursor.lastMessageAt),
    and(eq(messageThreads.lastMessageAt, cursor.lastMessageAt), lt(messageThreads.id, cursor.id)),
    isNull(messageThreads.lastMessageAt),
  );
  if (page === undefined) throw new Error('Cursor produced no condition');
  return page;
}
