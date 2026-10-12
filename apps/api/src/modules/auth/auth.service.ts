import { ERROR_CODES } from '@cofarm/contracts/errors';
import type { Permission } from '@cofarm/contracts/permissions';
import { SYSTEM_ROLES } from '@cofarm/contracts/permissions';
import type { Session } from '@cofarm/contracts/auth';
import { newId } from '@cofarm/core/id';

import { ProviderError } from '../../infra/message-central.ts';
import { otpDelivery } from '../../infra/otp-delivery.ts';
import type { Actor } from '../../lib/actor.ts';
import { AppError, unauthorized } from '../../lib/errors.ts';
import { hashPassword, randomToken, verifyPassword } from '../../lib/password.ts';
import {
  accessTokenSeconds,
  hashRefreshToken,
  refreshTokenSeconds,
  signAccessToken,
} from '../../lib/token.ts';
import { verifyTotp } from '../../lib/totp.ts';
import * as repo from './auth.repo.ts';

const OTP_TTL_SECONDS = 300;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_WINDOW = 5;
const OTP_WINDOW_MINUTES = 15;

export async function resolveActor(userId: string): Promise<Actor | null> {
  const user = await repo.findUserById(userId);
  if (user === null) return null;

  const [access, projects] = await Promise.all([
    repo.permissionKeysForUser(userId),
    repo.activeMembershipProjects(userId),
  ]);

  return {
    userId: user.id,
    kind: user.kind,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    isSuperadmin: access.roleKeys.includes(SYSTEM_ROLES.superadmin),
    permissions: new Set(access.permissions as Permission[]),
    projects,
  };
}

export async function toAuthUser(actor: Actor): Promise<Session['user']> {
  return {
    id: actor.userId,
    name: actor.name,
    kind: actor.kind,
    mobile: actor.mobile,
    email: actor.email,
    permissions: [...actor.permissions],
    twoFactorEnabled: await repo.isTwoFactorEnabled(actor.userId),
    projects: actor.projects.map((project) => ({
      projectId: project.projectId,
      code: project.code,
      name: project.name,
    })),
  };
}

export type OtpChallenge = {
  challengeId: string;
  expiresAt: string;
  devCode?: string;
};

/**
 * An unknown mobile still returns a challenge. Telling a caller which numbers
 * are registered would turn the login screen into a partner directory.
 */
/**
 * The provider holds one live verification per number and refuses a second,
 * which is a wait-and-retry for the partner rather than a server fault.
 */
async function startDelivery(mobile: string) {
  try {
    return await otpDelivery.start(mobile);
  } catch (failure) {
    if (failure instanceof ProviderError && failure.status >= 400 && failure.status < 500) {
      throw new AppError(ERROR_CODES.otpLocked, 429, 'A code was sent a moment ago', {
        detail: 'Wait a minute before asking for another.',
      });
    }
    throw failure;
  }
}

export async function requestOtp(mobile: string): Promise<OtpChallenge> {
  const windowStart = new Date(Date.now() - OTP_WINDOW_MINUTES * 60_000);
  const recent = await repo.countRecentChallenges(mobile, windowStart);
  if (recent >= OTP_MAX_PER_WINDOW) {
    throw new AppError(ERROR_CODES.otpLocked, 429, 'Too many codes requested', {
      detail: `Try again in ${OTP_WINDOW_MINUTES} minutes.`,
    });
  }

  const challengeId = newId();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
  const started = await startDelivery(mobile);

  await repo.insertChallenge({
    id: challengeId,
    mobile,
    expiresAt,
    codeHash: started.code === null ? null : await hashPassword(started.code),
    providerRef: started.providerRef,
  });

  return {
    challengeId,
    expiresAt: expiresAt.toISOString(),
    ...(otpDelivery.echoesCode && started.code !== null ? { devCode: started.code } : {}),
  };
}

/** The provider verifies its own codes; ours are checked against the hash. */
async function codeMatches(
  challenge: { codeHash: string | null; providerRef: string | null },
  code: string,
): Promise<boolean> {
  if (challenge.providerRef !== null) return otpDelivery.check(challenge.providerRef, code);
  if (challenge.codeHash === null) return false;
  return verifyPassword(code, challenge.codeHash);
}

