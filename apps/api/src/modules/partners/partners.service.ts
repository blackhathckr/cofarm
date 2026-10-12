import { ERROR_CODES } from '@cofarm/contracts/errors';
import type {
  CreateMembershipBody,
  CreatePartnerBody,
  ListPartnersQuery,
  Partner,
  PartnerBadge,
  PartnerMembership,
  PartnerSummary,
  ProjectPartner,
  UpdateMembershipBody,
  UpdatePartnerBody,
} from '@cofarm/contracts/partners';
import { SYSTEM_ROLES } from '@cofarm/contracts/permissions';
import { toPaiseString } from '@cofarm/contracts/primitives';
import { newId } from '@cofarm/core/id';
import { initialsOf } from '@cofarm/core/name';
import { sumPaise } from '@cofarm/core/money';

import { badRequest, conflict, notFound } from '../../lib/errors.ts';
import { indiaToday } from '../../lib/india-date.ts';
import { pickDefined } from '../../lib/patch.ts';
import { ADMIN_SCOPE, type ProjectScope } from '../../lib/project-scope.ts';
import * as audit from '../audit/audit.service.ts';
import * as repo from './partners.repo.ts';

export type PartnerPage = {
  items: PartnerSummary[];
  nextCursor: string | null;
};

export async function listPartners(
  scope: ProjectScope,
  query: ListPartnersQuery,
): Promise<PartnerPage> {
  const rows = await repo.listPartners(scope, {
    search: query.search,
    projectId: query.projectId,
    status: query.status,
    cursor: query.cursor,
    limit: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    items: page.map((row) => ({
      id: row.id,
      name: row.name,
      mobile: row.mobile,
      email: row.email,
      status: row.status,
      initials: initialsOf(row.name),
      totalContributionPaise: toPaiseString(BigInt(row.totalContributionPaise ?? '0')),
      projectCodes: row.projectCodes,
      badge: badgeOf(row.activeMemberships, row.pendingAgreements),
    })),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function getPartner(scope: ProjectScope, partnerId: string): Promise<Partner> {
  const row = await repo.findPartner(partnerId);
  if (row === null) throw notFound('Partner');

  const [membershipRows, roleKeys] = await Promise.all([
    repo.membershipsForPartner(scope, partnerId),
    repo.roleKeysForPartner(partnerId),
  ]);

  const active = membershipRows.filter((membership) => membership.status === 'active');
  const unsigned = active.filter((membership) => membership.agreementStatus !== 'signed');

  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    status: row.status,
    initials: initialsOf(row.name),
    totalContributionPaise: toPaiseString(
      sumPaise(active.map((membership) => membership.contributionPaise)),
    ),
    projectCodes: active.map((membership) => membership.projectCode),
    badge: badgeOf(active.length, unsigned.length),
    memberships: membershipRows.map(toMembershipDto),
    roleKeys,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createPartner(input: CreatePartnerBody): Promise<Partner> {
  const existing = await repo.findUserByMobile(input.mobile);
  if (existing !== null) {
    throw conflict(
      ERROR_CODES.partnerMobileTaken,
      `Mobile ${input.mobile} already belongs to an account`,
    );
  }

  const roleId = await repo.findRoleIdByKey(SYSTEM_ROLES.partner);
  if (roleId === null) {
    throw new Error(`System role ${SYSTEM_ROLES.partner} is not provisioned`);
  }

  const created = await repo.insertPartner({
    id: newId(),
    kind: 'partner',
    name: input.name,
    mobile: input.mobile,
    email: input.email ?? null,
    status: 'active',
  });
  await repo.assignRole(created.id, roleId);

  await audit.record({
    action: 'partner.created',
    entityTable: 'users',
    entityId: created.id,
    projectId: null,
    after: created,
  });

  return getPartner(ADMIN_SCOPE, created.id);
}

export async function updatePartner(partnerId: string, input: UpdatePartnerBody): Promise<Partner> {
  const before = await repo.findPartner(partnerId);
  if (before === null) throw notFound('Partner');

  const updated = await repo.updatePartner(
    partnerId,
    pickDefined({ name: input.name, email: input.email, status: input.status }),
  );
  if (updated === null) throw notFound('Partner');

  await audit.record({
    action: 'partner.updated',
    entityTable: 'users',
    entityId: partnerId,
    projectId: null,
    before,
    after: updated,
  });

  return getPartner(ADMIN_SCOPE, partnerId);
}

export async function addMembership(
  partnerId: string,
  input: CreateMembershipBody,
): Promise<PartnerMembership> {
  const partner = await repo.findPartner(partnerId);
  if (partner === null) throw notFound('Partner');

  if (input.shareBasis === 'fixed_pct' && input.sharePctBps === undefined) {
    throw badRequest('A fixed share basis needs sharePctBps');
  }

  const project = await repo.findProjectHeader(ADMIN_SCOPE, input.projectId);
  if (project === null) throw notFound('Project');

  const existing = await repo.findMembershipForPartnerProject(
    ADMIN_SCOPE,
    partnerId,
    input.projectId,
  );
  if (existing !== null) {
    throw conflict(
      ERROR_CODES.membershipExists,
      `${partner.name} is already mapped to project ${project.code}`,
    );
  }

  const created = await repo.insertMembership({
    id: newId(),
    projectId: input.projectId,
    userId: partnerId,
    contributionPaise: BigInt(input.contributionPaise),
    shareBasis: input.shareBasis,
    sharePctBps: input.sharePctBps ?? null,
    status: 'active',
    joinedAt: input.joinedAt,
  });

  await audit.record({
    action: 'membership.created',
    entityTable: 'memberships',
    entityId: created.id,
    projectId: created.projectId,
    after: created,
  });

  return membershipDto(created.id);
}

function membershipPatch(
  input: UpdateMembershipBody,
  agreementSignedAt: Date | null,
): Parameters<typeof repo.updateMembership>[1] {
  return {
    ...pickDefined({
      contributionPaise:
        input.contributionPaise === undefined ? undefined : BigInt(input.contributionPaise),
      shareBasis: input.shareBasis,
      sharePctBps: input.sharePctBps,
      agreementStatus: input.agreementStatus,
      status: input.status,
    }),
    ...(input.agreementStatus === 'signed' && agreementSignedAt === null
      ? { agreementSignedAt: new Date() }
      : {}),
    ...(input.status === 'exited' ? { exitedAt: input.exitedAt ?? indiaToday() } : {}),
    ...(input.status === 'active' ? { exitedAt: null } : {}),
  };
}

export async function updateMembership(
  partnerId: string,
  membershipId: string,
  input: UpdateMembershipBody,
): Promise<PartnerMembership> {
  const before = await repo.findMembership(ADMIN_SCOPE, membershipId);
  if (before === null) throw notFound('Membership');
  if (before.userId !== partnerId) throw notFound('Membership');

  const shareBasis = input.shareBasis ?? before.shareBasis;
  const sharePctBps = input.sharePctBps ?? before.sharePctBps;
  if (shareBasis === 'fixed_pct' && sharePctBps === null) {
    throw badRequest('A fixed share basis needs sharePctBps');
  }

  const exiting = input.status === 'exited';
  const updated = await repo.updateMembership(
    membershipId,
    membershipPatch(input, before.agreementSignedAt),
  );
  if (updated === null) throw notFound('Membership');

  await audit.record({
    action: exiting ? 'membership.exited' : 'membership.updated',
    entityTable: 'memberships',
    entityId: membershipId,
    projectId: updated.projectId,
    before,
    after: updated,
  });

  return membershipDto(membershipId);
}

/** Distinct active partners in reach, counted in one query. */
export function countActiveInScope(scope: ProjectScope): Promise<number> {
  return repo.countActiveInScope(scope);
}

export async function listProjectPartners(
  scope: ProjectScope,
  projectId: string,
): Promise<ProjectPartner[]> {
  const project = await repo.findProjectHeader(scope, projectId);
  if (project === null) throw notFound('Project');

  const rows = await repo.partnersForProject(scope, projectId);
  return rows.map((row) => ({
    membershipId: row.membershipId,
    partnerId: row.partnerId,
    name: row.name,
    mobile: row.mobile,
    initials: initialsOf(row.name),
    contributionPaise: toPaiseString(row.contributionPaise),
    shareBasis: row.shareBasis,
    sharePctBps: row.sharePctBps,
    agreementStatus: row.agreementStatus,
    status: row.status,
    joinedAt: row.joinedAt,
  }));
}

async function membershipDto(membershipId: string): Promise<PartnerMembership> {
  const detail = await repo.findMembershipDetail(ADMIN_SCOPE, membershipId);
  if (detail === null) throw notFound('Membership');
  return toMembershipDto(detail);
}

function toMembershipDto(row: repo.PartnerMembershipRow): PartnerMembership {
  return {
    id: row.id,
    projectId: row.projectId,
    projectCode: row.projectCode,
    projectName: row.projectName,
    contributionPaise: toPaiseString(row.contributionPaise),
    shareBasis: row.shareBasis,
    sharePctBps: row.sharePctBps,
    agreementStatus: row.agreementStatus,
    agreementSignedAt: row.agreementSignedAt?.toISOString() ?? null,
    status: row.status,
    joinedAt: row.joinedAt,
    exitedAt: row.exitedAt,
  };
}

function badgeOf(activeMemberships: number, unsignedAgreements: number): PartnerBadge {
  if (activeMemberships === 0) return 'onboarding';
  if (unsignedAgreements > 0) return 'sign_pending';
  return 'active';
}
