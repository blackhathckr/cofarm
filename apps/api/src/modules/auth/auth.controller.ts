import type { AuthUser, Session } from '@cofarm/contracts/auth';
import type { FastifyRequest } from 'fastify';

import { assertActor } from '../../lib/actor.ts';
import type { OtpChallenge } from './auth.service.ts';
import * as service from './auth.service.ts';

function userAgentOf(request: FastifyRequest): string | null {
  const header = request.headers['user-agent'];
  return typeof header === 'string' ? header.slice(0, 200) : null;
}

export async function requestOtp(
  request: FastifyRequest<{ Body: { mobile: string } }>,
): Promise<OtpChallenge> {
  return service.requestOtp(request.body.mobile);
}

export async function verifyOtp(
  request: FastifyRequest<{ Body: { challengeId: string; code: string } }>,
): Promise<Session> {
  return service.verifyOtp(request.body.challengeId, request.body.code, userAgentOf(request));
}

export async function adminLogin(
  request: FastifyRequest<{ Body: { email: string; password: string; totp?: string } }>,
): Promise<Session> {
  return service.adminLogin(
    request.body.email,
    request.body.password,
    request.body.totp,
    userAgentOf(request),
  );
}

export async function refresh(
  request: FastifyRequest<{ Body: { refreshToken: string } }>,
): Promise<Session> {
  return service.refreshSession(request.body.refreshToken, userAgentOf(request));
}

export async function logout(
  request: FastifyRequest<{ Body: { refreshToken: string } }>,
): Promise<{ ok: true }> {
  await service.logout(request.body.refreshToken);
  return { ok: true };
}

export async function me(request: FastifyRequest): Promise<AuthUser> {
  return service.toAuthUser(assertActor(request.actor));
}
