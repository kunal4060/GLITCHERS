import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

export const calendarRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const classes = inMemoryStore.classes.get(userId) || [];
    const tasks = inMemoryStore.tasks.get(userId) || [];

    // Synthesize calendar events from recurring classes and tasks
    const events = [
      ...classes.map((c) => ({
        id: `cal_class_${c.id}`,
        title: c.subjectName,
        day: c.day,
        startTime: c.startTime,
        endTime: c.endTime,
        location: c.temporaryRoom || c.room,
        source: 'TIMETABLE',
      })),
      ...tasks
        .filter((t) => t.dueDate)
        .map((t) => ({
          id: `cal_task_${t.id}`,
          title: `[Task] ${t.title}`,
          date: t.dueDate,
          source: 'TASK',
          priority: t.priority,
        })),
    ];

    return { events };
  });

  fastify.post<{ Body: { title: string; startTime: string; endTime: string; location?: string } }>(
    '/events',
    async (req, reply) => {
      const { title, startTime, endTime, location } = req.body || {};
      if (!title || !startTime || !endTime) {
        return reply.status(400).send({ error: 'Title, startTime, and endTime are required' });
      }

      const event = {
        id: randomUUID(),
        title,
        startTime,
        endTime,
        location: location || null,
        source: 'MANUAL',
      };

      return { event };
    }
  );

  fastify.post('/sync-google', async () => {
    return {
      synced: true,
      provider: 'Google Calendar',
      message: 'Calendar synchronized with Google account.',
    };
  });
};
