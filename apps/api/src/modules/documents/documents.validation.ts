import {
  documentIdParamsSchema,
  documentPageSchema,
  documentSchema,
  downloadTicketSchema,
  listDocumentsQuerySchema,
  uploadTicketSchema,
  uploadUrlBodySchema,
} from '@cofarm/contracts/documents';
import { okSchema } from '@cofarm/contracts/primitives';

export const documentSchemas = {
  uploadUrl: {
    body: uploadUrlBodySchema,
    response: { 201: uploadTicketSchema },
  },
  confirm: {
    params: documentIdParamsSchema,
    response: { 200: documentSchema },
  },
  downloadUrl: {
    params: documentIdParamsSchema,
    response: { 200: downloadTicketSchema },
  },
  list: {
    querystring: listDocumentsQuerySchema,
    response: { 200: documentPageSchema },
  },
  remove: {
    params: documentIdParamsSchema,
    response: { 200: okSchema },
  },
} as const;
