import {
  remindAllResultSchema,
  signaturePageSchema,
  signatureRequestSchema,
  type IssueSignatureBody,
  type ListSignaturesQuery,
} from '@cofarm/contracts/signatures';

import { request } from '@/lib/api-client.ts';

export function fetchSignatures(query: Partial<ListSignaturesQuery> = {}) {
  const params = new URLSearchParams();
  if (query.status !== undefined) params.set('status', query.status);
  if (query.projectId !== undefined) params.set('projectId', query.projectId);
  if (query.cursor !== undefined) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 50));

  return request(`/v1/signatures?${params.toString()}`, signaturePageSchema);
}

export function issueSignature(
  projectId: string,
  body: IssueSignatureBody,
  idempotencyKey: string,
) {
  return request(`/v1/projects/${projectId}/signatures`, signatureRequestSchema, {
    method: 'POST',
    body,
    idempotencyKey,
  });
}

export function remindSignature(requestId: string) {
  return request(`/v1/signatures/${requestId}/remind`, signatureRequestSchema, { method: 'POST' });
}

export function remindAllSignatures(projectId: string, idempotencyKey: string) {
  return request('/v1/signatures/remind-all', remindAllResultSchema, {
    method: 'POST',
    body: { projectId },
    idempotencyKey,
  });
}

export function cancelSignature(requestId: string) {
  return request(`/v1/signatures/${requestId}/cancel`, signatureRequestSchema, { method: 'POST' });
}
