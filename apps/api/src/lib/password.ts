import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

function scrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error === null) resolve(derivedKey);
      else reject(error);
    });
  });
}

const KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELISM = 1;

const options = {
  N: SCRYPT_COST,
  r: SCRYPT_BLOCK_SIZE,
  p: SCRYPT_PARALLELISM,
  maxmem: 64 * 1024 * 1024,
};

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, options);
  return `scrypt$${SCRYPT_COST}$${SCRYPT_BLOCK_SIZE}$${SCRYPT_PARALLELISM}$${salt.toString(
    'base64url',
  )}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, cost, blockSize, parallelism, salt, expected] = parts;
  if (
    cost === undefined ||
    blockSize === undefined ||
    parallelism === undefined ||
    salt === undefined ||
    expected === undefined
  ) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, 'base64url');
  const derived = await scrypt(password, Buffer.from(salt, 'base64url'), expectedBuffer.length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelism),
    maxmem: 64 * 1024 * 1024,
  });

  if (derived.length !== expectedBuffer.length) return false;
  return timingSafeEqual(derived, expectedBuffer);
}

export function randomCode(digits: number): string {
  const max = 10 ** digits;
  const value = randomBytes(4).readUInt32BE(0) % max;
  return value.toString().padStart(digits, '0');
}

export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}
