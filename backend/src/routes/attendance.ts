import type { FastifyPluginAsync } from 'fastify';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';

export const attendanceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const attendance = await supabaseStore.getAttendance(userId);
    return { attendance };
  });

  fastify.post<{ Body: { subjectName?: string; present?: boolean } }>('/mark', async (req, reply) => {
    const userId = req.userId!;
    const { subjectName, present } = req.body || {};

    if (!subjectName || typeof subjectName !== 'string' || !subjectName.trim()) {
      return reply.status(400).send({ error: 'subjectName is required' });
    }

    const record = await supabaseStore.markAttendance(userId, subjectName.trim(), present !== false);
    return { subjectName: subjectName.trim(), ...record };
  });

  fastify.delete<{ Params: { subjectName: string } }>('/:subjectName', async (req) => {
    const userId = req.userId!;
    await supabaseStore.resetAttendance(userId, decodeURIComponent(req.params.subjectName));
    return { success: true };
  });
};
