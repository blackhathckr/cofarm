import { sessionSchema } from '@cofarm/contracts/auth';
import type { ErrorCode, ProblemDetail } from '@cofarm/contracts/errors';
import type { z } from 'zod';

import { endSession, readRefreshToken, snapshot, startSession } from './session.ts';

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

/** Routes the API rejects without an Idempotency-Key. */
const IDEMPOTENT_ROUTES: readonly RegExp[] = [
  /^\/v1\/projects\/[^/]+\/mis$/,
  /^\/v1\/projects\/[^/]+\/mis\/[^/]+\/(publish|unpublish)$/,
  /^\/v1\/projects\/[^/]+\/updates$/,
  /^\/v1\/projects\/[^/]+\/updates\/[^/]+\/(publish|unpublish)$/,
  /^\/v1\/projects\/[^/]+\/harvest\/[^/]+\/(publish|payouts)$/,
  /^\/v1\/projects\/[^/]+\/signatures$/,
  /^\/v1\/signatures\/remind-all$/,
  /^\/v1\/tracking\/remind-all$/,
];

function assertIdempotencyKey(path: string, options: RequestOptions): void {
  if (options.method !== 'POST' || options.idempotencyKey !== undefined) return;

  const route = path.split('?')[0] ?? path;
  if (!IDEMPOTENT_ROUTES.some((guarded) => guarded.test(route))) return;

  throw new Error(`POST ${route} needs an idempotencyKey`);
}

async function toProblem(response: Response): Promise<ProblemDetail> {
  try {
    return (await response.json()) as ProblemDetail;
  } catch {
    return {
      type: 'about:blank',
      title: response.statusText || 'Request failed',
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

  return fetch(path, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, so a burst of 401s does not race the rotation. */
async function refreshOnce(): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = readRefreshToken();
    if (refreshToken === null) return false;

    const response = await fetch('/v1/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      endSession();
      return false;
    }
    const session = sessionSchema.parse(await response.json());
    startSession(session.accessToken, session.refreshToken, session.user);
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
  assertIdempotencyKey(path, options);

  let response = await send(path, options);

  if (response.status === 401 && snapshot().accessToken !== null) {
    if (await refreshOnce()) {
      response = await send(path, options);
    }
  }

  if (!response.ok) throw new ApiError(await toProblem(response));
  return schema.parse(await response.json());
}
