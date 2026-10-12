import {
  partnerMembershipSchema,
  partnerPageSchema,
  partnerSchema,
  type CreateMembershipBody,
  type CreatePartnerBody,
  type ListPartnersQuery,
  type UpdateMembershipBody,
  type UpdatePartnerBody,
} from '@cofarm/contracts/partners';

import { request } from '@/lib/api-client.ts';

export function fetchPartners(query: Partial<ListPartnersQuery> = {}) {
  const params = new URLSearchParams();
  if (query.search !== undefined && query.search !== '') params.set('search', query.search);
  if (query.projectId !== undefined) params.set('projectId', query.projectId);
  if (query.status !== undefined) params.set('status', query.status);
  if (query.cursor !== undefined) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 20));

  return request(`/v1/partners?${params.toString()}`, partnerPageSchema);
}

export function fetchPartner(partnerId: string) {
  return request(`/v1/partners/${partnerId}`, partnerSchema);
}

export function createPartner(body: CreatePartnerBody) {
  return request('/v1/partners', partnerSchema, { method: 'POST', body });
}

export function updatePartner(partnerId: string, body: UpdatePartnerBody) {
  return request(`/v1/partners/${partnerId}`, partnerSchema, { method: 'PATCH', body });
}

export function createMembership(partnerId: string, body: CreateMembershipBody) {
  return request(`/v1/partners/${partnerId}/memberships`, partnerMembershipSchema, {
    method: 'POST',
    body,
  });
}

export function updateMembership(
  partnerId: string,
  membershipId: string,
  body: UpdateMembershipBody,
) {
  return request(`/v1/partners/${partnerId}/memberships/${membershipId}`, partnerMembershipSchema, {
    method: 'PATCH',
    body,
  });
}
