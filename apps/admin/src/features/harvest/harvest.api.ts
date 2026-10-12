import {
  harvestPreviewSchema,
  harvestSchema,
  partnerStatementSchema,
  payoutResultSchema,
  type CreateHarvestBody,
  type RecordPayoutsBody,
  type UpdateHarvestBody,
} from '@cofarm/contracts/harvest';
import { z } from 'zod';

import { request } from '@/lib/api-client.ts';

const harvestListSchema = z.array(harvestSchema);

export function fetchHarvests(projectId: string) {
  return request(`/v1/projects/${projectId}/harvest`, harvestListSchema);
}

export function createHarvest(projectId: string, body: CreateHarvestBody) {
  return request(`/v1/projects/${projectId}/harvest`, harvestSchema, { method: 'POST', body });
}

export function updateHarvest(projectId: string, harvestId: string, body: UpdateHarvestBody) {
  return request(`/v1/projects/${projectId}/harvest/${harvestId}`, harvestSchema, {
    method: 'PATCH',
    body,
  });
}

export function fetchHarvestPreview(projectId: string, harvestId: string) {
  return request(`/v1/projects/${projectId}/harvest/${harvestId}/preview`, harvestPreviewSchema);
}

export function publishHarvest(projectId: string, harvestId: string, idempotencyKey: string) {
  return request(`/v1/projects/${projectId}/harvest/${harvestId}/publish`, harvestSchema, {
    method: 'POST',
    idempotencyKey,
  });
}

export function recordPayouts(
  projectId: string,
  harvestId: string,
  body: RecordPayoutsBody,
  idempotencyKey: string,
) {
  return request(`/v1/projects/${projectId}/harvest/${harvestId}/payouts`, payoutResultSchema, {
    method: 'POST',
    body,
    idempotencyKey,
  });
}

export function fetchCycleStatement(projectId: string, cycleId: string, membershipId: string) {
  const params = new URLSearchParams({ membershipId });

  return request(
    `/v1/projects/${projectId}/cycles/${cycleId}/statement?${params.toString()}`,
    partnerStatementSchema,
  );
}
