import type { CreateRoleBody, UpdateRoleBody } from '@cofarm/contracts/admin-users';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createRole,
  deleteRole,
  fetchPermissionCatalogue,
  fetchRoles,
  updateRole,
} from '../admin-users.api.ts';

const ROLES_KEY = ['admin-roles'];

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => fetchRoles(),
  });
}

export function usePermissionCatalogue() {
  return useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => fetchPermissionCatalogue(),
  });
}

function useRolesInvalidation() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    ]);
  };
}

export function useCreateRole() {
  const invalidate = useRolesInvalidation();

  return useMutation({
    mutationFn: (body: CreateRoleBody) => createRole(body),
    onSuccess: invalidate,
  });
}

export function useUpdateRole() {
  const invalidate = useRolesInvalidation();

  return useMutation({
    mutationFn: ({ roleId, body }: { roleId: string; body: UpdateRoleBody }) =>
      updateRole(roleId, body),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useRolesInvalidation();

  return useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: invalidate,
  });
}
