import type { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import type { Assignment } from '@glitchers/shared';
import { randomUUID } from 'crypto';

// NOTE: in-memory only. There is no `assignments` table in Supabase yet —
// assignments are lost on restart until an `assignments` migration lands.
const assignmentsDb = new Map<string, Assignment[]>();

export const assignmentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const assignments = assignmentsDb.get(userId) || [];
    return { assignments };
  });

  fastify.post<{
    Body: {
      title: string;
      subject: string;
      deadline: string;
      description?: string;
      submissionPlatform?: string;
      priority?: Assignment['priority'];
    };
  }>('/', async (req, reply) => {
    const userId = req.userId!;
    const { title, subject, deadline, description, submissionPlatform, priority } = req.body || {};

    if (!title || !subject || !deadline) {
      return reply.status(400).send({ error: 'Title, subject, and deadline are required' });
    }

    const newAssignment: Assignment = {
      id: randomUUID(),
      userId,
      title,
      subject,
      deadline,
      description: description || null,
      submissionPlatform: submissionPlatform || 'University Portal',
      priority: priority || 'HIGH',
      status: 'PENDING',
    };

    const assignments = assignmentsDb.get(userId) || [];
    assignments.push(newAssignment);
    assignmentsDb.set(userId, assignments);

    return { assignment: newAssignment };
  });

  fastify.patch<{ Params: { id: string }; Body: { status?: Assignment['status'] } }>('/:id/status', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { status } = req.body || {};
    const assignments = assignmentsDb.get(userId) || [];
    const assignment = assignments.find((a) => a.id === id);

    if (!assignment) return reply.status(404).send({ error: 'Assignment not found' });
    if (status) assignment.status = status;

    return { assignment };
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const assignments = assignmentsDb.get(userId) || [];
    const index = assignments.findIndex((a) => a.id === id);

    if (index === -1) {
      return reply.status(404).send({ error: 'Assignment not found' });
    }

    assignments.splice(index, 1);
    assignmentsDb.set(userId, assignments);
    return { success: true, id };
  });
};
