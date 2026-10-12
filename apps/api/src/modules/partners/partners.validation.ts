import {
  createMembershipBodySchema,
  createPartnerBodySchema,
  listPartnersQuerySchema,
  partnerIdParamsSchema,
  partnerMembershipParamsSchema,
  partnerMembershipSchema,
  partnerPageSchema,
  partnerSchema,
  projectPartnerSchema,
  updateMembershipBodySchema,
  updatePartnerBodySchema,
} from '@cofarm/contracts/partners';
import { projectIdParamsSchema } from '@cofarm/contracts/projects';
import { z } from 'zod';

export const partnerSchemas = {
  list: {
    querystring: listPartnersQuerySchema,
    response: { 200: partnerPageSchema },
  },
  get: {
    params: partnerIdParamsSchema,
    response: { 200: partnerSchema },
  },
  create: {
    body: createPartnerBodySchema,
    response: { 201: partnerSchema },
  },
  update: {
    params: partnerIdParamsSchema,
    body: updatePartnerBodySchema,
    response: { 200: partnerSchema },
  },
  createMembership: {
    params: partnerIdParamsSchema,
    body: createMembershipBodySchema,
    response: { 201: partnerMembershipSchema },
  },
  updateMembership: {
    params: partnerMembershipParamsSchema,
    body: updateMembershipBodySchema,
    response: { 200: partnerMembershipSchema },
  },
  listProjectPartners: {
    params: projectIdParamsSchema,
    response: { 200: z.array(projectPartnerSchema) },
  },
} as const;
