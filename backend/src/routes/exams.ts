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

    // M19: validate date/time instead of storing raw strings
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) {
      return reply.status(400).send({ error: 'date must be a valid YYYY-MM-DD date' });
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return reply.status(400).send({ error: 'time must be a valid HH:MM time' });
    }
    const validImportance: Array<Exam['importance']> = ['NORMAL', 'HIGH', 'CRITICAL'];
    if (importance && !validImportance.includes(importance)) {
      return reply.status(400).send({ error: `Invalid importance. Must be one of: ${validImportance.join(', ')}` });
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
    // M19: report 404 when nothing was actually deleted instead of always claiming success
    const deleted = await supabaseStore.deleteExam(userId, id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Exam not found' });
    }
    return { success: true };
  });
};
