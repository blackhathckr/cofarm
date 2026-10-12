import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

export function generateTotpSecret(): string {
  const buffer = randomBytes(20);
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let secret = '';
  for (let index = 0; index + 5 <= bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5);
    secret += BASE32_ALPHABET[Number.parseInt(chunk, 2)] ?? '';
  }
  return secret;
}

function decodeBase32(secret: string): Buffer {
  const normalised = secret.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const character of normalised) {
    const value = BASE32_ALPHABET.indexOf(character);
    if (value === -1) throw new Error('Malformed TOTP secret');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function codeForCounter(secret: string, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const binary =
    (((digest[offset] ?? 0) & 0x7f) << 24) |
    (((digest[offset + 1] ?? 0) & 0xff) << 16) |
    (((digest[offset + 2] ?? 0) & 0xff) << 8) |
    ((digest[offset + 3] ?? 0) & 0xff);

  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

export function verifyTotp(secret: string, code: string, atMs = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(atMs / 1000 / STEP_SECONDS);
  const candidate = Buffer.from(code);

  for (const drift of [0, -1, 1]) {
    const expected = Buffer.from(codeForCounter(secret, counter + drift));
    if (expected.length === candidate.length && timingSafeEqual(expected, candidate)) {
      return true;
    }
  }
  return false;
}

export function totpEnrolmentUrl(secret: string, account: string): string {
  const label = encodeURIComponent(`CoFarm:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=CoFarm&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
