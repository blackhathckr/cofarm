import { newId } from '@cofarm/core/id';
import { eq } from 'drizzle-orm';

import { db } from '../client.ts';
import { memberships, messageThreads, messages, signatureRequests } from '../schema.ts';
import { createDocument } from './assets.ts';
import { memberOf, type DemoContext, type DemoProject } from './context.ts';
import type { ProjectPlan, ThreadPlan } from './plan.ts';

const DAY_MS = 86_400_000;

export type MessagingResult = { threads: number; messages: number; signatures: number };

export async function seedMessaging(
  context: DemoContext,
  project: DemoProject,
  plan: ProjectPlan,
): Promise<MessagingResult> {
  let sentCount = 0;
  for (const thread of plan.threads) {
    sentCount += await seedThread(context, project, thread);
  }

  let signatures = 0;
  for (const name of plan.signedBy) {
    await seedAgreement(context, project, name, true);
    signatures += 1;
  }
  for (const name of plan.awaitingSignatureFrom) {
    await seedAgreement(context, project, name, false);
    signatures += 1;
  }

  return { threads: plan.threads.length, messages: sentCount, signatures };
}

async function seedThread(
  context: DemoContext,
  project: DemoProject,
  thread: ThreadPlan,
): Promise<number> {
  const member = memberOf(project, thread.partner);
  const threadId = newId();
  const sentTimes = thread.messages.map((message) => daysAgo(message.daysAgo));
  const lastMessageAt = sentTimes.at(-1) ?? null;

  await db.insert(messageThreads).values({
    id: threadId,
    projectId: project.projectId,
    userId: member.userId,
    subject: thread.subject,
    status: 'open',
    lastMessageAt,
  });

  for (const [index, message] of thread.messages.entries()) {
    const sentAt = sentTimes[index] ?? new Date();
    await db.insert(messages).values({
      id: newId(),
      projectId: project.projectId,
      threadId,
      senderUserId: message.fromPartner ? member.userId : context.adminUserId,
      body: message.body,
      sentAt,
      // The last partner message is left unread so the console shows a badge.
      readAt: message.fromPartner && index === thread.messages.length - 1 ? null : sentAt,
    });
  }

  return thread.messages.length;
}

async function seedAgreement(
  context: DemoContext,
  project: DemoProject,
  name: string,
  signed: boolean,
): Promise<void> {
  const member = memberOf(project, name);
  const documentId = await createDocument({
    projectId: project.projectId,
    type: 'agreement',
    kind: 'agreement',
    originalName: `agreement-${project.code}-${member.userId.slice(0, 8)}.pdf`,
    title: `${project.code} partnership agreement, ${member.name}`,
    uploadedBy: context.adminUserId,
    ownerUserId: member.userId,
  });

  const sentAt = daysAgo(signed ? 200 : 20);
  await db.insert(signatureRequests).values({
    id: newId(),
    projectId: project.projectId,
    documentId,
    userId: member.userId,
    status: signed ? 'signed' : 'pending',
    provider: 'manual',
    signedName: signed ? member.name : null,
    signedIp: signed ? '203.0.113.7' : null,
    sentAt,
    signedAt: signed ? daysAgo(198) : null,
  });

  await db
    .update(memberships)
    .set({ agreementStatus: signed ? 'signed' : 'sent' })
    .where(eq(memberships.id, member.membershipId));
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}
