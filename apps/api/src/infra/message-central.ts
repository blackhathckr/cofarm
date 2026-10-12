import { env } from '../lib/env.ts';
import { logger } from '../lib/logger.ts';

type TokenResponse = { status?: number; token?: string };

type SendResponse = {
  responseCode?: number | string;
  message?: string;
  data?: { verificationId?: string | number };
};

type ValidateResponse = {
  responseCode?: number | string;
  message?: string;
  data?: { verificationStatus?: string };
};

/**
 * The auth token is good for a long window, so it is held in memory and only
 * re-fetched when it is close to expiry. Every OTP would otherwise pay for a
 * second round trip.
 */
const TOKEN_TTL_MS = 20 * 60 * 1000;
let cached: { token: string; fetchedAt: number } | null = null;

function baseUrl(): string {
  return env.MESSAGE_CENTRAL_BASE_URL.replace(/\/+$/, '');
}

async function authToken(force = false): Promise<string> {
  const now = Date.now();
  if (!force && cached !== null && now - cached.fetchedAt < TOKEN_TTL_MS) return cached.token;

  const url = new URL(`${baseUrl()}/auth/v1/authentication/token`);
  url.searchParams.set('customerId', env.MESSAGE_CENTRAL_CUSTOMER_ID);
  url.searchParams.set('key', env.MESSAGE_CENTRAL_KEY);
  url.searchParams.set('scope', 'NEW');
  url.searchParams.set('country', env.MESSAGE_CENTRAL_COUNTRY);

  const response = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Message Central token request failed with ${response.status.toString()}`);
  }

  const body = (await response.json()) as TokenResponse;
  if (body.token === undefined || body.token === '') {
    throw new Error('Message Central returned no auth token');
  }

  cached = { token: body.token, fetchedAt: now };
  return body.token;
}

/** Splits +919845022114 into its country code and the national number. */
/** Carries the provider's status so callers can tell a refusal from an outage. */
export class ProviderError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, message: string, detail: string) {
    super(`${message} with ${status.toString()}: ${detail}`);
    this.name = 'ProviderError';
    this.status = status;
    this.detail = detail;
  }
}

function splitMobile(mobile: string): { countryCode: string; nationalNumber: string } {
  const digits = mobile.replace(/[^\d]/g, '');
  const countryCode = env.MESSAGE_CENTRAL_COUNTRY_CODE;
  const nationalNumber = digits.startsWith(countryCode) ? digits.slice(countryCode.length) : digits;
  return { countryCode, nationalNumber };
}

async function call<T>(path: string, params: URLSearchParams, method: 'GET' | 'POST'): Promise<T> {
  const attempt = async (token: string): Promise<Response> =>
    fetch(`${baseUrl()}${path}?${params.toString()}`, {
      method,
      headers: { authToken: token, accept: 'application/json' },
    });

  let response = await attempt(await authToken());
  // A cached token can expire early if it was revoked on their side.
  if (response.status === 401 || response.status === 403) {
    response = await attempt(await authToken(true));
  }

  if (!response.ok) {
    // Their body carries the reason; without it a failure is undiagnosable.
    const detail = await response.text().catch(() => '');
    throw new ProviderError(
      response.status,
      `Message Central ${path} failed`,
      detail.slice(0, 300),
    );
  }
  return (await response.json()) as T;
}

/** Asks Message Central to generate and send a code; returns their reference. */
export async function sendOtp(mobile: string): Promise<string> {
  const { countryCode, nationalNumber } = splitMobile(mobile);
  const params = new URLSearchParams({
    countryCode,
    mobileNumber: nationalNumber,
    flowType: env.MESSAGE_CENTRAL_FLOW_TYPE,
    otpLength: env.MESSAGE_CENTRAL_OTP_LENGTH.toString(),
  });

  const body = await call<SendResponse>('/verification/v3/send', params, 'POST');
  const verificationId = body.data?.verificationId;
  if (verificationId === undefined) {
    throw new Error(
      `Message Central send returned no verificationId: ${body.message ?? 'unknown'}`,
    );
  }

  return verificationId.toString();
}

/**
 * Message Central owns the code, so a wrong one is a normal outcome rather
 * than a failure: anything but a completed verification is a rejection.
 */
export async function validateOtp(verificationId: string, code: string): Promise<boolean> {
  const params = new URLSearchParams({
    verificationId,
    code,
    flowType: env.MESSAGE_CENTRAL_FLOW_TYPE,
  });

  try {
    // No trailing slash: their docs show one, and with it the endpoint 401s.
    const body = await call<ValidateResponse>('/verification/v3/validateOtp', params, 'GET');
    return body.data?.verificationStatus === 'VERIFICATION_COMPLETED';
  } catch (error) {
    logger.warn({ err: error, verificationId }, 'Message Central rejected an OTP check');
    return false;
  }
}
