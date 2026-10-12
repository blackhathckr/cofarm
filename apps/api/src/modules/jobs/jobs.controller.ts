import type { FastifyRequest } from 'fastify';

import type { ListJobsQuery } from '@cofarm/contracts/jobs';

import type { JobOverview } from './jobs.service.ts';
import * as service from './jobs.service.ts';

export async function list(
  request: FastifyRequest<{ Querystring: ListJobsQuery }>,
): Promise<JobOverview> {
  return service.listJobs({
    status: request.query.status,
    type: request.query.type,
    limit: request.query.limit,
  });
}
