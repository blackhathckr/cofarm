import { createHash } from 'node:crypto';

import { errors, jwtVerify, SignJWT } from 'jose';

import { ERROR_CODES } from '@cofarm/contracts/errors';

import { env } from './env.ts';
import { AppError, unauthorized } from './errors.ts';

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = 'cofarm';

export type AccessClaims = {
  sub: string;
  kind: 'partner' | 'admin';
};

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ kind: claims.kind })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER });
    const kind = payload['kind'];
    if (payload.sub === undefined || (kind !== 'partner' && kind !== 'admin')) {
      throw unauthorized('Malformed token');
    }
    return { sub: payload.sub, kind };
  } catch (error) {
    // Only a well-formed token that merely aged out says so: the client can
    // refresh and retry. Everything else stays indistinguishable, so this
    // cannot be used to probe whether an account exists or is suspended.
    if (error instanceof errors.JWTExpired) {
      throw new AppError(ERROR_CODES.tokenExpired, 401, 'Token expired');
    }
    throw unauthorized('Invalid token');
  }
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

export function accessTokenSeconds(): number {
  return durationToSeconds(env.ACCESS_TOKEN_TTL);
}

export function refreshTokenSeconds(): number {
  return durationToSeconds(env.REFRESH_TOKEN_TTL);
}

const UNITS: Readonly<Record<string, number>> = { s: 1, m: 60, h: 3600, d: 86_400 };

function durationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Cannot read duration: ${value}`);
  const [, amount, unit] = match;
  if (amount === undefined || unit === undefined) throw new Error(`Cannot read duration: ${value}`);
  const multiplier = UNITS[unit];
  if (multiplier === undefined) throw new Error(`Cannot read duration: ${value}`);
  return Number(amount) * multiplier;
}
