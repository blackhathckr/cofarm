import { projectIdParamsSchema } from '@cofarm/contracts/projects';
import {
  issueSignatureBodySchema,
  listSignaturesQuerySchema,
  mySignatureRequestSchema,
  remindAllBodySchema,
  remindAllResultSchema,
  signaturePageSchema,
  signatureRequestParamsSchema,
  signatureRequestSchema,
  signSignatureBodySchema,
} from '@cofarm/contracts/signatures';
import { z } from 'zod';

export const signatureSchemas = {
  issue: {
    params: projectIdParamsSchema,
    body: issueSignatureBodySchema,
    response: { 201: signatureRequestSchema },
  },
  list: {
    querystring: listSignaturesQuerySchema,
    response: { 200: signaturePageSchema },
  },
  remind: {
    params: signatureRequestParamsSchema,
    response: { 200: signatureRequestSchema },
  },
  remindAll: {
    body: remindAllBodySchema,
    response: { 200: remindAllResultSchema },
  },
  cancel: {
    params: signatureRequestParamsSchema,
    response: { 200: signatureRequestSchema },
  },
  mine: {
    response: { 200: z.array(mySignatureRequestSchema) },
  },
  sign: {
    params: signatureRequestParamsSchema,
    body: signSignatureBodySchema,
    response: { 200: mySignatureRequestSchema },
  },
} as const;
