import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env.js';

// Signed, self-contained session tokens (no JWT library dependency).
// Format: jwt_<userId>_<expEpochSeconds>_<hmacHex>
// where hmacHex = HMAC-SHA256(JWT_SECRET, "<userId>.<expEpochSeconds>").
// Tokens are opaque to clients; the auth middleware verifies them via verifyToken().
const TOKEN_PREFIX = 'jwt_';
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function computeSignature(userId: string, expEpoch: number): string {
  return createHmac('sha256', env.JWT_SECRET).update(`${userId}.${expEpoch}`).digest('hex');
}

export function signToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return `${TOKEN_PREFIX}${userId}_${exp}_${computeSignature(userId, exp)}`;
}

export function verifyToken(token: string): string | null {
  if (typeof token !== 'string' || !token.startsWith(TOKEN_PREFIX)) return null;
  const parts = token.slice(TOKEN_PREFIX.length).split('_');
  if (parts.length !== 3) return null;
  const [userId, expStr, signature] = parts;
  if (!userId || !/^\d+$/.test(expStr)) return null;
  const exp = Number(expStr);
  if (!Number.isSafeInteger(exp) || exp <= Math.floor(Date.now() / 1000)) return null;
  const expected = computeSignature(userId, exp);
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? userId : null;
}
