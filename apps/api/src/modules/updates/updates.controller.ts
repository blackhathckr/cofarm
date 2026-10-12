import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type {
  ActivityEntry,
  CreateActivityBody,
  CreateUpdateBody,
  EditUpdateBody,
  ListActivityQuery,
  ListFeedQuery,
  ListUpdatesQuery,
  ProjectUpdate,
} from '@cofarm/contracts/updates';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { assertActor, hasPermission } from '../../lib/actor.ts';
import { assertScope } from '../../lib/project-scope.ts';

import type { ActivityPage, UpdateFeedPage, UpdatePage, UpdateViewer } from './updates.service.ts';
import * as service from './updates.service.ts';

type ProjectParams = { projectId: string };
type UpdateParams = ProjectParams & { updateId: string };

function viewerOf(request: FastifyRequest): UpdateViewer {
  const actor = assertActor(request.actor);
  return {
    userId: actor.userId,
    kind: actor.kind,
    scope: assertScope(request.scope),
    canReadDrafts: actor.kind === 'admin' && hasPermission(actor, PERMISSIONS.updateRead),
  };
}

export async function list(
  request: FastifyRequest<{ Params: ProjectParams; Querystring: ListUpdatesQuery }>,
): Promise<UpdatePage> {
  return service.listUpdates(assertScope(request.scope), request.params.projectId, request.query);
}

export async function feed(
  request: FastifyRequest<{ Params: ProjectParams; Querystring: ListFeedQuery }>,
): Promise<UpdateFeedPage> {
  return service.listFeed(assertScope(request.scope), request.params.projectId, request.query);
}

export async function get(
  request: FastifyRequest<{ Params: UpdateParams }>,
): Promise<ProjectUpdate> {
  return service.getUpdate(viewerOf(request), request.params.projectId, request.params.updateId);
}

export async function create(
  request: FastifyRequest<{ Params: ProjectParams; Body: CreateUpdateBody }>,
  reply: FastifyReply,
): Promise<ProjectUpdate> {
  const actor = assertActor(request.actor);
  const update = await service.createUpdate(request.params.projectId, actor.userId, request.body);
  void reply.status(201);
  return update;
}

export async function edit(
  request: FastifyRequest<{ Params: UpdateParams; Body: EditUpdateBody }>,
): Promise<ProjectUpdate> {
  return service.editUpdate(request.params.projectId, request.params.updateId, request.body);
}

export async function unpublish(
  request: FastifyRequest<{ Params: UpdateParams }>,
): Promise<ProjectUpdate> {
  return service.unpublishUpdate(request.params.projectId, request.params.updateId);
}

export async function publish(
  request: FastifyRequest<{ Params: UpdateParams }>,
): Promise<ProjectUpdate> {
  return service.publishUpdate(request.params.projectId, request.params.updateId);
}

export async function remove(
  request: FastifyRequest<{ Params: UpdateParams }>,
): Promise<{ ok: true }> {
  await service.deleteUpdate(request.params.projectId, request.params.updateId);
  return { ok: true };
}

export async function createActivity(
  request: FastifyRequest<{ Params: ProjectParams; Body: CreateActivityBody }>,
  reply: FastifyReply,
): Promise<ActivityEntry> {
  const actor = assertActor(request.actor);
  const entry = await service.createActivity(request.params.projectId, actor.userId, request.body);
  void reply.status(201);
  return entry;
}

export async function listActivity(
  request: FastifyRequest<{ Params: ProjectParams; Querystring: ListActivityQuery }>,
): Promise<ActivityPage> {
  return service.listActivity(assertScope(request.scope), request.params.projectId, request.query);
}
