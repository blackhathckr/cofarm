import { jobOverviewSchema, listJobsQuerySchema } from '@cofarm/contracts/jobs';

export const jobSchemas = {
  list: {
    querystring: listJobsQuerySchema,
    response: { 200: jobOverviewSchema },
  },
} as const;
