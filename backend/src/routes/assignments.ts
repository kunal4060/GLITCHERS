import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Assignment } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export const assignmentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const assignments = inMemoryStore.assignments.get(userId) || [
      {
        id: 'as_1',
        userId,
        title: 'Machine Learning Project Proposal',
        subject: 'Artificial Intelligence',
        description: 'Submit 3-page problem formulation and dataset selection.',
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        submissionPlatform: 'Moodle Portal',
        priority: 'HIGH',
        status: 'PENDING',
      },
      {
        id: 'as_2',
        userId,
        title: 'DBMS Normalization & BCNF Query Sheet',
        subject: 'Database Management Systems',
        description: 'Decompose schemas into 3NF and BCNF with functional dependencies.',
        deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
        submissionPlatform: 'Google Classroom',
        priority: 'HIGH',
        status: 'PENDING',
      },
    ];
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

    const assignments = inMemoryStore.assignments.get(userId) || [];
    assignments.push(newAssignment);
    inMemoryStore.assignments.set(userId, assignments);

    return { assignment: newAssignment };
  });

  fastify.patch<{ Params: { id: string }; Body: { status?: Assignment['status'] } }>('/:id/status', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { status } = req.body || {};
    const assignments = inMemoryStore.assignments.get(userId) || [];
    const assignment = assignments.find((a) => a.id === id);

    if (!assignment) return reply.status(404).send({ error: 'Assignment not found' });
    if (status) assignment.status = status;

    return { assignment };
  });
};
