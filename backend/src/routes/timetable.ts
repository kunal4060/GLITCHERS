import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { detectScheduleConflicts } from '../services/timetable/conflictDetector.js';
import { ClassSessionSchema } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export const timetableRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/classes', async (req) => {
    const userId = req.userId!;
    const classes = inMemoryStore.classes.get(userId) || [];
    return { classes };
  });

  fastify.post<{ Body: any }>('/classes', async (req, reply) => {
    const userId = req.userId!;
    const validation = ClassSessionSchema.omit({ id: true, userId: true }).safeParse(req.body);
    if (!validation.success) {
      return reply.status(400).send({ error: validation.error.format() });
    }

    const newClass = {
      id: randomUUID(),
      userId,
      ...validation.data,
    };

    const userClasses = inMemoryStore.classes.get(userId) || [];
    userClasses.push(newClass);
    inMemoryStore.classes.set(userId, userClasses);

    const conflicts = detectScheduleConflicts(userClasses);

    return {
      class: newClass,
      conflicts,
    };
  });

  fastify.post<{ Body: { timetableText?: string } }>('/upload', async (req) => {
    const userId = req.userId!;
    const extractedClasses = [
      {
        id: randomUUID(),
        userId,
        subjectName: 'Computer Networks',
        day: 'WEDNESDAY' as const,
        startTime: '10:00',
        endTime: '11:00',
        room: 'AB1-305',
        faculty: 'Dr. Nair',
        classType: 'LECTURE' as const,
        isCancelled: false,
      },
      {
        id: randomUUID(),
        userId,
        subjectName: 'Software Engineering',
        day: 'THURSDAY' as const,
        startTime: '14:00',
        endTime: '15:00',
        room: 'AB2-102',
        faculty: 'Prof. Roy',
        classType: 'LECTURE' as const,
        isCancelled: false,
      },
    ];

    const currentClasses = inMemoryStore.classes.get(userId) || [];
    const combined = [...currentClasses, ...extractedClasses];
    inMemoryStore.classes.set(userId, combined);

    const conflicts = detectScheduleConflicts(combined);

    return {
      success: true,
      extractedCount: extractedClasses.length,
      extractedClasses,
      conflicts,
    };
  });

  fastify.post('/check-conflicts', async (req) => {
    const userId = req.userId!;
    const classes = inMemoryStore.classes.get(userId) || [];
    const conflicts = detectScheduleConflicts(classes);
    return { conflicts };
  });
};
