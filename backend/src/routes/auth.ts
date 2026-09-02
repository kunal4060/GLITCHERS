import type { FastifyPluginAsync } from 'fastify';
import { googleService } from '../services/google/googleService.js';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/google/url', async () => {
    return { url: googleService.getAuthUrl() };
  });

  fastify.post<{ Body: { code: string } }>('/google/callback', async (req, reply) => {
    const { code } = req.body || {};
    if (!code) {
      return reply.status(400).send({ error: 'Authorization code is required' });
    }

    const { email, googleId, accessToken } = await googleService.exchangeCodeForTokens(code);

    let profile = Array.from(inMemoryStore.profiles.values()).find((p) => p.email === email);
    if (!profile) {
      const id = randomUUID();
      profile = {
        id,
        email,
        fullName: 'Student User',
        university: 'Engineering College',
        course: 'Computer Science',
        year: 1,
        semester: 1,
        createdAt: new Date().toISOString(),
      };
      inMemoryStore.profiles.set(id, profile);
      inMemoryStore.seedDefaultStudent(id);
    }

    return {
      accessToken: 'jwt_mock_token_' + profile.id,
      user: profile,
    };
  });

  fastify.get('/me', { preHandler: authMiddleware }, async (req, reply) => {
    const userId = req.userId!;
    const profile = inMemoryStore.profiles.get(userId);
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });
    return { user: profile };
  });

  fastify.patch<{ Body: Record<string, any> }>('/profile', { preHandler: authMiddleware }, async (req, reply) => {
    const userId = req.userId!;
    const profile = inMemoryStore.profiles.get(userId);
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });

    const body = req.body || {};
    const updated = { ...profile, ...body, updatedAt: new Date().toISOString() };
    inMemoryStore.profiles.set(userId, updated);
    return { user: updated };
  });
};
