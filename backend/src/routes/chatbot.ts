import type { FastifyPluginAsync } from 'fastify';
import { geminiAssistant } from '../services/gemini/geminiClient.js';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';

export const chatbotRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/history', async (req) => {
    const userId = req.userId!;
    const messages = await supabaseStore.getChatHistory(userId);
    return { messages };
  });

  fastify.post<{ Body: { message: string } }>('/chat', async (req, reply) => {
    const userId = req.userId!;
    const { message } = req.body || {};

    if (!message || typeof message !== 'string') {
      return reply.status(400).send({ error: 'Valid message string is required' });
    }

    // Persist user prompt in cloud chat history
    await supabaseStore.saveChatMessage(userId, 'user', message);

    const response = await geminiAssistant.processStudentQuery(userId, message);

    // Persist assistant reply in cloud chat history
    await supabaseStore.saveChatMessage(
      userId,
      'assistant',
      response.message || '',
      response.data || response.confirmationPayload
    );

    return response;
  });

  fastify.delete('/history', async (req) => {
    const userId = req.userId!;
    await supabaseStore.clearChatHistory(userId);
    return { success: true };
  });
};
