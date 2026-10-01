import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../utils/tokens.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
const isProduction = () => process.env.NODE_ENV === 'production';

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    if (isProduction()) {
      return reply.status(401).send({ error: 'Unauthorized: Missing authorization header' });
    }
    // SECURITY: dev-only bypass — production must always present a valid signed token
    req.userId = DEV_USER_ID;
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid authorization format' });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token || token === 'invalid' || token === 'expired') {
    return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
  }

  // Production path: accept only HMAC-signed session tokens (see utils/tokens.ts)
  const userId = verifyToken(token);
  if (userId) {
    req.userId = userId;
    return;
  }

  // SECURITY: legacy/unsigned dev tokens (dev-token, mock_*, jwt_mock_token_*, unsigned
  // jwt_<id>) are accepted ONLY outside production, for local development and tests.
  if (
    !isProduction() &&
    (token === 'dev-token' || token.startsWith('mock_') || token.startsWith('jwt_mock_token_') || token.startsWith('jwt_'))
  ) {
    req.userId = token.startsWith('jwt_mock_token_')
      ? token.replace('jwt_mock_token_', '')
      : token.startsWith('jwt_')
        ? token.replace('jwt_', '')
        : DEV_USER_ID;
    return;
  }

  return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token' });
}
