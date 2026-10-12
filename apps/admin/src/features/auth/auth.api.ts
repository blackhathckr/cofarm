import { authUserSchema, sessionSchema } from '@cofarm/contracts/auth';
import { okSchema } from '@cofarm/contracts/primitives';

import { request } from '@/lib/api-client.ts';

export type AdminCredentials = {
  email: string;
  password: string;
  totp?: string;
};

export function signInAdmin(credentials: AdminCredentials) {
  return request('/v1/auth/admin/login', sessionSchema, {
    method: 'POST',
    body: credentials,
  });
}

export function fetchCurrentUser() {
  return request('/v1/auth/me', authUserSchema);
}

export function signOut(refreshToken: string) {
  return request('/v1/auth/logout', okSchema, { method: 'POST', body: { refreshToken } });
}