export async function verifyOtp(
  challengeId: string,
  code: string,
  userAgent: string | null,
): Promise<Session> {
  const challenge = await repo.findLiveChallenge(challengeId);
  if (challenge === null) {
    throw new AppError(ERROR_CODES.otpInvalid, 401, 'That code is no longer valid');
  }
  if (challenge.expiresAt.getTime() < Date.now()) {
    throw new AppError(ERROR_CODES.otpExpired, 401, 'That code has expired');
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError(ERROR_CODES.otpLocked, 429, 'Too many attempts on this code');
  }

  await repo.recordChallengeAttempt(challengeId);
  if (!(await codeMatches(challenge, code))) {
    throw new AppError(ERROR_CODES.otpInvalid, 401, 'That code is not right');
  }

  await repo.consumeChallenge(challengeId);

  // Resolved only after the code checks out, so a wrong code cannot be used to
  // probe which numbers belong to a partner.
  const user = await repo.findActivePartnerByMobile(challenge.mobile);
  if (user === null) {
    throw new AppError(ERROR_CODES.noActiveMembership, 403, 'This number has no partner account');
  }

  return issueSession(user.id, userAgent);
}

export async function adminLogin(
  email: string,
  password: string,
  totp: string | undefined,
  userAgent: string | null,
): Promise<Session> {
  const user = await repo.findActiveAdminByEmail(email);
  const storedHash = user?.passwordHash ?? null;

  // Verified even when the account is unknown, so a missing account and a wrong
  // password take the same time and cannot be told apart.
  const placeholder = await placeholderHash();
  const matches = await verifyPassword(password, storedHash ?? placeholder);
  if (user === null || storedHash === null || !matches) {
    throw new AppError(ERROR_CODES.credentialsInvalid, 401, 'Email or password is wrong');
  }

  if (user.totpEnabledAt !== null && user.totpSecret !== null) {
    if (totp === undefined) {
      throw new AppError(ERROR_CODES.twoFactorRequired, 401, 'Enter your authenticator code');
    }
    if (!verifyTotp(user.totpSecret, totp)) {
      throw new AppError(ERROR_CODES.twoFactorInvalid, 401, 'That authenticator code is wrong');
    }
  }

  return issueSession(user.id, userAgent);
}

export async function refreshSession(token: string, userAgent: string | null): Promise<Session> {
  const existing = await repo.findLiveRefreshToken(hashRefreshToken(token));
  if (existing === null) throw unauthorized('Session expired, sign in again');

  // Rotated on every use: a stolen refresh token is good for one call, and the
  // theft shows up as the real device being signed out.
  await repo.revokeRefreshToken(existing.id);
  return issueSession(existing.userId, userAgent);
}

export async function logout(token: string): Promise<void> {
  const existing = await repo.findLiveRefreshToken(hashRefreshToken(token));
  if (existing !== null) await repo.revokeRefreshToken(existing.id);
}

export async function logoutEverywhere(userId: string): Promise<void> {
  await repo.revokeAllRefreshTokens(userId);
}

async function issueSession(userId: string, userAgent: string | null): Promise<Session> {
  const actor = await resolveActor(userId);
  if (actor === null) throw unauthorized('Account is not active');

  const accessToken = await signAccessToken({ sub: actor.userId, kind: actor.kind });
  const refreshToken = randomToken();

  await repo.insertRefreshToken({
    id: newId(),
    userId: actor.userId,
    tokenHash: hashRefreshToken(refreshToken),
    userAgent,
    expiresAt: new Date(Date.now() + refreshTokenSeconds() * 1000),
  });
  await repo.touchLastLogin(actor.userId);

  return {
    accessToken,
    refreshToken,
    expiresIn: accessTokenSeconds(),
    user: await toAuthUser(actor),
  };
}

let cachedPlaceholder: string | null = null;

async function placeholderHash(): Promise<string> {
  cachedPlaceholder ??= await hashPassword(randomToken(16));
  return cachedPlaceholder;
}
