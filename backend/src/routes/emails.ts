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
import { env } from '../config/env.js';

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

  fastify.post('/summarize', async (req) => {
    const userId = req.userId!;
    const emails = inMemoryStore.emails.get(userId) || [];

    if (emails.length === 0) {
      return {
        bullets: ['No new emails or university announcements found.'],
        summary: 'Your inbox is clear of academic notices.',
        count: 0,
      };
    }

    // Try summarizing using Gemini 3.6 Flash
    if (env.GEMINI_API_KEY && !env.GEMINI_API_KEY.startsWith('dev-')) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

        const emailText = emails
          .map((e, idx) => `[Email ${idx + 1}] Subject: ${e.subject}\nSender: ${e.sender}\nUrgency: ${e.importance}\nContent: ${e.summary}`)
          .join('\n\n');

        const prompt = `You are an AI university email summarizer for a college student.
Below are the recent official university emails:

${emailText}

Task:
Summarize all the emails into 3 to 4 concise, high-impact bullet points for the student dashboard.
Each bullet point MUST start with "• " and clearly highlight:
- Key action required or announcement
- Any specific deadline, dates, time, or location
- Urgency level if critical/high

Do not include greetings or markdown headers, just the list of bullet points.`;

        let reply = '';
        for (const modelName of ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash']) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const res = await model.generateContent(prompt);
            reply = res.response.text();
            if (reply && reply.trim()) break;
          } catch (mErr: any) {
            console.warn(`Email summarizer model ${modelName} failed (${mErr.message}), trying next...`);
          }
        }

        const text = reply;
        const lines = text
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'))
          .map((l) => '• ' + l.replace(/^[-*•]\s*/, '').trim());

        if (lines.length > 0) {
          return {
            bullets: lines,
            summary: text,
            count: emails.length,
          };
        }
      } catch (err) {
        console.warn('Gemini email summarization failed, falling back to local summaries:', err);
      }
    }

    // Deterministic fallback
    const bullets = emails.map((e) => {
      const imp = e.importance === 'HIGH' || e.importance === 'CRITICAL' ? `[${e.importance}] ` : '';
      return `• ${imp}**${e.subject}**: ${e.summary}`;
    });

    return {
      bullets,
      summary: bullets.join('\n'),
      count: emails.length,
    };
  });
};

