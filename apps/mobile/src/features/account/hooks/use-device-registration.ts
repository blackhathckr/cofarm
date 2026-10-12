import { useMutation } from '@tanstack/react-query';

import { registerDevice } from '../account.api.ts';
import { rememberDeviceToken, type PushDevice } from '../push-device.ts';

export function useRegisterDevice() {
  return useMutation({
    mutationFn: (device: PushDevice) => registerDevice(device),
    onSuccess: (device) => {
      rememberDeviceToken(device.token);
    },
  });
}
