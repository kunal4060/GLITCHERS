import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import type { QuietHours } from '@glitchers/shared';

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const notifications = inMemoryStore.notifications.get(userId) || [];
    return { notifications };
  });

  fastify.patch<{ Params: { id: string } }>('/:id/read', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const notifications = inMemoryStore.notifications.get(userId) || [];
    const notif = notifications.find((n) => n.id === id);

    if (!notif) return reply.status(404).send({ error: 'Notification not found' });
    notif.read = true;

    return { notification: notif };
  });

  fastify.get('/preferences', async (req) => {
    const userId = req.userId!;
    const prefs = inMemoryStore.preferences.get(userId) || {
      quietHours: { enabled: true, startTime: '23:00', endTime: '07:00', criticalBypass: true },
      universityDomain: 'university.edu',
    };
    return prefs;
  });

  fastify.patch<{ Body: { quietHours?: Partial<QuietHours>; universityDomain?: string } }>('/preferences', async (req) => {
    const userId = req.userId!;
    const current = inMemoryStore.preferences.get(userId) || {
      quietHours: { enabled: true, startTime: '23:00', endTime: '07:00', criticalBypass: true },
      universityDomain: 'university.edu',
    };

    const updated = {
      ...current,
      ...req.body,
      quietHours: {
        ...current.quietHours,
        ...(req.body.quietHours || {}),
      },
    };

    inMemoryStore.preferences.set(userId, updated);
    return updated;
  });
};
