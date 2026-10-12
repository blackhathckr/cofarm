import {
  misComposePayloadSchema,
  misPageSchema,
  misReportSchema,
  type CreateMisBody,
  type ListMisQuery,
  type UpdateMisBody,
} from '@cofarm/contracts/mis';
import { okSchema } from '@cofarm/contracts/primitives';
import { entityReceiptsSchema } from '@cofarm/contracts/tracking';

import { request } from '@/lib/api-client.ts';

export function fetchMisReports(projectId: string, query: Partial<ListMisQuery> = {}) {
  const params = new URLSearchParams();
  if (query.cursor !== undefined) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 20));

  return request(`/v1/projects/${projectId}/mis?${params.toString()}`, misPageSchema);
}

export function fetchMisReport(projectId: string, reportId: string) {
  return request(`/v1/projects/${projectId}/mis/${reportId}`, misReportSchema);
}

export function createMisReport(projectId: string, body: CreateMisBody, idempotencyKey: string) {
  return request(`/v1/projects/${projectId}/mis`, misReportSchema, {
    method: 'POST',
    body,
    idempotencyKey,
  });
}

export function updateMisReport(projectId: string, reportId: string, body: UpdateMisBody) {
  return request(`/v1/projects/${projectId}/mis/${reportId}`, misReportSchema, {
    method: 'PATCH',
    body,
  });
}

export function unpublishMisReport(projectId: string, reportId: string, idempotencyKey: string) {
  return request(`/v1/projects/${projectId}/mis/${reportId}/unpublish`, misReportSchema, {
    method: 'POST',
    idempotencyKey,
  });
}

export function publishMisReport(projectId: string, reportId: string, idempotencyKey: string) {
  return request(`/v1/projects/${projectId}/mis/${reportId}/publish`, misReportSchema, {
    method: 'POST',
    idempotencyKey,
  });
}

export function composeMisReport(projectId: string, reportId: string) {
  return request(`/v1/projects/${projectId}/mis/${reportId}/compose`, misComposePayloadSchema, {
    method: 'POST',
  });
}

export function fetchMisReceipts(projectId: string, reportId: string) {
  return request(`/v1/projects/${projectId}/mis/${reportId}/receipts`, entityReceiptsSchema);
}

export function deleteMisReport(projectId: string, reportId: string) {
  return request(`/v1/projects/${projectId}/mis/${reportId}`, okSchema, { method: 'DELETE' });
}
