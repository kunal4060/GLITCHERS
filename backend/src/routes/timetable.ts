import type { FastifyPluginAsync } from 'fastify';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { detectScheduleConflicts } from '../services/timetable/conflictDetector.js';
import { ClassSessionSchema, type ClassSession } from '@glitchers/shared';
import { randomUUID } from 'crypto';
import { extractClassesFromText } from '../services/timetable/timetableExtractor.js';

export const timetableRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/classes', async (req) => {
    const userId = req.userId!;
    const classes = await supabaseStore.getClasses(userId);
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

    const userClasses = await supabaseStore.getClasses(userId);
    userClasses.push(newClass);
    await supabaseStore.saveClasses(userId, userClasses);

    const conflicts = detectScheduleConflicts(userClasses);

    return {
      class: newClass,
      conflicts,
    };
  });

  fastify.post<{ Body: { timetableText?: string } }>('/upload', async (req, reply) => {
    const userId = req.userId!;
    const text = req.body?.timetableText;

    // M1 fix: never invent timetable data. The client must provide the text.
    if (!text || typeof text !== 'string' || !text.trim()) {
      return reply.status(400).send({ error: 'timetableText is required' });
    }

    const extractedClasses = extractClassesFromText(text, userId);

    const currentClasses = await supabaseStore.getClasses(userId);
    const merged = [...currentClasses, ...extractedClasses];
    await supabaseStore.saveClasses(userId, merged);

    const conflicts = detectScheduleConflicts(merged);

    return {
      success: true,
      extractedCount: extractedClasses.length,
      extractedClasses,
      conflicts,
    };
  });

  fastify.post<{ Body: { imageBase64: string; mimeType?: string } }>('/analyze-image', async (req, reply) => {
    try {
      const { imageBase64, mimeType } = req.body || {};
      if (!imageBase64) {
        return reply.code(400).send({ success: false, error: 'No image provided', classes: [], conflicts: [] });
      }
      const { geminiAssistant } = await import('../services/gemini/geminiClient.js');
      const result = await geminiAssistant.analyzeTimetableImage(imageBase64, mimeType);
      const conflicts = detectScheduleConflicts(result.classes as any);

      return {
        success: true,
        classes: result.classes,
        conflicts,
      };
    } catch (err: any) {
      console.error('Error analyzing timetable image:', err);
      return reply.code(500).send({
        success: false,
        error: err.message || 'Timetable analysis failed',
        classes: [],
        conflicts: [],
      });
    }
  });

  fastify.post<{ Body: { classes: ClassSession[] } }>('/classes/bulk', async (req) => {
    const userId = req.userId!;
    const incomingClasses = req.body?.classes || [];

    const existing = await supabaseStore.getClasses(userId);
    const merged = [...existing];

    // L6 fix: savedCount must reflect only newly inserted rows, not the merged total.
    let savedCount = 0;

    for (const c of incomingClasses) {
      // Null-guarded name comparison so malformed rows can't crash the dedup check.
      const incomingName = (c.subjectName || '').toLowerCase();
      if (!merged.some((m) => m.day === c.day && m.startTime === c.startTime && (m.subjectName || '').toLowerCase() === incomingName)) {
        merged.push({
          ...c,
          id: c.id || randomUUID(),
          userId,
        });
        savedCount += 1;
      }
    }

    await supabaseStore.saveClasses(userId, merged);
    const conflicts = detectScheduleConflicts(merged);

    return {
      success: true,
      savedCount,
      totalCount: merged.length,
      classes: merged,
      conflicts,
    };
  });

  fastify.post('/check-conflicts', async (req) => {
    const userId = req.userId!;
    const classes = await supabaseStore.getClasses(userId);
    const conflicts = detectScheduleConflicts(classes);
    return { conflicts };
  });

  fastify.delete<{ Params: { id: string } }>('/classes/:id', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const ok = await supabaseStore.deleteClass(userId, id);
    if (!ok) {
      return reply.status(500).send({ error: 'Delete failed, please try again' });
    }
    return { success: true, id };
  });
};
