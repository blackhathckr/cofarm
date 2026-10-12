import type { Permission } from '@cofarm/contracts/permissions';

import { forbidden, unauthorized } from './errors.ts';
import { ADMIN_SCOPE, membershipScope, type ProjectScope } from './project-scope.ts';

export type ActorProject = {
  projectId: string;
  code: string;
  name: string;
};

export type Actor = {
  userId: string;
  kind: 'partner' | 'admin';
  name: string;
  mobile: string | null;
  email: string | null;
  isSuperadmin: boolean;
  permissions: ReadonlySet<Permission>;
  projects: readonly ActorProject[];
};

export function assertActor(actor: Actor | null | undefined): Actor {
  if (actor === null || actor === undefined) throw unauthorized();
  return actor;
}

export function actorScope(actor: Actor): ProjectScope {
  if (actor.kind === 'admin') return ADMIN_SCOPE;
  return membershipScope(actor.projects.map((project) => project.projectId));
}

export function hasPermission(actor: Actor, permission: Permission): boolean {
  return actor.isSuperadmin || actor.permissions.has(permission);
}

export function assertPermission(actor: Actor, permission: Permission): void {
  if (!hasPermission(actor, permission)) {
    throw forbidden(`Missing permission: ${permission}`);
  }
}
