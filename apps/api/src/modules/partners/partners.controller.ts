import type {
  CreateMembershipBody,
  CreatePartnerBody,
  ListPartnersQuery,
  Partner,
  PartnerMembership,
  ProjectPartner,
  UpdateMembershipBody,
  UpdatePartnerBody,
} from '@cofarm/contracts/partners';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { assertScope } from '../../lib/project-scope.ts';

import type { PartnerPage } from './partners.service.ts';
import * as service from './partners.service.ts';

type PartnerParams = { partnerId: string };
type MembershipParams = PartnerParams & { membershipId: string };
type ProjectParams = { projectId: string };

export async function list(
  request: FastifyRequest<{ Querystring: ListPartnersQuery }>,
): Promise<PartnerPage> {
  return service.listPartners(assertScope(request.scope), request.query);
}

export async function get(request: FastifyRequest<{ Params: PartnerParams }>): Promise<Partner> {
  return service.getPartner(assertScope(request.scope), request.params.partnerId);
}

export async function create(
  request: FastifyRequest<{ Body: CreatePartnerBody }>,
  reply: FastifyReply,
): Promise<Partner> {
  const partner = await service.createPartner(request.body);
  void reply.status(201);
  return partner;
}

export async function update(
  request: FastifyRequest<{ Params: PartnerParams; Body: UpdatePartnerBody }>,
): Promise<Partner> {
  return service.updatePartner(request.params.partnerId, request.body);
}

export async function createMembership(
  request: FastifyRequest<{ Params: PartnerParams; Body: CreateMembershipBody }>,
  reply: FastifyReply,
): Promise<PartnerMembership> {
  const membership = await service.addMembership(request.params.partnerId, request.body);
  void reply.status(201);
  return membership;
}

export async function updateMembership(
  request: FastifyRequest<{ Params: MembershipParams; Body: UpdateMembershipBody }>,
): Promise<PartnerMembership> {
  return service.updateMembership(
    request.params.partnerId,
    request.params.membershipId,
    request.body,
  );
}

export async function listProjectPartners(
  request: FastifyRequest<{ Params: ProjectParams }>,
): Promise<ProjectPartner[]> {
  return service.listProjectPartners(assertScope(request.scope), request.params.projectId);
}
