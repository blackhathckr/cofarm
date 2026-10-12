import type {
  CreateAdminUserBody,
  ListAdminUsersQuery,
  SetAdminUserPasswordBody,
  SetAdminUserRolesBody,
  UpdateAdminUserBody,
} from '@cofarm/contracts/admin-users';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCursorList } from '@/lib/cursor-list.ts';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  setAdminUserPassword,
  setAdminUserRoles,
  updateAdminUser,
} from '../admin-users.api.ts';

const USERS_KEY = ['admin-users'];

export function useAdminUsers(query: Partial<ListAdminUsersQuery> = {}) {
  return useCursorList({
    queryKey: [...USERS_KEY, query],
    fetchPage: (cursor) => fetchAdminUsers({ ...query, cursor }),
  });
}

function useUsersInvalidation() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: USERS_KEY }),
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] }),
    ]);
  };
}

export function useCreateAdminUser() {
  const invalidate = useUsersInvalidation();

  return useMutation({
    mutationFn: (body: CreateAdminUserBody) => createAdminUser(body),
    onSuccess: invalidate,
  });
}

export function useUpdateAdminUser() {
  const invalidate = useUsersInvalidation();

  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: UpdateAdminUserBody }) =>
      updateAdminUser(userId, body),
    onSuccess: invalidate,
  });
}

export function useSetAdminUserRoles() {
  const invalidate = useUsersInvalidation();

  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: SetAdminUserRolesBody }) =>
      setAdminUserRoles(userId, body),
    onSuccess: invalidate,
  });
}

export function useSetAdminUserPassword() {
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: SetAdminUserPasswordBody }) =>
      setAdminUserPassword(userId, body),
  });
}

export function useDeleteAdminUser() {
  const invalidate = useUsersInvalidation();

  return useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: invalidate,
  });
}
