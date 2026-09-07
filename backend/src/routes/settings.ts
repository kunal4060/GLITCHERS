import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const profile = await supabaseStore.getProfile(userId);
    const prefs = await supabaseStore.getUserPreferences(userId);

    return {
      profile,
      preferences: prefs,
      floatingAssistantEnabled: prefs.floatingAssistantEnabled,
      aiInsightsEnabled: prefs.aiProcessingEnabled,
    };
  });

  fastify.patch<{ Body: { universityDomain?: string; quietHours?: any; floatingAssistantEnabled?: boolean } }>(
    '/',
    async (req) => {
      const userId = req.userId!;
      await supabaseStore.saveUserPreferences(userId, {
        universityDomain: req.body.universityDomain,
        quietHours: req.body.quietHours,
        floatingAssistantEnabled: req.body.floatingAssistantEnabled,
      });

      const updated = await supabaseStore.getUserPreferences(userId);
      return { success: true, preferences: updated };
    }
  );
};
