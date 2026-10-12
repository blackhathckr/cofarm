import {
  entityReceiptsSchema,
  receiptsQuerySchema,
  remindUnreadBodySchema,
  remindUnreadResultSchema,
} from '@cofarm/contracts/tracking';

export const trackingSchemas = {
  receipts: {
    querystring: receiptsQuerySchema,
    response: { 200: entityReceiptsSchema },
  },
  remindAll: {
    body: remindUnreadBodySchema,
    response: { 200: remindUnreadResultSchema },
  },
} as const;
