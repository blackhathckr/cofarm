import type {
  AdminThreadPage,
  AdminThreadSummary,
  ListThreadsQuery,
  Message,
  SendMessageBody,
  Thread,
  ThreadMessagesQuery,
  ThreadReadResult,
  ThreadSummary,
} from '@cofarm/contracts/messaging';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { assertActor } from '../../lib/actor.ts';
import { assertScope } from '../../lib/project-scope.ts';

import * as service from './messaging.service.ts';

type ProjectParams = { projectId: string };
type ThreadParams = { threadId: string };

export async function myThreads(request: FastifyRequest): Promise<ThreadSummary[]> {
  const actor = assertActor(request.actor);
  return service.listMyThreads(assertScope(request.scope), actor.userId);
}

export async function myThread(
  request: FastifyRequest<{ Params: ProjectParams; Querystring: ThreadMessagesQuery }>,
): Promise<Thread> {
  const actor = assertActor(request.actor);
  return service.getMyThread(
    assertScope(request.scope),
    actor.userId,
    request.params.projectId,
    request.query,
  );
}

export async function sendMyMessage(
  request: FastifyRequest<{ Params: ProjectParams; Body: SendMessageBody }>,
  reply: FastifyReply,
): Promise<Message> {
  const actor = assertActor(request.actor);
  const message = await service.sendMyMessage(
    assertScope(request.scope),
    actor.userId,
    request.params.projectId,
    request.body,
  );
  void reply.status(201);
  return message;
}

export async function readMyThread(
  request: FastifyRequest<{ Params: ProjectParams }>,
): Promise<ThreadReadResult> {
  const actor = assertActor(request.actor);
  return service.markMyThreadRead(
    assertScope(request.scope),
    actor.userId,
    request.params.projectId,
  );
}

export async function list(
  request: FastifyRequest<{ Querystring: ListThreadsQuery }>,
): Promise<AdminThreadPage> {
  return service.listThreads(assertScope(request.scope), request.query);
}

export async function get(
  request: FastifyRequest<{ Params: ThreadParams; Querystring: ThreadMessagesQuery }>,
): Promise<Thread> {
  return service.getThread(assertScope(request.scope), request.params.threadId, request.query);
}

export async function reply(
  request: FastifyRequest<{ Params: ThreadParams; Body: SendMessageBody }>,
  response: FastifyReply,
): Promise<Message> {
  const actor = assertActor(request.actor);
  const message = await service.sendAdminMessage(
    assertScope(request.scope),
    actor.userId,
    request.params.threadId,
    request.body,
  );
  void response.status(201);
  return message;
}

export async function resolve(
  request: FastifyRequest<{ Params: ThreadParams }>,
): Promise<AdminThreadSummary> {
  return service.setThreadStatus(assertScope(request.scope), request.params.threadId, 'resolved');
}

export async function reopen(
  request: FastifyRequest<{ Params: ThreadParams }>,
): Promise<AdminThreadSummary> {
  return service.setThreadStatus(assertScope(request.scope), request.params.threadId, 'open');
}
