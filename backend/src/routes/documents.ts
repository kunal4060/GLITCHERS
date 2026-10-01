import type { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
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

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    // M3 fix: no fake sample documents. Return the user's own uploads, or nothing.
    const docs = documentsDb.get(userId) || [];
    return { documents: docs };
  });

  fastify.post<{ Body: { title: string; content?: string; type?: string } }>('/upload', async (req, reply) => {
    const userId = req.userId!;
    const { title, content, type } = req.body || {};

    if (!title) {
      return reply.status(400).send({ error: 'Document title is required' });
    }

    // M4 fix: actually store the provided content. Never claim AI ran when it didn't.
    const newDoc: DocumentRecord = {
      id: randomUUID(),
      userId,
      title,
      type: type || 'PDF',
      content: content ?? null,
      extractedDeadline: null,
      extractedNotes: 'Uploaded — AI extraction not run.',
      processed: false,
      actionItem: `Review submission requirements for ${title}`,
      createdAt: new Date().toISOString(),
    };

    const userDocs = documentsDb.get(userId) || [];
    userDocs.unshift(newDoc);
    documentsDb.set(userId, userDocs);

    return { document: newDoc };
  });
};
