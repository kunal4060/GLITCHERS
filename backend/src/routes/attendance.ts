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

    // M18: accept only real booleans — the string "false" must not mark present
    if (present !== undefined && typeof present !== 'boolean') {
      return reply.status(400).send({ error: 'present must be a boolean' });
    }

    const record = await supabaseStore.markAttendance(userId, subjectName.trim(), present !== false);
    return { subjectName: subjectName.trim(), ...record };
  });

  fastify.delete<{ Params: { subjectName: string } }>('/:subjectName', async (req, reply) => {
    const userId = req.userId!;
    let subjectName: string;
    try {
      subjectName = decodeURIComponent(req.params.subjectName);
    } catch {
      return reply.status(400).send({ error: 'Invalid subject name' });
    }
    await supabaseStore.resetAttendance(userId, subjectName);
    return { success: true };
  });
};
