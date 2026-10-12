import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchProfile, updateProfile } from '../account.api.ts';

export function useProfile() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => fetchProfile(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (edits: { name: string; email: string }) =>
      updateProfile({
        name: edits.name.trim(),
        ...(edits.email.trim() === '' ? {} : { email: edits.email.trim() }),
      }),
    onSuccess: (profile) => {
      queryClient.setQueryData(['me'], profile);
    },
  });
}
