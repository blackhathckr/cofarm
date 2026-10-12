import type {
  CreateHarvestBody,
  CycleStatementParams,
  Harvest,
  HarvestParams,
  HarvestPreview,
  MyStatements,
  MyStatementsQuery,
  PartnerStatement,
  PayoutResult,
  RecordPayoutsBody,
  StatementQuery,
  UpdateHarvestBody,
} from '@cofarm/contracts/harvest';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { assertActor } from '../../lib/actor.ts';
import { assertScope } from '../../lib/project-scope.ts';

import * as service from './harvest.service.ts';
import type { HarvestViewer } from './harvest.service.ts';
import * as payoutService from './harvest.payouts.ts';
import * as statements from './harvest.statements.ts';
import type { StatementViewer } from './harvest.statements.ts';
import { renderStatementPdf, statementPdfFilename } from './harvest.statement-pdf.tsx';

type ProjectParams = { projectId: string };

function harvestViewerOf(request: FastifyRequest): HarvestViewer {
  const actor = assertActor(request.actor);
  return {
    scope: assertScope(request.scope),
    publishedOnly: actor.kind === 'partner',
  };
}

function statementViewerOf(request: FastifyRequest): StatementViewer {
  const actor = assertActor(request.actor);
  return {
    userId: actor.userId,
    scope: assertScope(request.scope),
    isPartner: actor.kind === 'partner',
  };
}

export async function list(request: FastifyRequest<{ Params: ProjectParams }>): Promise<Harvest[]> {
  return service.listHarvests(harvestViewerOf(request), request.params.projectId);
}

export async function get(request: FastifyRequest<{ Params: HarvestParams }>): Promise<Harvest> {
  return service.getHarvest(
    harvestViewerOf(request),
    request.params.projectId,
    request.params.harvestId,
  );
}

export async function create(
  request: FastifyRequest<{ Params: ProjectParams; Body: CreateHarvestBody }>,
  reply: FastifyReply,
): Promise<Harvest> {
  const actor = assertActor(request.actor);
  const harvest = await service.createHarvest(request.params.projectId, request.body, actor.userId);
  void reply.status(201);
  return harvest;
}

export async function update(
  request: FastifyRequest<{ Params: HarvestParams; Body: UpdateHarvestBody }>,
): Promise<Harvest> {
  return service.updateHarvest(request.params.projectId, request.params.harvestId, request.body);
}

export async function preview(
  request: FastifyRequest<{ Params: HarvestParams }>,
): Promise<HarvestPreview> {
  return service.previewHarvest(
    assertScope(request.scope),
    request.params.projectId,
    request.params.harvestId,
  );
}

export async function publish(
  request: FastifyRequest<{ Params: HarvestParams }>,
): Promise<Harvest> {
  return service.publishHarvest(request.params.projectId, request.params.harvestId);
}

export async function payouts(
  request: FastifyRequest<{ Params: HarvestParams; Body: RecordPayoutsBody }>,
): Promise<PayoutResult> {
  return payoutService.recordPayouts(
    request.params.projectId,
    request.params.harvestId,
    request.body,
  );
}

export async function statement(
  request: FastifyRequest<{ Params: CycleStatementParams; Querystring: StatementQuery }>,
): Promise<PartnerStatement> {
  return statements.cycleStatement(
    statementViewerOf(request),
    request.params.projectId,
    request.params.cycleId,
    request.query.membershipId,
  );
}

export async function statementPdf(
  request: FastifyRequest<{ Params: CycleStatementParams; Querystring: StatementQuery }>,
  reply: FastifyReply,
): Promise<Buffer> {
  const row = await statements.cycleStatement(
    statementViewerOf(request),
    request.params.projectId,
    request.params.cycleId,
    request.query.membershipId,
  );

  void reply
    .type('application/pdf')
    .header('content-disposition', `attachment; filename="${statementPdfFilename(row)}"`);

  return renderStatementPdf(row);
}

export async function myStatements(
  request: FastifyRequest<{ Querystring: MyStatementsQuery }>,
): Promise<MyStatements> {
  return statements.myStatements(statementViewerOf(request), request.query);
}
