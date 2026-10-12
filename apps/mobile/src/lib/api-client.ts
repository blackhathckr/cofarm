import { sessionSchema } from '@cofarm/contracts/auth';
import type { ErrorCode, ProblemDetail } from '@cofarm/contracts/errors';
import Constants from 'expo-constants';
import type { z } from 'zod';

import { endSession, readRefreshToken, snapshot, startSession } from './session.ts';

/**
 * A device cannot reach the host's localhost, so in development the API is
 * addressed at the same LAN host Metro is served from.
 */
function resolveBaseUrl(): string {
  const configured: string | undefined = process.env['EXPO_PUBLIC_API_URL'];
  if (configured !== undefined && configured !== '') return configured;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:4000`;
}

export const API_BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields: { path: string; message: string }[];

  constructor(problem: ProblemDetail) {
    super(problem.title);
    this.name = 'ApiError';
    this.code = problem.code;
    this.status = problem.status;
    this.fields = problem.errors ?? [];
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
};

async function toProblem(response: Response): Promise<ProblemDetail> {
  try {
    return (await response.json()) as ProblemDetail;
  } catch {
    return {
      type: 'about:blank',
      title: 'Could not reach CoFarm',
      status: response.status,
      code: 'internal_error',
    };
  }
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { accessToken } = snapshot();
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (accessToken !== null) headers['authorization'] = `Bearer ${accessToken}`;
  if (options.idempotencyKey !== undefined) {
    headers['idempotency-key'] = options.idempotencyKey;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, so a burst of 401s does not race the rotation. */
async function refreshOnce(): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = await readRefreshToken();
    if (refreshToken === null) return false;

    const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      await endSession();
      return false;
    }
    const session = sessionSchema.parse(await response.json());
    await startSession(session.accessToken, session.refreshToken, session.user);
    return true;
  })().finally(() => {
    refreshing = null;
  });

  return refreshing;
}

export async function request<T extends z.ZodType>(
  path: string,
  schema: T,
  options: RequestOptions = {},
): Promise<z.infer<T>> {
  let response = await send(path, options);

  if (response.status === 401 && snapshot().accessToken !== null) {
    if (await refreshOnce()) {
      response = await send(path, options);
    }
  }

  if (!response.ok) throw new ApiError(await toProblem(response));
  return schema.parse(await response.json());
}
