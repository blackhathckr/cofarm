import { env } from '../lib/env.ts';
import { sendToToken } from './fcm.ts';
import { logger } from '../lib/logger.ts';

export type PushMessage = {
  title: string;
  body: string;
  data: Readonly<Record<string, string>>;
};

export type PushResult = {
  delivered: boolean;
  error?: string;
  /** Tokens the device has thrown away; the caller should stop storing them. */
  staleTokens?: readonly string[];
};

export type PushProvider = {
  send(tokens: readonly string[], message: PushMessage): Promise<PushResult>;
};

const logProvider: PushProvider = {
  send(tokens, message) {
    logger.info(
      { deviceCount: tokens.length, title: message.title, payload: message.data },
      'push (log provider)',
    );
    return Promise.resolve({ delivered: true });
  },
};

const fcmProvider: PushProvider = {
  async send(tokens, message) {
    if (env.FCM_PROJECT_ID === '' || env.FCM_PRIVATE_KEY === '') {
      return { delivered: false, error: 'PUSH_PROVIDER=fcm but no service account is configured' };
    }
    if (tokens.length === 0) return { delivered: true };

    const outcomes = await Promise.all(tokens.map((token) => attempt(token, message)));
    const staleTokens = outcomes.filter((outcome) => outcome.unregistered).map((o) => o.token);
    const stale = staleTokens.length === 0 ? {} : { staleTokens };

    if (outcomes.some((outcome) => outcome.ok)) return { delivered: true, ...stale };

    const failed = outcomes.find((outcome) => !outcome.ok && !outcome.unregistered);
    return {
      delivered: false,
      error: failed?.error ?? 'every device token was rejected',
      ...stale,
    };
  },
};

async function attempt(
  token: string,
  message: PushMessage,
): Promise<{ token: string; ok: boolean; unregistered: boolean; error?: string }> {
  try {
    return await sendToToken(token, message);
  } catch (error) {
    return {
      token,
      ok: false,
      unregistered: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const pushProvider: PushProvider = env.PUSH_PROVIDER === 'log' ? logProvider : fcmProvider;
