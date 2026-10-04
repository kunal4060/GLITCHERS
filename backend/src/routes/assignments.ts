import type { FastifyPluginAsync } from 'fastify';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Assignment } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export const assignmentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const assignments = await supabaseStore.getAssignments(userId);
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

    // M16: validate priority against the enum so memory/DB can't diverge
    const validPriorities: Array<Assignment['priority']> = ['LOW', 'NORMAL', 'HIGH', 'EXTREMELY_IMPORTANT'];
    if (priority && !validPriorities.includes(priority)) {
      return reply.status(400).send({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
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

    const assignment = await supabaseStore.saveAssignment(userId, newAssignment);

    return { assignment };
  });

  fastify.patch<{ Params: { id: string }; Body: { status?: Assignment['status'] } }>('/:id/status', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status) {
      const assignments = await supabaseStore.getAssignments(userId);
      const found = assignments.find((a) => a.id === id);
      if (!found) return reply.status(404).send({ error: 'Assignment not found' });
      return { assignment: found };
    }

    // M16: validate status against the enum
    const validStatuses: Array<Assignment['status']> = ['PENDING', 'SUBMITTED', 'GRADED'];
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const assignment = await supabaseStore.updateAssignmentStatus(userId, id, status);

    if (!assignment) return reply.status(404).send({ error: 'Assignment not found' });

    return { assignment };
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;

    const assignments = await supabaseStore.getAssignments(userId);
    if (!assignments.some((a) => a.id === id)) {
      return reply.status(404).send({ error: 'Assignment not found' });
    }

    await supabaseStore.deleteAssignment(userId, id);
    return { success: true, id };
  });
};
