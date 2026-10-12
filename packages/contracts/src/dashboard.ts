import { z } from 'zod';

import { notificationSchema } from './notifications.ts';
import {
  basisPointsSchema,
  dateSchema,
  paiseSchema,
  projectCodeSchema,
  uuidSchema,
} from './primitives.ts';
import { milestoneStageSchema } from './projects.ts';

/**
 * `due` is past its deadline, `upcoming` is inside it, `reminder` is a nudge
 * with no deadline at all — a partner who has not opened what was sent.
 */
export const taskUrgencySchema = z.enum(['due', 'upcoming', 'reminder']);

export const dashboardTaskKindSchema = z.enum([
  'mis_missing',
  'mis_unpublished',
  'mis_unread',
  'unsigned_agreements',
  'harvest_draft',
]);

export const dashboardTaskSchema = z.object({
  kind: dashboardTaskKindSchema,
  projectId: uuidSchema,
  projectCode: projectCodeSchema,
  title: z.string(),
  detail: z.string(),
  urgency: taskUrgencySchema,
  dueLabel: z.string(),
});

export const adminDashboardCountsSchema = z.object({
  activePartners: z.number().int().nonnegative(),
  activeProjects: z.number().int().nonnegative(),
  /** Acres as a decimal string, summed as integers: a float would drift. */
  totalAcreageAcres: z.string(),
  pendingActions: z.number().int().nonnegative(),
});

export const adminDashboardSchema = z.object({
  counts: adminDashboardCountsSchema,
  tasks: z.array(dashboardTaskSchema),
  /** Kinds whose owning module is not wired in yet; no task is raised for them. */
  unavailableTaskKinds: z.array(dashboardTaskKindSchema),
});

export const partnerCycleSchema = z.object({
  id: uuidSchema,
  cycleNo: z.number().int().positive(),
  progressBps: basisPointsSchema,
  activeStage: milestoneStageSchema.nullable(),
  activeStageLabel: z.string().nullable(),
  expectedHarvestFrom: dateSchema.nullable(),
  expectedHarvestTo: dateSchema.nullable(),
});

export const partnerProjectCardSchema = z.object({
  projectId: uuidSchema,
  projectCode: projectCodeSchema,
  projectName: z.string(),
  variety: z.string(),
  contributionPaise: paiseSchema,
  joinedAt: dateSchema,
  cycle: partnerCycleSchema.nullable(),
  unreadNotifications: z.number().int().nonnegative(),
});

export const partnerDashboardSchema = z.object({
  projects: z.array(partnerProjectCardSchema),
  /** The most recent unread notification, shown across the top of the home tab. */
  banner: notificationSchema.nullable(),
  unreadNotifications: z.number().int().nonnegative(),
  pendingActions: z.number().int().nonnegative(),
});

export type TaskUrgency = z.infer<typeof taskUrgencySchema>;
export type DashboardTaskKind = z.infer<typeof dashboardTaskKindSchema>;
export type DashboardTask = z.infer<typeof dashboardTaskSchema>;
export type AdminDashboardCounts = z.infer<typeof adminDashboardCountsSchema>;
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
export type PartnerCycle = z.infer<typeof partnerCycleSchema>;
export type PartnerProjectCard = z.infer<typeof partnerProjectCardSchema>;
export type PartnerDashboard = z.infer<typeof partnerDashboardSchema>;
