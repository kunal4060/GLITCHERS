import type { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { geminiAssistant } from '../services/gemini/geminiClient.js';
import { randomUUID } from 'crypto';

interface DocumentRecord {
  id: string;
  userId: string;
  title: string;
  type: string;
  fileUrl?: string;
  content?: string | null;
  extractedDeadline?: string | null;
  extractedNotes?: string | null;
  actionItem?: string;
  processed?: boolean;
  createdAt: string;
}

// NOTE: in-memory only until a `documents` table migration lands in Supabase.
const documentsDb = new Map<string, DocumentRecord[]>();

const DOC_EXTRACTION_PROMPT = `You are analyzing a university document (circular, notice, syllabus, or assignment guideline) for a student.
Extract the following as JSON ONLY (no markdown, no extra text):
{
  "deadline": "YYYY-MM-DD or null if none found",
  "keyPoints": ["2-4 most important points"],
  "actionItem": "one concrete action the student should take, or null"
}`;

function tryParseExtraction(text: string): { deadline: string | null; notes: string; action: string | null } {
  try {
    const m = /\{[\s\S]*\}/.exec(text);
    if (!m) throw new Error('no json');
    const j = JSON.parse(m[0]);
    const notes = Array.isArray(j.keyPoints) ? j.keyPoints.join(' • ') : text.slice(0, 500);
    return {
      deadline: typeof j.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(j.deadline) ? j.deadline : null,
      notes,
      action: typeof j.actionItem === 'string' ? j.actionItem : null,
    };
  } catch {
    return { deadline: null, notes: text.slice(0, 500), action: null };
  }
}

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    // M3 fix: no fake sample documents. Return the user's own uploads, or nothing.
    const docs = documentsDb.get(userId) || [];
    return { documents: docs };
  });

  fastify.post<{ Body: { title: string; content?: string; type?: string; fileBase64?: string; mimeType?: string } }>('/upload', async (req, reply) => {
    const userId = req.userId!;
    const { title, content, type, fileBase64, mimeType } = req.body || {};

    if (!title) {
      return reply.status(400).send({ error: 'Document title is required' });
    }

    // Real AI extraction for image documents (photo of a circular/notice).
    // PDFs and other files are stored honestly without fake AI claims.
    let extractedDeadline: string | null = null;
    let extractedNotes: string | null = 'Uploaded — AI extraction not run for this file type.';
    let actionItem: string | undefined = `Review submission requirements for ${title}`;
    let processed = false;

    const cleanBase64 = (fileBase64 || '').replace(/^data:[a-z]+\/[a-z0-9.+-]+;base64,/, '');
    if (cleanBase64 && (mimeType || '').startsWith('image/')) {
      try {
        const ai = await geminiAssistant.analyzeStudentImage(userId, cleanBase64, mimeType!, DOC_EXTRACTION_PROMPT);
        const parsed = tryParseExtraction(ai.message);
        extractedDeadline = parsed.deadline;
        extractedNotes = parsed.notes || ai.message.slice(0, 500);
        if (parsed.action) actionItem = parsed.action;
        processed = true;
      } catch (err: any) {
        extractedNotes = `AI extraction failed: ${err?.message || 'unknown error'}. Document stored.`;
      }
    }

    const newDoc: DocumentRecord = {
      id: randomUUID(),
      userId,
      title,
      type: type || 'PDF',
      content: content ?? null,
      extractedDeadline,
      extractedNotes,
      actionItem,
      processed,
      createdAt: new Date().toISOString(),
    };

    const userDocs = documentsDb.get(userId) || [];
    userDocs.unshift(newDoc);
    documentsDb.set(userId, userDocs);

    return { document: newDoc };
  });
};
