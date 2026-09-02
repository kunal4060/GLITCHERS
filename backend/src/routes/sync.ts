import type { FastifyPluginAsync } from 'fastify';
import { syncService } from '../services/sync/syncService.js';
import { authMiddleware } from '../middleware/auth.js';
import type { SyncBatchRequest } from '@glitchers/shared';

export const syncRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.post<{ Body: SyncBatchRequest }>('/batch', async (req, reply) => {
    const userId = req.userId!;
    const batch = req.body;

    if (!batch || !Array.isArray(batch.pendingRecords)) {
      return reply.status(400).send({ error: 'Invalid sync batch payload' });
    }

    const result = await syncService.processSyncBatch(userId, batch);
    return result;
  });
};
