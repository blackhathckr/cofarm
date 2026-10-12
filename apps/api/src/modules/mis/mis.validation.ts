import {
  createMisBodySchema,
  listMisQuerySchema,
  misComposePayloadSchema,
  misLatestSchema,
  misPageSchema,
  misReportParamsSchema,
  misReportSchema,
  updateMisBodySchema,
} from '@cofarm/contracts/mis';
import { okSchema } from '@cofarm/contracts/primitives';
import { projectIdParamsSchema } from '@cofarm/contracts/projects';
import { entityReceiptsSchema } from '@cofarm/contracts/tracking';
import { z } from 'zod';

export const misSchemas = {
  list: {
    params: projectIdParamsSchema,
    querystring: listMisQuerySchema,
    response: { 200: misPageSchema },
  },
  get: {
    params: misReportParamsSchema,
    response: { 200: misReportSchema },
  },
  latest: {
    response: { 200: z.array(misLatestSchema) },
  },
  create: {
    params: projectIdParamsSchema,
    body: createMisBodySchema,
    response: { 201: misReportSchema },
  },
  update: {
    params: misReportParamsSchema,
    body: updateMisBodySchema,
    response: { 200: misReportSchema },
  },
  unpublish: {
    params: misReportParamsSchema,
    response: { 200: misReportSchema },
  },
  publish: {
    params: misReportParamsSchema,
    response: { 200: misReportSchema },
  },
  remove: {
    params: misReportParamsSchema,
    response: { 200: okSchema },
  },
  receipts: {
    params: misReportParamsSchema,
    response: { 200: entityReceiptsSchema },
  },
  compose: {
    params: misReportParamsSchema,
    response: { 200: misComposePayloadSchema },
  },
} as const;
