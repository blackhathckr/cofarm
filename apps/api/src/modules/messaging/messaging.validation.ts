import {
  adminThreadPageSchema,
  adminThreadSummarySchema,
  listThreadsQuerySchema,
  messageSchema,
  sendMessageBodySchema,
  threadIdParamsSchema,
  threadMessagesQuerySchema,
  threadReadResultSchema,
  threadSchema,
  threadSummarySchema,
} from '@cofarm/contracts/messaging';
import { projectIdParamsSchema } from '@cofarm/contracts/projects';
import { z } from 'zod';

export const messagingSchemas = {
  myThreads: {
    response: { 200: z.array(threadSummarySchema) },
  },
  myThread: {
    params: projectIdParamsSchema,
    querystring: threadMessagesQuerySchema,
    response: { 200: threadSchema },
  },
  sendMyMessage: {
    params: projectIdParamsSchema,
    body: sendMessageBodySchema,
    response: { 201: messageSchema },
  },
  readMyThread: {
    params: projectIdParamsSchema,
    response: { 200: threadReadResultSchema },
  },
  list: {
    querystring: listThreadsQuerySchema,
    response: { 200: adminThreadPageSchema },
  },
  get: {
    params: threadIdParamsSchema,
    querystring: threadMessagesQuerySchema,
    response: { 200: threadSchema },
  },
  reply: {
    params: threadIdParamsSchema,
    body: sendMessageBodySchema,
    response: { 201: messageSchema },
  },
  resolve: {
    params: threadIdParamsSchema,
    response: { 200: adminThreadSummarySchema },
  },
  reopen: {
    params: threadIdParamsSchema,
    response: { 200: adminThreadSummarySchema },
  },
} as const;
