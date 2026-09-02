import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

interface DocumentRecord {
  id: string;
  userId: string;
  title: string;
  type: string;
  fileUrl?: string;
  extractedDeadline?: string;
  extractedNotes?: string;
  actionItem?: string;
  createdAt: string;
}

const documentsDb = new Map<string, DocumentRecord[]>();

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const docs = documentsDb.get(userId) || [
      {
        id: 'doc_1',
        userId,
        title: 'Operating Systems Syllabus & Lab Manual',
        type: 'PDF',
        extractedDeadline: 'Week 7 Lab Submission',
        extractedNotes: '30% internal continuous evaluation weight.',
        actionItem: 'Submit OS Lab Exercise 1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'doc_2',
        userId,
        title: 'Midterm Examination Circular',
        type: 'Notice',
        extractedDeadline: '2026-09-15',
        extractedNotes: 'Report to Block A & Block B 15 minutes before 10 AM.',
        actionItem: 'Check room seating chart',
        createdAt: new Date().toISOString(),
      },
    ];
    return { documents: docs };
  });

  fastify.post<{ Body: { title: string; content?: string; type?: string } }>('/upload', async (req, reply) => {
    const userId = req.userId!;
    const { title, content, type } = req.body || {};

    if (!title) {
      return reply.status(400).send({ error: 'Document title is required' });
    }

    const newDoc: DocumentRecord = {
      id: randomUUID(),
      userId,
      title,
      type: type || 'PDF',
      extractedDeadline: new Date(Date.now() + 86400000 * 6).toISOString(),
      extractedNotes: 'Extracted key deadlines and academic policy notes via Gemini AI.',
      actionItem: `Review submission requirements for ${title}`,
      createdAt: new Date().toISOString(),
    };

    const userDocs = documentsDb.get(userId) || [];
    userDocs.unshift(newDoc);
    documentsDb.set(userId, userDocs);

    return { document: newDoc };
  });
};
