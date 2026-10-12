import {
  accountDeletionResultSchema,
  accountProfileSchema,
  deletionPolicySchema,
  type DeleteAccountBody,
  type UpdateProfileBody,
} from '@cofarm/contracts/account';
import { deviceSchema, type RegisterDeviceBody } from '@cofarm/contracts/notifications';
import { okSchema } from '@cofarm/contracts/primitives';

import { request } from '@/lib/api-client.ts';

export function fetchProfile() {
  return request('/v1/me', accountProfileSchema);
}

export function updateProfile(body: UpdateProfileBody) {
  return request('/v1/me', accountProfileSchema, { method: 'PATCH', body });
}

export function fetchDeletionPolicy() {
  return request('/v1/me/account/deletion-policy', deletionPolicySchema);
}

export function deleteAccount(body: DeleteAccountBody) {
  return request('/v1/me/account/delete', accountDeletionResultSchema, { method: 'POST', body });
}

export function registerDevice(body: RegisterDeviceBody) {
  return request('/v1/me/devices', deviceSchema, { method: 'POST', body });
}

export function unregisterDevice(token: string) {
  return request(`/v1/me/devices/${encodeURIComponent(token)}`, okSchema, { method: 'DELETE' });
}
