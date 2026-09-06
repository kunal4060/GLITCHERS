import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  isUniversityEmail,
  parseScheduleChangeNotice,
  classifyEmailUrgency,
} from '../services/email/emailProcessor.js';
import type { EmailSummary } from '@glitchers/shared';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';
import { googleService } from '../services/google/googleService.js';

function getDefaultUniversityCirculars(userId: string): EmailSummary[] {
  return [
    {
      id: randomUUID(),
      userId,
      providerMessageId: `uni_circ_${Date.now()}_1`,
      sender: 'dean.academics@university.edu',
      subject: '🔴 Semester End Examination Schedule & Hall Ticket Issuance',
      receivedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      isUniversityRelated: true,
      importance: 'CRITICAL',
      summary: 'Semester End Exams commence from the 22nd. Verify your registered elective courses and download hall tickets before the deadline.',
      actionRequired: true,
      actionItem: 'Download hall ticket and verify course codes',
      isProcessed: false,
      isDismissed: false,
    },
    {
      id: randomUUID(),
      userId,
      providerMessageId: `uni_circ_${Date.now()}_2`,
      sender: 'department.head@university.edu',
      subject: '⚠️ Continuous Internal Assessment & OS Lab Submission Due',
      receivedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      isUniversityRelated: true,
      importance: 'HIGH',
      summary: 'All students must push their Operating Systems lab projects and assignment reports to the university portal by Friday 5:00 PM.',
      actionRequired: true,
      actionItem: 'Submit lab code and report',
      isProcessed: false,
      isDismissed: false,
    },
    {
      id: randomUUID(),
      userId,
      providerMessageId: `uni_circ_${Date.now()}_3`,
      sender: 'events@university.edu',
      subject: '📢 Annual University Hackathon & Innovation Showcase',
      receivedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      isUniversityRelated: true,
      importance: 'NORMAL',
      summary: 'Registrations are open for the annual 36-hour inter-college hackathon. Cash prizes and internship fast-tracks for top 3 teams.',
      actionRequired: false,
      isProcessed: false,
      isDismissed: false,
    },
  ];
}

export const emailRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  async function syncGmailIfAvailable(userId: string) {
    inMemoryStore.ensureStudentData(userId);
    const token = googleService.getUserAccessToken(userId);
    if (!token) return;

    try {
      const realMsgs = await googleService.fetchRecentEmails(token, 8);
      if (realMsgs && realMsgs.length > 0) {
        const prefs = inMemoryStore.preferences.get(userId);
        const domain = prefs?.universityDomain || 'university.edu';
        const formatted: EmailSummary[] = realMsgs.map((re) => {
          const isUni = isUniversityEmail(re.sender, domain);
          const urgency = classifyEmailUrgency(re.subject, re.snippet);
          const sched = parseScheduleChangeNotice(re.subject, re.snippet);
          return {
            id: re.id,
            userId,
            providerMessageId: re.id,
            sender: re.sender,
            subject: re.subject,
            receivedAt: re.date,
            isUniversityRelated: isUni,
            importance: urgency,
            summary: re.snippet || re.subject,
            actionRequired: sched.hasScheduleChange || urgency === 'CRITICAL' || urgency === 'HIGH',
            actionItem: sched.hasScheduleChange ? 'Schedule notice from faculty' : undefined,
            isProcessed: false,
            isDismissed: false,
          };
        });
        await supabaseStore.saveEmails(userId, formatted);
      }
    } catch (err) {
      console.warn('Gmail sync warning:', err);
    }
  }

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    await syncGmailIfAvailable(userId);
    let emails = await supabaseStore.getEmails(userId);

    // If student has no emails yet, initialize default circulars in Supabase
    if (emails.length === 0) {
      const defaults = getDefaultUniversityCirculars(userId);
      await supabaseStore.saveEmails(userId, defaults);
      emails = defaults;
    }

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

    const currentEmails = await supabaseStore.getEmails(userId);
    await supabaseStore.saveEmails(userId, [emailSummary, ...currentEmails]);

    return {
      success: true,
      emailSummary,
    };
  });

  fastify.patch<{ Params: { id: string }; Body: { dismissed?: boolean } }>('/:id/dismiss', async (req) => {
    const userId = req.userId!;
    const { id } = req.params;
    const dismissed = req.body?.dismissed !== false;
    await supabaseStore.dismissEmail(userId, id, dismissed);
    return { success: true, id, dismissed, isDismissed: dismissed };
  });

  const handleSummarize = async (req: any) => {
    const userId = req.userId!;
    const clientEmails: EmailSummary[] | undefined = req.body?.emails;

    let allEmails: EmailSummary[];
    if (clientEmails && Array.isArray(clientEmails) && clientEmails.length > 0) {
      allEmails = clientEmails;
      await supabaseStore.saveEmails(userId, clientEmails).catch(() => null);
    } else {
      await syncGmailIfAvailable(userId);
      allEmails = await supabaseStore.getEmails(userId);

      if (allEmails.length === 0) {
        const defaults = getDefaultUniversityCirculars(userId);
        await supabaseStore.saveEmails(userId, defaults);
        allEmails = defaults;
      }
    }

    // Only summarize active (non-dismissed) notices
    const emails = allEmails.filter((e) => !e.isDismissed && !(e as any).processed);

    if (emails.length === 0) {
      return {
        bullets: ['All university circulars and notices have been acknowledged & cleared! 🎉'],
        summary: 'Your notices inbox is clear.',
        count: 0,
      };
    }

    // Try summarizing using Gemini with candidate models fallback
    if (env.GEMINI_API_KEY && !env.GEMINI_API_KEY.startsWith('dev-')) {
      const CANDIDATE_MODELS = [
        'gemini-3.6-flash',
        'gemini-flash-latest',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
      ];
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

        const emailText = emails
          .map((e, idx) => `[Notice ${idx + 1}] Subject: ${e.subject}\nSender: ${e.sender}\nUrgency: ${e.importance}\nContent: ${e.summary}`)
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

Do not include markdown bold asterisks (no **), greetings, or markdown headers, just the list of bullet points starting with "• ".`;

        for (const modelName of CANDIDATE_MODELS) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const generatePromise = model.generateContent(prompt).then((res) => res.response.text());
            const timeoutPromise = new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error('Gemini summarization timeout')), 10000)
            );

            const reply = await Promise.race([generatePromise, timeoutPromise]);
            if (reply && reply.trim()) {
              const lines = reply
                .split('\n')
                .map((l) => l.trim())
                .filter((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'))
                .map((l) => '• ' + l.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').trim());

              if (lines.length > 0) {
                return {
                  bullets: lines,
                  summary: reply,
                  count: emails.length,
                };
              }
            }
          } catch (modelErr: any) {
            console.warn(`Gemini email summarizer ${modelName} failed (${modelErr.message}), trying next...`);
          }
        }
      } catch (err: any) {
        console.warn('Gemini email summarization fallback:', err?.message || err);
      }
    }

    // Deterministic fallback using the actual active circulars
    const bullets = emails.slice(0, 4).map((e) => {
      const imp = e.importance === 'HIGH' || e.importance === 'CRITICAL' ? `[${e.importance}] ` : '';
      return `• ${imp}${e.subject}: ${e.summary}`;
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

