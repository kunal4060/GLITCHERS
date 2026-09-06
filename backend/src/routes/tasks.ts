import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateReminderTimes } from '../services/tasks/reminderEngine.js';
import { geminiAssistant } from '../services/gemini/geminiClient.js';
import type { Task } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const tasks = await supabaseStore.getTasks(userId);
    return { tasks };
  });

  fastify.post<{ Body: { text?: string; title?: string; priority?: Task['priority']; dueDate?: string } }>(
    '/',
    async (req, reply) => {
      const userId = req.userId!;
      let title = req.body.title;
      let priority = req.body.priority || 'NORMAL';
      let dueDate = req.body.dueDate;

      if (req.body.text && !title) {
        const parsed = geminiAssistant.parseNaturalTask(req.body.text);
        title = parsed.title;
        priority = parsed.priority;
        dueDate = parsed.dueDate;
      }

      if (!title) {
        return reply.status(400).send({ error: 'Task title is required' });
      }

      const newTask: Task = {
        id: randomUUID(),
        userId,
        title,
        priority,
        status: 'TODO',
        dueDate: dueDate || null,
        createdAt: new Date().toISOString(),
      };

      const savedTask = await supabaseStore.createTask(userId, newTask);
      const reminders = generateReminderTimes(savedTask);

      return {
        task: savedTask,
        scheduledReminders: reminders,
      };
    }
  );

  fastify.patch<{ Params: { id: string }; Body: Partial<Task> }>('/:id', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const updatedTask = await supabaseStore.updateTask(userId, id, req.body);

    if (!updatedTask) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return { task: updatedTask };
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    await supabaseStore.deleteTask(userId, id);
    return { success: true };
  });

  fastify.get<{ Params: { id: string } }>('/:id/reminders', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const tasks = inMemoryStore.tasks.get(userId) || [];
    const task = tasks.find((t) => t.id === id);

    if (!task) return reply.status(404).send({ error: 'Task not found' });

    const reminders = generateReminderTimes(task);
    return { reminders };
  });
};
