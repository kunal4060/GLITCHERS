import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  isUniversityEmail,
  parseScheduleChangeNotice,
  classifyEmailUrgency,
} from '../services/email/emailProcessor.js';
import type { EmailSummary } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export const emailRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const emails = inMemoryStore.emails.get(userId) || [];
    return { emails };
  });

  fastify.post<{
    Body: { sender: string; subject: string; body: string; providerMessageId?: string };
  }>('/sync', async (req, reply) => {
    const userId = req.userId!;
    const { sender, subject, body, providerMessageId } = req.body || {};

    if (!sender || !subject) {
      return reply.status(400).send({ error: 'Sender and subject are required' });
    }

    const prefs = inMemoryStore.preferences.get(userId);
    const domain = prefs?.universityDomain || 'university.edu';
    const isUni = isUniversityEmail(sender, domain);
    const urgency = classifyEmailUrgency(subject, body || '');
    const scheduleChange = parseScheduleChangeNotice(subject, body || '');

    const emailSummary: EmailSummary = {
      id: randomUUID(),
      userId,
      providerMessageId: providerMessageId || `msg_${Date.now()}`,
      sender,
      subject,
      receivedAt: new Date().toISOString(),
      isUniversityRelated: isUni,
      importance: urgency,
      summary: body ? body.slice(0, 150) + (body.length > 150 ? '...' : '') : subject,
      actionRequired: scheduleChange.hasScheduleChange || urgency === 'CRITICAL' || urgency === 'HIGH',
      actionItem: scheduleChange.hasScheduleChange ? 'Schedule updated per faculty notice' : undefined,
      scheduleChange: scheduleChange.hasScheduleChange ? scheduleChange : undefined,
      isProcessed: true,
    };

    const emails = inMemoryStore.emails.get(userId) || [];
    emails.unshift(emailSummary);
    inMemoryStore.emails.set(userId, emails);

    // If schedule change detected, update class or notify
    if (scheduleChange.hasScheduleChange && scheduleChange.newRoom) {
      const classes = inMemoryStore.classes.get(userId) || [];
      const match = classes.find((c) => subject.toLowerCase().includes(c.subjectName.toLowerCase()));
      if (match) {
        match.temporaryRoom = scheduleChange.newRoom;
      }
    }

    return {
      success: true,
      emailSummary,
    };
  });
};
