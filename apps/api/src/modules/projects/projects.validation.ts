import {
  setCycleStatusBodySchema,
  createCycleBodySchema,
  createProjectBodySchema,
  cycleSchema,
  listProjectsQuerySchema,
  projectIdParamsSchema,
  projectPageSchema,
  projectSchema,
  setMilestoneBodySchema,
  updateProjectBodySchema,
} from '@cofarm/contracts/projects';
import { okSchema, uuidSchema } from '@cofarm/contracts/primitives';
import { z } from 'zod';

const cycleParamsSchema = projectIdParamsSchema.extend({ cycleId: uuidSchema });

export const projectSchemas = {
  list: {
    querystring: listProjectsQuerySchema,
    response: { 200: projectPageSchema },
  },
  get: {
    params: projectIdParamsSchema,
    response: { 200: projectSchema },
  },
  create: {
    body: createProjectBodySchema,
    response: { 201: projectSchema },
  },
  update: {
    params: projectIdParamsSchema,
    body: updateProjectBodySchema,
    response: { 200: projectSchema },
  },
  listCycles: {
    params: projectIdParamsSchema,
    response: { 200: z.array(cycleSchema) },
  },
  createCycle: {
    params: projectIdParamsSchema,
    body: createCycleBodySchema,
    response: { 201: cycleSchema },
  },
  setMilestone: {
    params: cycleParamsSchema,
    body: setMilestoneBodySchema,
    response: { 200: cycleSchema },
  },
  setCycleStatus: {
    params: cycleParamsSchema,
    body: setCycleStatusBodySchema,
    response: { 200: cycleSchema },
  },
  deleteCycle: {
    params: cycleParamsSchema,
    response: { 200: okSchema },
  },
} as const;
