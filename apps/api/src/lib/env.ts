import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  // Per IP, per minute. Carrier NAT puts many users behind one address, so the
  // per-mobile OTP counter is the real abuse control, not this ceiling.
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(1200),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),

  STORAGE_ENDPOINT: z.url(),
  /** Host to sign URLs for, when it differs from the one the API uses. */
  STORAGE_PUBLIC_ENDPOINT: z.url().optional(),
  STORAGE_REGION: z.string().default('ap-south-1'),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(300),

  AUTH_PROVIDER: z.enum(['dev', 'firebase', 'message_central']).default('dev'),
  MESSAGE_CENTRAL_BASE_URL: z.url().default('https://cpaas.messagecentral.com'),
  MESSAGE_CENTRAL_CUSTOMER_ID: z.string().default(''),
  /** The account password, base-64 encoded, as their token endpoint expects. */
  MESSAGE_CENTRAL_KEY: z.string().default(''),
  MESSAGE_CENTRAL_COUNTRY: z.string().default('IN'),
  MESSAGE_CENTRAL_COUNTRY_CODE: z.string().default('91'),
  MESSAGE_CENTRAL_FLOW_TYPE: z.enum(['SMS', 'WhatsApp']).default('SMS'),
  MESSAGE_CENTRAL_OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  DEV_OTP_CODE: z
    .string()
    .regex(/^\d{6}$/)
    .default('000000'),
  PUSH_PROVIDER: z.enum(['log', 'fcm']).default('log'),
  FCM_PROJECT_ID: z.string().default(''),
  FCM_CLIENT_EMAIL: z.string().default(''),
  /** Service-account PEM with newlines escaped, as an env var requires. */
  FCM_PRIVATE_KEY: z.string().default(''),

  KIAAN_SHARE_PCT: z.coerce.number().min(0).max(100).default(50),

  SEED_ADMIN_EMAIL: z.email().default('admin@cofarm.local'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('cofarm-dev-admin'),
});

export type Env = z.infer<typeof envSchema>;

function load(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}

export const env = load();

export const isProduction = env.NODE_ENV === 'production';

export function corsOrigins(): string[] {
  return env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
