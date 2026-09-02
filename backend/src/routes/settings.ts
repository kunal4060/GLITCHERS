import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const profile = inMemoryStore.profiles.get(userId);
    const prefs = inMemoryStore.preferences.get(userId) || {
      quietHours: { enabled: true, startTime: '23:00', endTime: '07:00', criticalBypass: true },
      universityDomain: 'university.edu',
    };

    return {
      profile,
      preferences: prefs,
      floatingAssistantEnabled: true,
      aiInsightsEnabled: true,
    };
  });

  fastify.patch<{ Body: { universityDomain?: string; quietHours?: any; floatingAssistantEnabled?: boolean } }>(
    '/',
    async (req) => {
      const userId = req.userId!;
      const current = inMemoryStore.preferences.get(userId) || {
        quietHours: { enabled: true, startTime: '23:00', endTime: '07:00', criticalBypass: true },
        universityDomain: 'university.edu',
      };

      const updated = {
        ...current,
        ...(req.body.universityDomain ? { universityDomain: req.body.universityDomain } : {}),
        ...(req.body.quietHours ? { quietHours: { ...current.quietHours, ...req.body.quietHours } } : {}),
      };

      inMemoryStore.preferences.set(userId, updated);
      return { success: true, preferences: updated };
    }
  );
};
