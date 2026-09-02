import type { FastifyPluginAsync } from 'fastify';
import { geminiAssistant } from '../services/gemini/geminiClient.js';
import { authMiddleware } from '../middleware/auth.js';

export const chatbotRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.post<{ Body: { message: string } }>('/chat', async (req, reply) => {
    const userId = req.userId!;
    const { message } = req.body || {};

    if (!message || typeof message !== 'string') {
      return reply.status(400).send({ error: 'Valid message string is required' });
    }

    const response = await geminiAssistant.processStudentQuery(userId, message);
    return response;
  });
};
