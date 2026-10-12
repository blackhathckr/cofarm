import type {
  AccountDeletionResult,
  AccountMembership,
  AccountProfile,
  DeleteAccountBody,
  DeletionPolicy,
  RetainedRecord,
  UpdateProfileBody,
} from '@cofarm/contracts/account';
import { ERROR_CODES } from '@cofarm/contracts/errors';
import { SYSTEM_ROLES } from '@cofarm/contracts/permissions';

import { AppError, badRequest, conflict, notFound } from '../../lib/errors.ts';
import { indiaToday } from '../../lib/india-date.ts';
import { verifyPassword } from '../../lib/password.ts';
import { pickDefined } from '../../lib/patch.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';
import * as adminUsers from '../admin-users/admin-users.service.ts';
import * as audit from '../audit/audit.service.ts';
import * as partners from '../partners/partners.service.ts';

import * as repo from './account.repo.ts';

const ADMIN_PAGE_LIMIT = 100;
const MAX_PAGES = 25;

const CLEARED: readonly string[] = [
  'Your mobile number and email',
  'Your password and two-factor setup',
  'Your devices and notifications',
  'Every signed-in session',
];

const RETAINED: readonly RetainedRecord[] = [
  { record: 'Your name', reason: 'It appears on your statements and signed agreements.' },
  { record: 'Your projects', reason: 'Your place in each project is marked as exited.' },
  { record: 'Money records', reason: 'Contributions, costs and payouts, required for tax.' },
  { record: 'Statements', reason: 'Every statement already issued to you.' },
  { record: 'Signed agreements', reason: 'Proof of what you agreed to.' },
];

const DELETION_NOTE = 'Your money records stay, with your contact details stripped out.';

export type AccountCaller = {
  userId: string;
  kind: 'partner' | 'admin';
  isSuperadmin: boolean;
};

export async function getProfile(
  scope: ProjectScope,
  caller: AccountCaller,
): Promise<AccountProfile> {
  const user = await repo.findUser(caller.userId);
  if (user === null) throw notFound('Account');

  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    kind: user.kind,
    twoFactorEnabled: user.totpEnabledAt !== null,
    memberships: await membershipsFor(scope, caller),
  };
}

export async function updateProfile(
  scope: ProjectScope,
  caller: AccountCaller,
  input: UpdateProfileBody,
): Promise<AccountProfile> {
  if (input.name === undefined && input.email === undefined) {
    throw badRequest('Provide a name or an email to change');
  }

  const before = await repo.findUser(caller.userId);
  if (before === null) throw notFound('Account');

  if (input.email !== undefined && input.email !== before.email) {
    const taken = await repo.findOtherUserIdByEmail(caller.userId, input.email);
    if (taken !== null) {
      throw conflict(ERROR_CODES.emailTaken, `${input.email} already belongs to an account`);
    }
  }

  const updated = await repo.updateUser(
    caller.userId,
    pickDefined({ name: input.name, email: input.email }),
  );
  if (updated === null) throw notFound('Account');

  await audit.record({
    action: 'account.updated',
    entityTable: 'users',
    entityId: caller.userId,
    projectId: null,
    before,
    after: updated,
  });

  return getProfile(scope, caller);
}

/**
 * In-app deletion, required by both app stores. The user row is anonymised and
 * the login identity freed; nothing financial is removed. Memberships are
 * exited before the row is anonymised, because a deleted user no longer
 * resolves as a partner and its memberships would become unreachable.
 */
export async function deleteAccount(
  scope: ProjectScope,
  caller: AccountCaller,
  input: DeleteAccountBody,
): Promise<AccountDeletionResult> {
  const before = await repo.findUser(caller.userId);
  if (before === null) throw notFound('Account');

  if (caller.kind === 'admin') {
    await assertOwnPassword(before.passwordHash, input.password);
  }
  if (caller.isSuperadmin) {
    await assertAnotherSuperadminRemains(caller.userId);
  }

  const membershipsExited = await exitMemberships(scope, caller);
  const now = new Date();

  const anonymised = await repo.updateUser(caller.userId, {
    status: 'deleted',
    deletedAt: now,
    mobile: null,
    email: null,
    passwordHash: null,
    totpSecret: null,
    totpEnabledAt: null,
  });
  if (anonymised === null) throw notFound('Account');

  const [sessionsRevoked, devicesRemoved] = await Promise.all([
    repo.revokeRefreshTokens(caller.userId, now),
    repo.deleteDeviceTokens(caller.userId),
  ]);

  await audit.record({
    action: 'account.deleted',
    entityTable: 'users',
    entityId: caller.userId,
    projectId: null,
    before,
    after: anonymised,
  });

  return {
    userId: caller.userId,
    deletedAt: now.toISOString(),
    cleared: [...CLEARED],
    retained: [...RETAINED],
    membershipsExited,
    sessionsRevoked,
    devicesRemoved,
    note: DELETION_NOTE,
  };
}

export function deletionPolicy(): DeletionPolicy {
  return {
    summary: "This can't be undone. Here's exactly what goes and what stays.",
    cleared: [...CLEARED],
    retained: [...RETAINED],
    isReversible: false,
    reRegistration:
      'Your number is freed up. If you join again later it starts as a fresh account.',
    note: DELETION_NOTE,
  };
}

async function membershipsFor(
  scope: ProjectScope,
  caller: AccountCaller,
): Promise<AccountMembership[]> {
  if (caller.kind !== 'partner') return [];

  const partner = await partners.getPartner(scope, caller.userId);
  return partner.memberships
    .filter((membership) => membership.status === 'active')
    .map((membership) => ({
      projectId: membership.projectId,
      projectCode: membership.projectCode,
      projectName: membership.projectName,
      contributionPaise: membership.contributionPaise,
      joinedAt: membership.joinedAt,
    }));
}

async function exitMemberships(scope: ProjectScope, caller: AccountCaller): Promise<number> {
  if (caller.kind !== 'partner') return 0;

  const partner = await partners.getPartner(scope, caller.userId);
  const active = partner.memberships.filter((membership) => membership.status === 'active');
  const exitedAt = indiaToday();

  for (const membership of active) {
    await partners.updateMembership(caller.userId, membership.id, {
      status: 'exited',
      exitedAt,
    });
  }

  return active.length;
}

/**
 * The console cannot grant itself back in, so the last account holding the
 * superadmin role may not delete itself either.
 */
async function assertAnotherSuperadminRemains(userId: string): Promise<void> {
  let cursor: string | undefined;

  for (let attempt = 0; attempt < MAX_PAGES; attempt += 1) {
    const page = await adminUsers.listAdminUsers({
      limit: ADMIN_PAGE_LIMIT,
      status: 'active',
      ...(cursor === undefined ? {} : { cursor }),
    });

    const other = page.items.some(
      (user) => user.id !== userId && user.roleKeys.includes(SYSTEM_ROLES.superadmin),
    );
    if (other) return;
    if (page.nextCursor === null) break;
    cursor = page.nextCursor;
  }

  throw conflict(
    ERROR_CODES.lastSuperadmin,
    'This is the last active superadmin',
    'Give another account the superadmin role before deleting this one.',
  );
}

async function assertOwnPassword(
  storedHash: string | null,
  candidate: string | undefined,
): Promise<void> {
  if (candidate === undefined) {
    throw badRequest('Confirm your password to delete the account');
  }
  if (storedHash === null || !(await verifyPassword(candidate, storedHash))) {
    throw new AppError(ERROR_CODES.credentialsInvalid, 401, 'That password is wrong');
  }
}
