import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Exam } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export const examRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const exams = inMemoryStore.exams.get(userId) || [
      {
        id: 'ex_1',
        userId,
        subject: 'Database Management Systems (DBMS)',
        date: '2026-09-15',
        time: '10:00',
        room: 'Exam Hall 3 (Block A)',
        syllabus: 'Modules 1-4: Relational Algebra, SQL, Normalization, Transactions',
        importance: 'CRITICAL',
      },
      {
        id: 'ex_2',
        userId,
        subject: 'Operating Systems',
        date: '2026-09-18',
        time: '14:00',
        room: 'Exam Hall 1 (Block B)',
        syllabus: 'Processes, CPU Scheduling, Synchronization, Memory Management',
        importance: 'CRITICAL',
      },
    ];
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

    const newExam: Exam = {
      id: randomUUID(),
      userId,
      subject,
      date,
      time,
      room: room || null,
      syllabus: syllabus || null,
      importance: importance || 'CRITICAL',
    };

    const exams = inMemoryStore.exams.get(userId) || [];
    exams.push(newExam);
    inMemoryStore.exams.set(userId, exams);

    return { exam: newExam };
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const exams = inMemoryStore.exams.get(userId) || [];
    const filtered = exams.filter((e) => e.id !== id);
    inMemoryStore.exams.set(userId, filtered);
    return { success: true };
  });
};
