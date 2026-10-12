/**
 * Permissions are data: roles are composed in the console from these keys, so
 * a new role never needs a release. The superadmin holds all of them by
 * definition rather than by assignment.
 */
export const PERMISSIONS = {
  projectRead: 'project.read',
  projectWrite: 'project.write',
  cycleWrite: 'cycle.write',

  partnerRead: 'partner.read',
  partnerWrite: 'partner.write',

  membershipWrite: 'membership.write',

  misRead: 'mis.read',
  misWrite: 'mis.write',
  misPublish: 'mis.publish',

  updateRead: 'update.read',
  updateWrite: 'update.write',
  updatePublish: 'update.publish',

  expenseRead: 'expense.read',
  expenseWrite: 'expense.write',

  harvestRead: 'harvest.read',
  harvestWrite: 'harvest.write',
  harvestPublish: 'harvest.publish',

  statementRead: 'statement.read',

  documentRead: 'document.read',
  documentWrite: 'document.write',

  signatureRead: 'signature.read',
  signatureWrite: 'signature.write',

  messageRead: 'message.read',
  messageWrite: 'message.write',

  trackingRead: 'tracking.read',
  reminderSend: 'reminder.send',

  userAdmin: 'user.admin',
  roleAdmin: 'role.admin',
  jobsRead: 'jobs.read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS);

export const SYSTEM_ROLES = {
  superadmin: 'superadmin',
  operations: 'operations',
  finance: 'finance',
  partner: 'partner',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const SYSTEM_ROLE_PERMISSIONS: Readonly<Record<string, readonly Permission[]>> = {
  [SYSTEM_ROLES.operations]: [
    PERMISSIONS.projectRead,
    PERMISSIONS.cycleWrite,
    PERMISSIONS.partnerRead,
    PERMISSIONS.misRead,
    PERMISSIONS.misWrite,
    PERMISSIONS.misPublish,
    PERMISSIONS.updateRead,
    PERMISSIONS.updateWrite,
    PERMISSIONS.updatePublish,
    PERMISSIONS.harvestRead,
    PERMISSIONS.harvestWrite,
    PERMISSIONS.documentRead,
    PERMISSIONS.documentWrite,
    PERMISSIONS.messageRead,
    PERMISSIONS.messageWrite,
    PERMISSIONS.trackingRead,
    PERMISSIONS.reminderSend,
  ],
  [SYSTEM_ROLES.finance]: [
    PERMISSIONS.projectRead,
    PERMISSIONS.partnerRead,
    PERMISSIONS.expenseRead,
    PERMISSIONS.expenseWrite,
    PERMISSIONS.harvestRead,
    PERMISSIONS.harvestWrite,
    PERMISSIONS.harvestPublish,
    PERMISSIONS.statementRead,
    PERMISSIONS.documentRead,
  ],
  [SYSTEM_ROLES.partner]: [],
};
