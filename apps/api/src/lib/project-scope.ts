import { notFound, unauthorized } from './errors.ts';

export type ProjectScope = {
  /** Empty for a partner with no active membership. Ignored when allProjects. */
  readonly projectIds: readonly string[];
  /** An admin's reach is every project, so no id list is carried. */
  readonly allProjects: boolean;
};

export const ADMIN_SCOPE: ProjectScope = { projectIds: [], allProjects: true };

export function membershipScope(projectIds: readonly string[]): ProjectScope {
  return { projectIds, allProjects: false };
}

export function assertScope(scope: ProjectScope | null | undefined): ProjectScope {
  if (scope === null || scope === undefined) {
    throw unauthorized('Request has no resolved project scope');
  }
  return scope;
}

export function isInScope(scope: ProjectScope, projectId: string): boolean {
  return scope.allProjects || scope.projectIds.includes(projectId);
}

export function assertInScope(scope: ProjectScope, projectId: string, what = 'Project'): void {
  if (!isInScope(scope, projectId)) {
    throw notFound(what);
  }
}
