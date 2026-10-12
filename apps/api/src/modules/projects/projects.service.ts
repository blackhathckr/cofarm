import { ERROR_CODES } from '@cofarm/contracts/errors';
import type {
  CreateProjectBody,
  Cycle,
  ListProjectsQuery,
  Project,
  ProjectSummary,
  SetCycleStatusBody,
  UpdateProjectBody,
} from '@cofarm/contracts/projects';
import { toPaiseString } from '@cofarm/contracts/primitives';
import {
  cycleProgressBasisPoints,
  MILESTONE_LABELS,
  MILESTONE_STAGES,
  type CycleMilestone,
} from '@cofarm/core/cycle';
import { newId } from '@cofarm/core/id';
import { isProjectCode } from '@cofarm/core/project-code';

import { badRequest, conflict, notFound } from '../../lib/errors.ts';
import { indiaToday } from '../../lib/india-date.ts';
import { pickDefined } from '../../lib/patch.ts';
import { ADMIN_SCOPE, type ProjectScope } from '../../lib/project-scope.ts';
import * as audit from '../audit/audit.service.ts';
import * as repo from './projects.repo.ts';

export type ProjectPage = {
  items: ProjectSummary[];
  nextCursor: string | null;
};

export async function listProjects(
  scope: ProjectScope,
  query: ListProjectsQuery,
): Promise<ProjectPage> {
  const rows = await repo.listProjects(scope, {
    status: query.status,
    search: query.search,
    cursor: query.cursor,
    limit: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    items: page.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      location: row.location,
      acreageAcres: row.acreageAcres,
      variety: row.variety,
      status: row.status,
      partnerCount: row.partnerCount,
    })),
    nextCursor: hasMore ? (page.at(-1)?.code ?? null) : null,
  };
}

/** Headline figures for the console dashboard, counted in one query. */
export function activeTotals(scope: ProjectScope): Promise<repo.ActiveProjectTotals> {
  return repo.activeTotals(scope);
}

