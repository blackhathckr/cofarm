import { z } from 'zod';

import {
  basisPointsSchema,
  dateSchema,
  paiseSchema,
  pageOf,
  paginationQuerySchema,
  projectCodeSchema,
  timestampSchema,
  uuidSchema,
} from './primitives.ts';

export const projectStatusSchema = z.enum(['planned', 'active', 'harvested', 'closed']);
export const cycleStatusSchema = z.enum(['planned', 'active', 'harvested', 'closed']);
export const milestoneStageSchema = z.enum([
  'land_prep',
  'planting',
  'growth',
  'bunch_formation',
  'harvest',
]);
export const milestoneStatusSchema = z.enum(['done', 'active', 'upcoming']);

export const milestoneSchema = z.object({
  id: uuidSchema,
  stage: milestoneStageSchema,
  label: z.string(),
  status: milestoneStatusSchema,
  plannedFrom: dateSchema.nullable(),
  plannedTo: dateSchema.nullable(),
  actualFrom: dateSchema.nullable(),
  actualTo: dateSchema.nullable(),
});

export const cycleSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  cycleNo: z.number().int().positive(),
  startDate: dateSchema,
  endDate: dateSchema.nullable(),
  expectedHarvestFrom: dateSchema.nullable(),
  expectedHarvestTo: dateSchema.nullable(),
  status: cycleStatusSchema,
  progressBps: basisPointsSchema,
  milestones: z.array(milestoneSchema),
});

export const projectSchema = z.object({
  id: uuidSchema,
  code: projectCodeSchema,
  name: z.string(),
  location: z.string(),
  acreageAcres: z.string(),
  variety: z.string(),
  startDate: dateSchema,
  status: projectStatusSchema,
  capacityPaise: paiseSchema,
  allocatedPaise: paiseSchema,
  kiaanShareBps: basisPointsSchema,
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  partnerCount: z.number().int().nonnegative(),
  currentCycle: cycleSchema.nullable(),
  createdAt: timestampSchema,
});

export const projectSummarySchema = projectSchema.pick({
  id: true,
  code: true,
  name: true,
  location: true,
  acreageAcres: true,
  variety: true,
  status: true,
  partnerCount: true,
});

export const createProjectBodySchema = z.object({
  code: projectCodeSchema,
  name: z.string().min(2).max(120),
  location: z.string().min(2).max(160),
  acreageAcres: z.coerce.number().positive().max(10_000),
  variety: z.string().min(2).max(120),
  startDate: dateSchema,
  capacityPaise: paiseSchema.default('0'),
  kiaanShareBps: basisPointsSchema.default(5000),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const updateProjectBodySchema = createProjectBodySchema
  .omit({ code: true })
  .partial()
  .extend({ status: projectStatusSchema.optional() });

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  status: projectStatusSchema.optional(),
  search: z.string().max(80).optional(),
});

export const projectIdParamsSchema = z.object({ projectId: uuidSchema });

export const createCycleBodySchema = z.object({
  startDate: dateSchema,
  expectedHarvestFrom: dateSchema.optional(),
  expectedHarvestTo: dateSchema.optional(),
});

export const setCycleStatusBodySchema = z.object({
  status: cycleStatusSchema,
  endDate: dateSchema.optional(),
});

export const setMilestoneBodySchema = z.object({
  stage: milestoneStageSchema,
  status: milestoneStatusSchema,
  actualFrom: dateSchema.optional(),
  actualTo: dateSchema.optional(),
});

export const projectPageSchema = pageOf(projectSummarySchema);

export type Project = z.infer<typeof projectSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type Cycle = z.infer<typeof cycleSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CreateCycleBody = z.infer<typeof createCycleBodySchema>;
export type SetMilestoneBody = z.infer<typeof setMilestoneBodySchema>;
export type SetCycleStatusBody = z.infer<typeof setCycleStatusBodySchema>;
export type CycleStatus = z.infer<typeof cycleStatusSchema>;
export type MilestoneStage = z.infer<typeof milestoneStageSchema>;
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;
