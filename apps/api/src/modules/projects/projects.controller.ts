import type {
  SetCycleStatusBody,
  CreateProjectBody,
  Cycle,
  ListProjectsQuery,
  Project,
  UpdateProjectBody,
} from '@cofarm/contracts/projects';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { assertScope } from '../../lib/project-scope.ts';

import type { ProjectPage } from './projects.service.ts';
import * as service from './projects.service.ts';

type ProjectParams = { projectId: string };
type CycleParams = ProjectParams & { cycleId: string };

export async function list(
  request: FastifyRequest<{ Querystring: ListProjectsQuery }>,
): Promise<ProjectPage> {
  return service.listProjects(assertScope(request.scope), request.query);
}

export async function get(request: FastifyRequest<{ Params: ProjectParams }>): Promise<Project> {
  return service.getProject(assertScope(request.scope), request.params.projectId);
}

export async function create(
  request: FastifyRequest<{ Body: CreateProjectBody }>,
  reply: FastifyReply,
): Promise<Project> {
  const project = await service.createProject(request.body);
  void reply.status(201);
  return project;
}

export async function update(
  request: FastifyRequest<{ Params: ProjectParams; Body: UpdateProjectBody }>,
): Promise<Project> {
  return service.updateProject(request.params.projectId, request.body);
}

export async function listCycles(
  request: FastifyRequest<{ Params: ProjectParams }>,
): Promise<Cycle[]> {
  return service.listCycles(assertScope(request.scope), request.params.projectId);
}

export async function createCycle(
  request: FastifyRequest<{
    Params: ProjectParams;
    Body: { startDate: string; expectedHarvestFrom?: string; expectedHarvestTo?: string };
  }>,
  reply: FastifyReply,
): Promise<Cycle> {
  const cycle = await service.createCycle(request.params.projectId, request.body);
  void reply.status(201);
  return cycle;
}

export async function setCycleStatus(
  request: FastifyRequest<{ Params: CycleParams; Body: SetCycleStatusBody }>,
): Promise<Cycle> {
  return service.setCycleStatus(request.params.projectId, request.params.cycleId, request.body);
}

export async function deleteCycle(
  request: FastifyRequest<{ Params: CycleParams }>,
): Promise<{ ok: true }> {
  await service.deleteCycle(request.params.projectId, request.params.cycleId);
  return { ok: true };
}

export async function setMilestone(
  request: FastifyRequest<{
    Params: CycleParams;
    Body: Parameters<typeof service.setMilestone>[2];
  }>,
): Promise<Cycle> {
  return service.setMilestone(request.params.projectId, request.params.cycleId, request.body);
}
