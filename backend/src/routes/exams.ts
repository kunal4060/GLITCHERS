import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Exam } from '@glitchers/shared';

export const examRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const exams = await supabaseStore.getExams(userId);
    return { exams };
  });

  fastify.post<{
    Body: { subject: string; date: string; time: string; room?: string; syllabus?: string; importance?: Exam['importance'] };
  }>('/', async (req, reply) => {
    const userId = req.userId!;
    const { subject, date, time, room, syllabus, importance } = req.body || {};

    if (!subject || !date || !time) {
      return reply.status(400).send({ error: 'Subject, date, and time are required' });
    }

    const created = await supabaseStore.createExam(userId, {
      subject,
      date,
      time,
      room: room || null,
      syllabus: syllabus || null,
      importance: importance || 'CRITICAL',
    });

    return { exam: created };
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    await supabaseStore.deleteExam(userId, id);
    return { success: true };
  });
};
