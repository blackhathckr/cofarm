import { okSchema } from '@cofarm/contracts/primitives';
import { projectSchema } from '@cofarm/contracts/projects';
import {
  activityEntrySchema,
  activityPageSchema,
  projectUpdateSchema,
  updatePageSchema,
  type CreateActivityBody,
  type CreateUpdateBody,
  type EditUpdateBody,
  type ListUpdatesQuery,
} from '@cofarm/contracts/updates';

import { request } from '@/lib/api-client.ts';

type PageQuery = { limit?: number | undefined; cursor?: string | undefined };

function pageQuery(query: PageQuery): string {
  const params = new URLSearchParams();
  if (query.cursor !== undefined) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 20));
  return params.toString();
}

export function fetchUpdates(projectId: string, query: Partial<ListUpdatesQuery> = {}) {
  const params = new URLSearchParams(pageQuery(query));
  if (query.status !== undefined) params.set('status', query.status);

  return request(`/v1/projects/${projectId}/updates?${params.toString()}`, updatePageSchema);
}

export function fetchUpdate(projectId: string, updateId: string) {
  return request(`/v1/projects/${projectId}/updates/${updateId}`, projectUpdateSchema);
}

export function createUpdate(projectId: string, body: CreateUpdateBody, idempotencyKey: string) {
  return request(`/v1/projects/${projectId}/updates`, projectUpdateSchema, {
    method: 'POST',
    body,
    idempotencyKey,
  });
}

export function editUpdate(projectId: string, updateId: string, body: EditUpdateBody) {
  return request(`/v1/projects/${projectId}/updates/${updateId}`, projectUpdateSchema, {
    method: 'PATCH',
    body,
  });
}

export function unpublishUpdate(projectId: string, updateId: string, idempotencyKey: string) {
  return request(`/v1/projects/${projectId}/updates/${updateId}/unpublish`, projectUpdateSchema, {
    method: 'POST',
    idempotencyKey,
  });
}

export function publishUpdate(projectId: string, updateId: string, idempotencyKey: string) {
  return request(`/v1/projects/${projectId}/updates/${updateId}/publish`, projectUpdateSchema, {
    method: 'POST',
    idempotencyKey,
  });
}

export function deleteUpdate(projectId: string, updateId: string) {
  return request(`/v1/projects/${projectId}/updates/${updateId}`, okSchema, { method: 'DELETE' });
}

export function fetchActivity(projectId: string, query: PageQuery = {}) {
  return request(`/v1/projects/${projectId}/activity?${pageQuery(query)}`, activityPageSchema);
}

export function createActivity(projectId: string, body: CreateActivityBody) {
  return request(`/v1/projects/${projectId}/activity`, activityEntrySchema, {
    method: 'POST',
    body,
  });
}

export function fetchUpdateProject(projectId: string) {
  return request(`/v1/projects/${projectId}`, projectSchema);
}
