import { okSchema } from '@cofarm/contracts/primitives';
import { projectIdParamsSchema } from '@cofarm/contracts/projects';
import {
  activityEntrySchema,
  activityPageSchema,
  createActivityBodySchema,
  createUpdateBodySchema,
  editUpdateBodySchema,
  listActivityQuerySchema,
  listFeedQuerySchema,
  listUpdatesQuerySchema,
  projectUpdateSchema,
  updateFeedPageSchema,
  updateIdParamsSchema,
  updatePageSchema,
} from '@cofarm/contracts/updates';

export const updateSchemas = {
  create: {
    params: projectIdParamsSchema,
    body: createUpdateBodySchema,
    response: { 201: projectUpdateSchema },
  },
  edit: {
    params: updateIdParamsSchema,
    body: editUpdateBodySchema,
    response: { 200: projectUpdateSchema },
  },
  unpublish: {
    params: updateIdParamsSchema,
    response: { 200: projectUpdateSchema },
  },
  publish: {
    params: updateIdParamsSchema,
    response: { 200: projectUpdateSchema },
  },
  remove: {
    params: updateIdParamsSchema,
    response: { 200: okSchema },
  },
  list: {
    params: projectIdParamsSchema,
    querystring: listUpdatesQuerySchema,
    response: { 200: updatePageSchema },
  },
  feed: {
    params: projectIdParamsSchema,
    querystring: listFeedQuerySchema,
    response: { 200: updateFeedPageSchema },
  },
  get: {
    params: updateIdParamsSchema,
    response: { 200: projectUpdateSchema },
  },
  createActivity: {
    params: projectIdParamsSchema,
    body: createActivityBodySchema,
    response: { 201: activityEntrySchema },
  },
  listActivity: {
    params: projectIdParamsSchema,
    querystring: listActivityQuerySchema,
    response: { 200: activityPageSchema },
  },
} as const;
