import { z } from 'zod';

import {
  dateSchema,
  pageOf,
  paginationQuerySchema,
  timestampSchema,
  uuidSchema,
} from './primitives.ts';

export const milestoneTagSchema = z.enum([
  'land_prep',
  'planting',
  'growth',
  'irrigation',
  'nutrition',
  'disease_mgmt',
  'bunch_formation',
  'harvest',
  'general',
]);

export const updateStatusSchema = z.enum(['draft', 'published']);

/**
 * A photo crosses the wire as a document id only. The client asks the
 * documents module for a short-lived signed URL when it is about to render it.
 */
export const updatePhotoSchema = z.object({
  id: uuidSchema,
  documentId: uuidSchema,
  caption: z.string().nullable(),
  sortOrder: z.number().int().nonnegative(),
});

export const projectUpdateSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  cycleId: uuidSchema.nullable(),
  milestoneTag: milestoneTagSchema,
  title: z.string(),
  description: z.string(),
  activityDate: dateSchema,
  status: updateStatusSchema,
  notifyPartners: z.boolean(),
  publishedAt: timestampSchema.nullable(),
  photoCount: z.number().int().nonnegative(),
  photos: z.array(updatePhotoSchema),
  createdAt: timestampSchema,
});

export const updateSummarySchema = z.object({
  id: uuidSchema,
  cycleId: uuidSchema.nullable(),
  milestoneTag: milestoneTagSchema,
  title: z.string(),
  activityDate: dateSchema,
  status: updateStatusSchema,
  notifyPartners: z.boolean(),
  publishedAt: timestampSchema.nullable(),
  photoCount: z.number().int().nonnegative(),
  /** Null while the update is a draft: nobody has been addressed yet. */
  seenByCount: z.number().int().nonnegative().nullable(),
  recipientCount: z.number().int().nonnegative().nullable(),
});

export const updateFeedItemSchema = z.object({
  id: uuidSchema,
  milestoneTag: milestoneTagSchema,
  title: z.string(),
  description: z.string(),
  activityDate: dateSchema,
  publishedAt: timestampSchema.nullable(),
  photoCount: z.number().int().nonnegative(),
  photoDocumentIds: z.array(uuidSchema),
});

export const MAX_UPDATE_PHOTOS = 20;

export const createUpdateBodySchema = z.object({
  milestoneTag: milestoneTagSchema,
  title: z.string().min(2).max(80),
  description: z.string().min(1).max(4000),
  activityDate: dateSchema,
  cycleId: uuidSchema.optional(),
  photoDocumentIds: z.array(uuidSchema).max(MAX_UPDATE_PHOTOS).default([]),
  notifyPartners: z.boolean().default(false),
  publish: z.boolean().default(false),
});

/** `photoDocumentIds` replaces the whole set in the order given, so one field
 * covers both adding a photo and reordering the existing ones. */
export const editUpdateBodySchema = z.object({
  milestoneTag: milestoneTagSchema.optional(),
  title: z.string().min(2).max(80).optional(),
  description: z.string().min(1).max(4000).optional(),
  activityDate: dateSchema.optional(),
  cycleId: uuidSchema.optional(),
  photoDocumentIds: z.array(uuidSchema).max(MAX_UPDATE_PHOTOS).optional(),
  notifyPartners: z.boolean().optional(),
});

export const listUpdatesQuerySchema = paginationQuerySchema.extend({
  status: updateStatusSchema.optional(),
});

export const updateIdParamsSchema = z.object({
  projectId: uuidSchema,
  updateId: uuidSchema,
});

export const activityEntrySchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  cycleId: uuidSchema.nullable(),
  title: z.string(),
  detail: z.string().nullable(),
  activityDate: dateSchema,
  createdAt: timestampSchema,
});

export const createActivityBodySchema = z.object({
  title: z.string().min(2).max(120),
  detail: z.string().min(1).max(2000).optional(),
  activityDate: dateSchema,
  cycleId: uuidSchema.optional(),
});

export const listFeedQuerySchema = paginationQuerySchema;

export const listActivityQuerySchema = paginationQuerySchema;

export const updatePageSchema = pageOf(updateSummarySchema);
export const updateFeedPageSchema = pageOf(updateFeedItemSchema);
export const activityPageSchema = pageOf(activityEntrySchema);

export type MilestoneTag = z.infer<typeof milestoneTagSchema>;
export type UpdateStatus = z.infer<typeof updateStatusSchema>;
export type UpdatePhoto = z.infer<typeof updatePhotoSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
export type UpdateSummary = z.infer<typeof updateSummarySchema>;
export type UpdateFeedItem = z.infer<typeof updateFeedItemSchema>;
export type CreateUpdateBody = z.infer<typeof createUpdateBodySchema>;
export type EditUpdateBody = z.infer<typeof editUpdateBodySchema>;
export type ListUpdatesQuery = z.infer<typeof listUpdatesQuerySchema>;
export type ListFeedQuery = z.infer<typeof listFeedQuerySchema>;
export type ActivityEntry = z.infer<typeof activityEntrySchema>;
export type CreateActivityBody = z.infer<typeof createActivityBodySchema>;
export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>;
