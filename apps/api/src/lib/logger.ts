import { pino, type LoggerOptions } from 'pino';

import { env, isProduction } from './env.ts';

export const loggerOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["idempotency-key"]',
      '*.password',
      '*.passwordHash',
      '*.totpSecret',
      '*.accessToken',
      '*.refreshToken',
      '*.code',
      '*.devCode',
      'otp',
    ],
    censor: '[redacted]',
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
        },
      }),
};

export const logger = pino(loggerOptions);

export type Logger = typeof logger;
