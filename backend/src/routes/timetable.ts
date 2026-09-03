import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { detectScheduleConflicts } from '../services/timetable/conflictDetector.js';
import { ClassSessionSchema, type ClassSession } from '@glitchers/shared';
import { randomUUID } from 'crypto';
import { extractClassesFromText } from '../services/timetable/timetableExtractor.js';

export const timetableRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/classes', async (req) => {
    const userId = req.userId!;
    const classes = inMemoryStore.classes.get(userId) || [];
    const conflicts = detectScheduleConflicts(classes);

    return {
      classes,
      conflicts,
    };
  });

  fastify.post<{ Body: any }>('/classes', async (req, reply) => {
    const userId = req.userId!;
    const parsed = ClassSessionSchema.omit({ id: true, userId: true }).safeParse(req.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid class payload', details: parsed.error.format() });
    }

    const newClass: ClassSession = {
      ...parsed.data,
      id: randomUUID(),
      userId,
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
    const text = req.body?.timetableText || 'Monday: 10:00 - 11:00 AM DBMS Lecture Room AB1-204 Dr. Sharma\nMonday: 14:00 - 16:00 OS Lab Room AB2-301 Prof. Verma';
    const extractedClasses = extractClassesFromText(text, userId);

    const currentClasses = inMemoryStore.classes.get(userId) || [];
    const merged = [...currentClasses, ...extractedClasses];
    inMemoryStore.classes.set(userId, merged);

    const conflicts = detectScheduleConflicts(merged);

    return {
      success: true,
      extractedCount: extractedClasses.length,
      extractedClasses,
      conflicts,
    };
  });

  fastify.post<{ Body: { imageBase64: string; mimeType?: string } }>('/analyze-image', async (req) => {
    const { imageBase64, mimeType } = req.body || {};
    const { geminiAssistant } = await import('../services/gemini/geminiClient.js');
    const result = await geminiAssistant.analyzeTimetableImage(imageBase64, mimeType);
    const conflicts = detectScheduleConflicts(result.classes as any);

    return {
      success: true,
      classes: result.classes,
      conflicts,
    };
  });

  fastify.post<{ Body: { classes: ClassSession[] } }>('/classes/bulk', async (req) => {
    const userId = req.userId!;
    const incomingClasses = req.body?.classes || [];

    const existing = inMemoryStore.classes.get(userId) || [];
    const merged = [...existing];

    for (const c of incomingClasses) {
      if (!merged.some((m) => m.day === c.day && m.startTime === c.startTime && m.subjectName.toLowerCase() === c.subjectName.toLowerCase())) {
        merged.push({
          ...c,
          id: c.id || randomUUID(),
          userId,
        });
      }
    }

    inMemoryStore.classes.set(userId, merged);
    const conflicts = detectScheduleConflicts(merged);

    return {
      success: true,
      savedCount: merged.length,
      classes: merged,
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
