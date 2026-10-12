import {
  harvestSchema,
  myStatementsSchema,
  partnerStatementSchema,
} from '@cofarm/contracts/harvest';
import { cycleSchema } from '@cofarm/contracts/projects';
import { z } from 'zod';

import { request } from '@/lib/api-client.ts';

const harvestListSchema = z.array(harvestSchema);

const STATEMENT_PAGE_SIZE = 20;

export function fetchHarvests(projectId: string) {
  return request(`/v1/projects/${projectId}/harvest`, harvestListSchema);
}

export function fetchCycleStatement(projectId: string, cycleId: string) {
  return request(`/v1/projects/${projectId}/cycles/${cycleId}/statement`, partnerStatementSchema);
}

export function fetchMyStatements(cursor: string | null) {
  const query = new URLSearchParams({ limit: String(STATEMENT_PAGE_SIZE) });
  if (cursor !== null) query.set('cursor', cursor);

  return request(`/v1/me/statements?${query.toString()}`, myStatementsSchema);
}

export function statementPdfPath(projectId: string, cycleId: string): string {
  return `/v1/projects/${projectId}/cycles/${cycleId}/statement.pdf`;
}

export function fetchProjectCycles(projectId: string) {
  return request(`/v1/projects/${projectId}/cycles`, z.array(cycleSchema));
}
