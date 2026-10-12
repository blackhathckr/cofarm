import type {
  CreateMisBody,
  ListMisQuery,
  MisComposePayload,
  MisLatest,
  MisPage,
  MisReport,
  MisReportParams,
  UpdateMisBody,
} from '@cofarm/contracts/mis';
import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { EntityReceipts } from '@cofarm/contracts/tracking';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { assertActor, hasPermission } from '../../lib/actor.ts';
import { assertScope } from '../../lib/project-scope.ts';

import type { MisViewer } from './mis.service.ts';
import * as service from './mis.service.ts';

type ProjectParams = { projectId: string };

function viewerOf(request: FastifyRequest): MisViewer {
  const actor = assertActor(request.actor);
  return {
    userId: actor.userId,
    scope: assertScope(request.scope),
    canSeeDrafts: actor.kind === 'admin' && hasPermission(actor, PERMISSIONS.misRead),
    isPartner: actor.kind === 'partner',
  };
}

export async function list(
  request: FastifyRequest<{ Params: ProjectParams; Querystring: ListMisQuery }>,
): Promise<MisPage> {
  return service.listReports(viewerOf(request), request.params.projectId, request.query);
}

export async function get(
  request: FastifyRequest<{ Params: MisReportParams }>,
): Promise<MisReport> {
  return service.getReport(viewerOf(request), request.params.projectId, request.params.reportId);
}

export async function latest(request: FastifyRequest): Promise<MisLatest[]> {
  return service.latestForMember(viewerOf(request));
}

export async function create(
  request: FastifyRequest<{ Params: ProjectParams; Body: CreateMisBody }>,
  reply: FastifyReply,
): Promise<MisReport> {
  const actor = assertActor(request.actor);
  const report = await service.createReport(request.params.projectId, request.body, actor.userId);
  void reply.status(201);
  return report;
}

export async function update(
  request: FastifyRequest<{ Params: MisReportParams; Body: UpdateMisBody }>,
): Promise<MisReport> {
  return service.updateReport(request.params.projectId, request.params.reportId, request.body);
}

export async function unpublish(
  request: FastifyRequest<{ Params: MisReportParams }>,
): Promise<MisReport> {
  return service.unpublishReport(request.params.projectId, request.params.reportId);
}

export async function publish(
  request: FastifyRequest<{ Params: MisReportParams }>,
): Promise<MisReport> {
  return service.publishReport(request.params.projectId, request.params.reportId);
}

export async function remove(
  request: FastifyRequest<{ Params: MisReportParams }>,
): Promise<{ ok: true }> {
  await service.deleteReport(request.params.projectId, request.params.reportId);
  return { ok: true };
}

export async function receipts(
  request: FastifyRequest<{ Params: MisReportParams }>,
): Promise<EntityReceipts> {
  return service.receiptsForReport(
    assertScope(request.scope),
    request.params.projectId,
    request.params.reportId,
  );
}

export async function compose(
  request: FastifyRequest<{ Params: MisReportParams }>,
): Promise<MisComposePayload> {
  return service.composeReport(request.params.projectId, request.params.reportId);
}
