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
    inMemoryStore.ensureStudentData(userId);
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

  const handleSummarize = async (req: any) => {
    const userId = req.userId!;
    inMemoryStore.ensureStudentData(userId);
    const emails = inMemoryStore.emails.get(userId) || [];

    if (emails.length === 0) {
      return {
        bullets: ['No new emails or university announcements found.'],
        summary: 'Your inbox is clear of academic notices.',
        count: 0,
      };
    }

    // Try summarizing using Gemini 3.6 Flash with 4-second timeout
    if (env.GEMINI_API_KEY && !env.GEMINI_API_KEY.startsWith('dev-')) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

        const emailText = emails
          .map((e, idx) => `[Email ${idx + 1}] Subject: ${e.subject}\nSender: ${e.sender}\nUrgency: ${e.importance}\nContent: ${e.summary}`)
          .join('\n\n');

        const prompt = `You are an AI university email summarizer for a college student.
Below are recent official university circulars:

${emailText}

Task:
Summarize the emails into 3 to 4 concise, high-impact bullet points for the student dashboard.
Each bullet point MUST start with "• " and clearly highlight:
- Key action required or announcement
- Any specific deadline, dates, time, or location
- Urgency level if critical/high

Do not include greetings or markdown headers, just the list of bullet points.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        const generatePromise = model.generateContent(prompt).then((res) => res.response.text());
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini summarization timeout')), 4000)
        );

        const reply = await Promise.race([generatePromise, timeoutPromise]);
        if (reply && reply.trim()) {
          const lines = reply
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'))
            .map((l) => '• ' + l.replace(/^[-*•]\s*/, '').trim());

          if (lines.length > 0) {
            return {
              bullets: lines,
              summary: reply,
              count: emails.length,
            };
          }
        }
      } catch (err: any) {
        console.warn('Gemini email summarization fallback:', err?.message || err);
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
  };

  fastify.get('/summarize', handleSummarize);
  fastify.post('/summarize', handleSummarize);
};