export async function getProject(scope: ProjectScope, projectId: string): Promise<Project> {
  const row = await repo.findProject(scope, projectId);
  if (row === null) throw notFound('Project');

  const [partnerCount, allocatedPaise, cycle] = await Promise.all([
    repo.countActivePartners(projectId),
    repo.sumAllocatedPaise(projectId),
    repo.activeCycle(projectId),
  ]);

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    location: row.location,
    acreageAcres: row.acreageAcres,
    variety: row.variety,
    startDate: row.startDate,
    status: row.status,
    capacityPaise: toPaiseString(row.capacityPaise),
    allocatedPaise: toPaiseString(allocatedPaise),
    kiaanShareBps: row.kiaanShareBps,
    latitude: row.latitude,
    longitude: row.longitude,
    partnerCount,
    currentCycle: cycle === null ? null : await toCycleDto(cycle),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createProject(input: CreateProjectBody): Promise<Project> {
  if (!isProjectCode(input.code)) {
    throw badRequest('Project code must look like MYSBN06');
  }
  const existing = await repo.findProjectByCode(input.code);
  if (existing !== null) {
    throw conflict(ERROR_CODES.projectCodeTaken, `Project code ${input.code} is already in use`);
  }

  const created = await repo.insertProject({
    id: newId(),
    code: input.code,
    name: input.name,
    location: input.location,
    acreageAcres: input.acreageAcres.toFixed(2),
    variety: input.variety,
    startDate: input.startDate,
    capacityPaise: BigInt(input.capacityPaise),
    kiaanShareBps: input.kiaanShareBps,
    latitude: input.latitude === undefined ? null : input.latitude.toFixed(6),
    longitude: input.longitude === undefined ? null : input.longitude.toFixed(6),
  });

  await audit.record({
    action: 'project.created',
    entityTable: 'projects',
    entityId: created.id,
    projectId: created.id,
    after: created,
  });

  return getProject(ADMIN_SCOPE, created.id);
}

export async function updateProject(projectId: string, input: UpdateProjectBody): Promise<Project> {
  const before = await repo.findProject(ADMIN_SCOPE, projectId);
  if (before === null) throw notFound('Project');

  const patch = pickDefined({
    name: input.name,
    location: input.location,
    variety: input.variety,
    startDate: input.startDate,
    status: input.status,
    acreageAcres: input.acreageAcres?.toFixed(2),
    capacityPaise: input.capacityPaise === undefined ? undefined : BigInt(input.capacityPaise),
    kiaanShareBps: input.kiaanShareBps,
    latitude: input.latitude?.toFixed(6),
    longitude: input.longitude?.toFixed(6),
  });

  const updated = await repo.updateProject(projectId, patch);
  if (updated === null) throw notFound('Project');

  await audit.record({
    action: 'project.updated',
    entityTable: 'projects',
    entityId: projectId,
    projectId,
    before,
    after: updated,
  });

  return getProject(ADMIN_SCOPE, projectId);
}

export async function listCycles(scope: ProjectScope, projectId: string): Promise<Cycle[]> {
  const project = await repo.findProject(scope, projectId);
  if (project === null) throw notFound('Project');

  const rows = await repo.cyclesForProject(projectId);
  return Promise.all(rows.map(toCycleDto));
}

export async function createCycle(
  projectId: string,
  input: { startDate: string; expectedHarvestFrom?: string; expectedHarvestTo?: string },
): Promise<Cycle> {
  const project = await repo.findProject(ADMIN_SCOPE, projectId);
  if (project === null) throw notFound('Project');

  const previous = await repo.latestCycle(projectId);
  await demotePreviousActive(projectId);

  const cycle = await repo.insertCycle({
    id: newId(),
    projectId,
    cycleNo: (previous?.cycleNo ?? 0) + 1,
    startDate: input.startDate,
    expectedHarvestFrom: input.expectedHarvestFrom ?? null,
    expectedHarvestTo: input.expectedHarvestTo ?? null,
    status: 'active',
  });

  await repo.insertMilestones(
    MILESTONE_STAGES.map((stage, index) => ({
      id: newId(),
      projectId,
      cycleId: cycle.id,
      stage,
      status: index === 0 ? ('active' as const) : ('upcoming' as const),
      sortOrder: index,
    })),
  );

  await audit.record({
    action: 'cycle.created',
    entityTable: 'cycles',
    entityId: cycle.id,
    projectId,
    after: cycle,
  });

  return toCycleDto(cycle);
}

/**
 * A published harvest settles its cycle: the statements are issued from that
 * moment, so the cycle stops taking new costs and sales.
 */
export async function settleCycle(projectId: string, cycleId: string): Promise<void> {
  const cycles = await repo.cyclesForProject(projectId);
  const cycle = cycles.find((row) => row.id === cycleId);
  if (cycle === undefined) throw notFound('Cycle');
  if (cycle.status === 'harvested' || cycle.status === 'closed') return;

  await repo.updateCycle(cycleId, { status: 'harvested' });
}

/**
 * A cycle that stops being the running one records what became of it: harvested
 * when its sale was published, closed otherwise.
 */
async function demotePreviousActive(projectId: string, exceptCycleId?: string): Promise<void> {
  const running = await repo.activeCycle(projectId);
  if (running === null || running.id === exceptCycleId) return;

  const wasHarvested = await repo.hasPublishedHarvest(running.id);
  await repo.demoteActiveCycles(
    projectId,
    wasHarvested ? 'harvested' : 'closed',
    indiaToday(),
    exceptCycleId,
  );
}

export async function setCycleStatus(
  projectId: string,
  cycleId: string,
  input: SetCycleStatusBody,
): Promise<Cycle> {
  const project = await repo.findProject(ADMIN_SCOPE, projectId);
  if (project === null) throw notFound('Project');

  const existing = await repo.findCycle(cycleId);
  if (existing?.projectId !== projectId) throw notFound('Cycle');

  // Only one cycle runs at a time, so activating this one stands the others down.
  if (input.status === 'active') await demotePreviousActive(projectId, cycleId);

  // A cycle that ends gets an end date; one reopened loses it again.
  const isEnded = input.status === 'closed' || input.status === 'harvested';
  const updated = await repo.updateCycle(cycleId, {
    status: input.status,
    endDate: isEnded ? (input.endDate ?? indiaToday()) : null,
  });
  if (updated === null) throw notFound('Cycle');

  await audit.record({
    action: 'cycle.status.set',
    entityTable: 'cycles',
    entityId: cycleId,
    projectId,
    before: existing,
    after: updated,
  });

  const cycles = await repo.cyclesForProject(projectId);
  const cycle = cycles.find((row) => row.id === cycleId);
  if (cycle === undefined) throw notFound('Cycle');
  return toCycleDto(cycle);
}

/**
 * Milestones go with the cycle and updates keep their text without it, but a
 * harvest, a cost or an issued statement means money moved against this cycle
 * and the record has to stand.
 */
export async function deleteCycle(projectId: string, cycleId: string): Promise<void> {
  const project = await repo.findProject(ADMIN_SCOPE, projectId);
  if (project === null) throw notFound('Project');

  const existing = await repo.findCycle(cycleId);
  if (existing?.projectId !== projectId) throw notFound('Cycle');

  const dependants = await repo.cycleDependants(cycleId);
  const blockers = [
    dependants.harvests > 0 ? 'a harvest' : null,
    dependants.ledgerEntries > 0 ? 'recorded costs' : null,
    dependants.statements > 0 ? 'issued statements' : null,
  ].filter((blocker): blocker is string => blocker !== null);

  if (blockers.length > 0) {
    throw conflict(
      ERROR_CODES.cycleHasRecords,
      `This cycle has ${blockers.join(' and ')}. Close it instead of deleting it.`,
    );
  }

  const removed = await repo.deleteCycle(cycleId);
  if (removed === null) throw notFound('Cycle');

  await audit.record({
    action: 'cycle.deleted',
    entityTable: 'cycles',
    entityId: cycleId,
    projectId,
    before: existing,
  });
}

export async function setMilestone(
  projectId: string,
  cycleId: string,
  input: {
    stage: CycleMilestone['stage'];
    status: CycleMilestone['status'];
    actualFrom?: string;
    actualTo?: string;
  },
): Promise<Cycle> {
  const project = await repo.findProject(ADMIN_SCOPE, projectId);
  if (project === null) throw notFound('Project');

  const updated = await repo.upsertMilestoneStatus(cycleId, input.stage, {
    status: input.status,
    actualFrom: input.actualFrom ?? null,
    actualTo: input.actualTo ?? null,
  });
  if (updated === null) throw notFound('Milestone');

  await audit.record({
    action: 'milestone.updated',
    entityTable: 'cycle_milestones',
    entityId: updated.id,
    projectId,
    after: updated,
  });

  const cycles = await repo.cyclesForProject(projectId);
  const cycle = cycles.find((row) => row.id === cycleId);
  if (cycle === undefined) throw notFound('Cycle');
  return toCycleDto(cycle);
}

async function toCycleDto(cycle: repo.CycleRow): Promise<Cycle> {
  const milestones = await repo.milestonesForCycle(cycle.id);

  return {
    id: cycle.id,
    projectId: cycle.projectId,
    cycleNo: cycle.cycleNo,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    expectedHarvestFrom: cycle.expectedHarvestFrom,
    expectedHarvestTo: cycle.expectedHarvestTo,
    status: cycle.status,
    progressBps: cycleProgressBasisPoints(
      milestones.map((row) => ({ stage: row.stage, status: row.status })),
    ),
    milestones: milestones.map((row) => ({
      id: row.id,
      stage: row.stage,
      label: MILESTONE_LABELS[row.stage],
      status: row.status,
      plannedFrom: row.plannedFrom,
      plannedTo: row.plannedTo,
      actualFrom: row.actualFrom,
      actualTo: row.actualTo,
    })),
  };
}
