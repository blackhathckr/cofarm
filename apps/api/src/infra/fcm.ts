import { createSign } from 'node:crypto';

import { env } from '../lib/env.ts';

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TOKEN_TTL_SECONDS = 3600;
/** Refreshed early so a send never races the expiry. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

type AccessToken = { token: string; expiresAt: number };
let cached: AccessToken | null = null;

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** An env var cannot hold real newlines, so the PEM arrives with them escaped. */
function privateKey(): string {
  return env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n');
}

function signedAssertion(): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: env.FCM_CLIENT_EMAIL,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + TOKEN_TTL_SECONDS,
    }),
  );

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${base64Url(signer.sign(privateKey()))}`;
}

export async function accessToken(): Promise<string> {
  const now = Date.now();
  if (cached !== null && cached.expiresAt - REFRESH_MARGIN_MS > now) return cached.token;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedAssertion(),
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM token exchange failed with ${response.status.toString()}`);
  }

  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (body.access_token === undefined) throw new Error('FCM token exchange returned no token');

  cached = {
    token: body.access_token,
    expiresAt: now + (body.expires_in ?? TOKEN_TTL_SECONDS) * 1000,
  };
  return cached.token;
}

export type FcmOutcome = { token: string; ok: boolean; unregistered: boolean; error?: string };

/**
 * The v1 API takes one token per request, so a fan-out is a request each. A
 * token the device has thrown away comes back as UNREGISTERED or
 * INVALID_ARGUMENT, which is the signal to stop sending to it.
 */
export async function sendToToken(
  token: string,
  message: { title: string; body: string; data: Readonly<Record<string, string>> },
): Promise<FcmOutcome> {
  const bearer = await accessToken();
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: message.title, body: message.body },
          data: message.data,
          android: { priority: 'HIGH', notification: { channelId: 'default' } },
        },
      }),
    },
  );

  if (response.ok) return { token, ok: true, unregistered: false };

  const detail = await response.text();
  const unregistered =
    response.status === 404 ||
    detail.includes('UNREGISTERED') ||
    detail.includes('INVALID_ARGUMENT');
  return {
    token,
    ok: false,
    unregistered,
    error: `${response.status.toString()} ${detail.slice(0, 200)}`,
  };
}
