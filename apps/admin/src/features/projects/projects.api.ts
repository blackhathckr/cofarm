import {
  cycleSchema,
  type CreateCycleBody,
  projectPageSchema,
  projectSchema,
  type CreateProjectBody,
  type ListProjectsQuery,
  type CycleStatus,
  type SetMilestoneBody,
} from '@cofarm/contracts/projects';
import { okSchema } from '@cofarm/contracts/primitives';

import { request } from '@/lib/api-client.ts';

export function fetchProjects(query: Partial<ListProjectsQuery> = {}) {
  const params = new URLSearchParams();
  if (query.status !== undefined) params.set('status', query.status);
  if (query.search !== undefined && query.search !== '') params.set('search', query.search);
  if (query.cursor !== undefined) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 20));

  return request(`/v1/projects?${params.toString()}`, projectPageSchema);
}

export function fetchProject(projectId: string) {
  return request(`/v1/projects/${projectId}`, projectSchema);
}

export function createProject(body: CreateProjectBody) {
  return request('/v1/projects', projectSchema, { method: 'POST', body });
}

export function setMilestone(projectId: string, cycleId: string, body: SetMilestoneBody) {
  return request(`/v1/projects/${projectId}/cycles/${cycleId}/milestone`, cycleSchema, {
    method: 'PATCH',
    body,
  });
}

export function createCycle(projectId: string, body: CreateCycleBody) {
  return request(`/v1/projects/${projectId}/cycles`, cycleSchema, { method: 'POST', body });
}

export function setCycleStatus(projectId: string, cycleId: string, status: CycleStatus) {
  return request(`/v1/projects/${projectId}/cycles/${cycleId}/status`, cycleSchema, {
    method: 'POST',
    body: { status },
  });
}

export function deleteCycle(projectId: string, cycleId: string) {
  return request(`/v1/projects/${projectId}/cycles/${cycleId}`, okSchema, { method: 'DELETE' });
}
