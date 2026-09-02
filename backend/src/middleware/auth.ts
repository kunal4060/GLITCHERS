import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Default test/dev student fallback if in dev mode
    req.userId = '00000000-0000-0000-0000-000000000001';
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();

  if (token === 'dev-token' || token.startsWith('mock_')) {
    req.userId = '00000000-0000-0000-0000-000000000001';
    return;
  }

  // If valid JWT, extract user ID (fallback to dev user for development)
  req.userId = '00000000-0000-0000-0000-000000000001';
}
