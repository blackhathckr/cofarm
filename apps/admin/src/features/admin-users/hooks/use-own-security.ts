import type {
  ChangeOwnPasswordBody,
  ConfirmTwoFactorBody,
  DisableTwoFactorBody,
} from '@cofarm/contracts/admin-users';
import { useMutation } from '@tanstack/react-query';

import {
  changeOwnPassword,
  confirmTwoFactor,
  disableTwoFactor,
  enrolTwoFactor,
} from '../admin-users.api.ts';

export function useEnrolTwoFactor() {
  return useMutation({ mutationFn: () => enrolTwoFactor() });
}

export function useConfirmTwoFactor() {
  return useMutation({ mutationFn: (body: ConfirmTwoFactorBody) => confirmTwoFactor(body) });
}

export function useDisableTwoFactor() {
  return useMutation({ mutationFn: (body: DisableTwoFactorBody) => disableTwoFactor(body) });
}

export function useChangeOwnPassword() {
  return useMutation({ mutationFn: (body: ChangeOwnPasswordBody) => changeOwnPassword(body) });
}
