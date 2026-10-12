import {
  createHarvestBodySchema,
  cycleStatementParamsSchema,
  harvestParamsSchema,
  harvestPreviewSchema,
  harvestSchema,
  myStatementsQuerySchema,
  myStatementsSchema,
  partnerStatementSchema,
  payoutResultSchema,
  recordPayoutsBodySchema,
  statementQuerySchema,
  updateHarvestBodySchema,
} from '@cofarm/contracts/harvest';
import { projectIdParamsSchema } from '@cofarm/contracts/projects';
import { z } from 'zod';

export const harvestSchemas = {
  list: {
    params: projectIdParamsSchema,
    response: { 200: z.array(harvestSchema) },
  },
  get: {
    params: harvestParamsSchema,
    response: { 200: harvestSchema },
  },
  create: {
    params: projectIdParamsSchema,
    body: createHarvestBodySchema,
    response: { 201: harvestSchema },
  },
  update: {
    params: harvestParamsSchema,
    body: updateHarvestBodySchema,
    response: { 200: harvestSchema },
  },
  preview: {
    params: harvestParamsSchema,
    response: { 200: harvestPreviewSchema },
  },
  publish: {
    params: harvestParamsSchema,
    response: { 200: harvestSchema },
  },
  payouts: {
    params: harvestParamsSchema,
    body: recordPayoutsBodySchema,
    response: { 200: payoutResultSchema },
  },
  statement: {
    params: cycleStatementParamsSchema,
    querystring: statementQuerySchema,
    response: { 200: partnerStatementSchema },
  },
  /** No response schema: the body is a PDF, not JSON. */
  statementPdf: {
    params: cycleStatementParamsSchema,
    querystring: statementQuerySchema,
  },
  myStatements: {
    querystring: myStatementsQuerySchema,
    response: { 200: myStatementsSchema },
  },
} as const;
