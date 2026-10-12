import type { AdminUser } from '@cofarm/contracts/admin-users';
import { SYSTEM_ROLES } from '@cofarm/contracts/permissions';

export const LAST_SUPERADMIN_REASON =
  'This is the last active superadmin. Give another account the superadmin role first, or nobody can administer the console.';

export function isSuperadmin(user: AdminUser): boolean {
  return user.roleKeys.includes(SYSTEM_ROLES.superadmin);
}

/**
 * Mirrors the server's safety rail so the console explains it in place instead
 * of letting the operator discover it as a 409.
 */
export function isLastActiveSuperadmin(user: AdminUser, everyone: readonly AdminUser[]): boolean {
  if (!isSuperadmin(user) || user.status !== 'active') return false;

  const active = everyone.filter((row) => row.status === 'active' && isSuperadmin(row));
  return active.length <= 1;
}
