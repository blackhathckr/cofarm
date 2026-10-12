import { env } from '../lib/env.ts';
import { logger } from '../lib/logger.ts';
import { sendOtp, validateOtp } from './message-central.ts';

/**
 * Either we mint the code and check it against our own hash, or the provider
 * mints it and we hand the code back to them to check. The challenge row
 * carries whichever of the two applies.
 */
export type OtpStart = { code: string; providerRef: null } | { code: null; providerRef: string };

export type OtpDelivery = {
  /** True only where the code is safe to return in the response, i.e. dev. */
  echoesCode: boolean;
  start(mobile: string): Promise<OtpStart>;
  /** Called only for a challenge the provider owns. */
  check(providerRef: string, code: string): Promise<boolean>;
};

function randomSixDigits(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

const devDelivery: OtpDelivery = {
  echoesCode: true,
  start(mobile) {
    const code = env.DEV_OTP_CODE;
    logger.info({ mobile, otp: code }, 'dev OTP issued');
    return Promise.resolve({ code, providerRef: null });
  },
  check() {
    return Promise.resolve(false);
  },
};

const messageCentralDelivery: OtpDelivery = {
  echoesCode: false,
  async start(mobile) {
    return { code: null, providerRef: await sendOtp(mobile) };
  },
  check(providerRef, code) {
    return validateOtp(providerRef, code);
  },
};

const firebaseDelivery: OtpDelivery = {
  echoesCode: false,
  start() {
    throw new Error(
      'AUTH_PROVIDER=firebase: the handset completes the OTP exchange. Use the Firebase sign-in endpoint.',
    );
  },
  check() {
    return Promise.resolve(false);
  },
};

function pick(): OtpDelivery {
  if (env.AUTH_PROVIDER === 'dev') return devDelivery;
  if (env.AUTH_PROVIDER === 'message_central') return messageCentralDelivery;
  return firebaseDelivery;
}

export const otpDelivery: OtpDelivery = pick();

export function localCode(): string {
  return env.AUTH_PROVIDER === 'dev' ? env.DEV_OTP_CODE : randomSixDigits();
}
