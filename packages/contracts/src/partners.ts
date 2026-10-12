import { z } from 'zod';

import {
  basisPointsSchema,
  dateSchema,
  mobileSchema,
  paiseSchema,
  pageOf,
  paginationQuerySchema,
  projectCodeSchema,
  timestampSchema,
  uuidSchema,
} from './primitives.ts';

export const partnerStatusSchema = z.enum(['active', 'suspended', 'deleted']);
export const membershipStatusSchema = z.enum(['active', 'exited']);
export const agreementStatusSchema = z.enum(['not_sent', 'sent', 'signed']);
export const shareBasisSchema = z.enum(['pro_rata_contribution', 'fixed_pct']);

/**
 * `onboarding` is a provisioned account with no project yet, `sign_pending` one
 * whose agreement is still unsigned on at least one active membership.
 */
export const partnerBadgeSchema = z.enum(['active', 'sign_pending', 'onboarding']);

export const partnerMembershipSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectCode: projectCodeSchema,
  projectName: z.string(),
  contributionPaise: paiseSchema,
  shareBasis: shareBasisSchema,
  sharePctBps: basisPointsSchema.nullable(),
  agreementStatus: agreementStatusSchema,
  agreementSignedAt: timestampSchema.nullable(),
  status: membershipStatusSchema,
  joinedAt: dateSchema,
  exitedAt: dateSchema.nullable(),
});

export const partnerSummarySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  mobile: z.string().nullable(),
  email: z.string().nullable(),
  status: partnerStatusSchema,
  initials: z.string(),
  totalContributionPaise: paiseSchema,
  projectCodes: z.array(projectCodeSchema),
  badge: partnerBadgeSchema,
});

export const partnerSchema = partnerSummarySchema.extend({
  memberships: z.array(partnerMembershipSchema),
  roleKeys: z.array(z.string()),
  createdAt: timestampSchema,
});

export const projectPartnerSchema = z.object({
  membershipId: uuidSchema,
  partnerId: uuidSchema,
  name: z.string(),
  mobile: z.string().nullable(),
  initials: z.string(),
  contributionPaise: paiseSchema,
  shareBasis: shareBasisSchema,
  sharePctBps: basisPointsSchema.nullable(),
  agreementStatus: agreementStatusSchema,
  status: membershipStatusSchema,
  joinedAt: dateSchema,
});

export const createPartnerBodySchema = z.object({
  name: z.string().min(2).max(120),
  mobile: mobileSchema,
  email: z.email().max(160).optional(),
});

export const updatePartnerBodySchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.email().max(160).optional(),
  status: partnerStatusSchema.optional(),
});

export const createMembershipBodySchema = z.object({
  projectId: uuidSchema,
  contributionPaise: paiseSchema,
  shareBasis: shareBasisSchema.default('pro_rata_contribution'),
  sharePctBps: basisPointsSchema.optional(),
  joinedAt: dateSchema,
});

export const updateMembershipBodySchema = z.object({
  contributionPaise: paiseSchema.optional(),
  shareBasis: shareBasisSchema.optional(),
  sharePctBps: basisPointsSchema.optional(),
  agreementStatus: agreementStatusSchema.optional(),
  status: membershipStatusSchema.optional(),
  exitedAt: dateSchema.optional(),
});

export const listPartnersQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(80).optional(),
  projectId: uuidSchema.optional(),
  status: partnerStatusSchema.optional(),
});

export const partnerIdParamsSchema = z.object({ partnerId: uuidSchema });

export const partnerMembershipParamsSchema = partnerIdParamsSchema.extend({
  membershipId: uuidSchema,
});

export const partnerPageSchema = pageOf(partnerSummarySchema);

export type PartnerStatus = z.infer<typeof partnerStatusSchema>;
export type PartnerBadge = z.infer<typeof partnerBadgeSchema>;
export type Partner = z.infer<typeof partnerSchema>;
export type PartnerSummary = z.infer<typeof partnerSummarySchema>;
export type PartnerMembership = z.infer<typeof partnerMembershipSchema>;
export type ProjectPartner = z.infer<typeof projectPartnerSchema>;
export type CreatePartnerBody = z.infer<typeof createPartnerBodySchema>;
export type UpdatePartnerBody = z.infer<typeof updatePartnerBodySchema>;
export type CreateMembershipBody = z.infer<typeof createMembershipBodySchema>;
export type UpdateMembershipBody = z.infer<typeof updateMembershipBodySchema>;
export type ListPartnersQuery = z.infer<typeof listPartnersQuerySchema>;

export type ShareBasis = z.infer<typeof shareBasisSchema>;
export type AgreementStatus = z.infer<typeof agreementStatusSchema>;
