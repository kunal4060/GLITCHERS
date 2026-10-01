import type { FastifyPluginAsync } from 'fastify';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

interface CustomCalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  source: 'MANUAL';
}

// NOTE: in-memory only. There is no `calendar_events` table in Supabase yet —
// these custom events are lost on restart until a `calendar_events` migration lands.
const customEventsDb = new Map<string, CustomCalendarEvent[]>();

export const calendarRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    // M7 fix: read from the persistent stores (Supabase via supabaseStore,
    // which itself falls back to its in-memory cache) instead of inMemoryStore alone.
    const classes = await supabaseStore.getClasses(userId);
    const tasks = await supabaseStore.getTasks(userId);
    const customEvents = customEventsDb.get(userId) || [];

    // Synthesize calendar events from recurring classes, tasks, and custom events
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
      ...customEvents.map((e) => ({
        id: e.id,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        location: e.location,
        source: e.source,
      })),
    ];

    return { events };
  });

  fastify.post<{ Body: { title: string; startTime: string; endTime: string; location?: string } }>(
    '/events',
    async (req, reply) => {
      const userId = req.userId!;
      const { title, startTime, endTime, location } = req.body || {};
      if (!title || !startTime || !endTime) {
        return reply.status(400).send({ error: 'Title, startTime, and endTime are required' });
      }

      const event: CustomCalendarEvent = {
        id: randomUUID(),
        title,
        startTime,
        endTime,
        location: location || null,
        source: 'MANUAL',
      };

      // M8 fix: actually persist the event (in-memory Map keyed by userId,
      // same pattern as documents.ts) instead of just echoing it back.
      const userEvents = customEventsDb.get(userId) || [];
      userEvents.push(event);
      customEventsDb.set(userId, userEvents);

      return { event };
    }
  );

  fastify.post('/sync-google', async (_req, reply) => {
    // M2 fix: honest 501 — there is no Google Calendar sync implementation.
    // Never report fake success.
    return reply.status(501).send({ error: 'Google Calendar sync is not implemented yet' });
  });
};
