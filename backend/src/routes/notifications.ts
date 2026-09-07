import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';
import type { QuietHours } from '@glitchers/shared';

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const notifications = await supabaseStore.getNotifications(userId);
    return { notifications };
  });

  fastify.patch<{ Params: { id: string } }>('/:id/read', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    await supabaseStore.markNotificationAsRead(userId, id);
    const notifications = await supabaseStore.getNotifications(userId);
    const notif = notifications.find((n) => n.id === id);

    if (!notif) return reply.status(404).send({ error: 'Notification not found' });
    return { notification: notif };
  });

  fastify.get('/preferences', async (req) => {
    const userId = req.userId!;
    const prefs = await supabaseStore.getUserPreferences(userId);
    return prefs;
  });

  fastify.patch<{ Body: { quietHours?: Partial<QuietHours>; universityDomain?: string } }>('/preferences', async (req) => {
    const userId = req.userId!;
    await supabaseStore.saveUserPreferences(userId, req.body);
    const updated = await supabaseStore.getUserPreferences(userId);
    return updated;
  });
};
