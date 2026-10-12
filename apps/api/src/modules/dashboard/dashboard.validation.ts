import { adminDashboardSchema, partnerDashboardSchema } from '@cofarm/contracts/dashboard';

export const dashboardSchemas = {
  admin: {
    response: { 200: adminDashboardSchema },
  },
  partner: {
    response: { 200: partnerDashboardSchema },
  },
} as const;
