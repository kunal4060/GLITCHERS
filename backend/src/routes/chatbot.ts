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

    // H6: reject absurd payloads before they hit the AI pipeline
    if (message.length > 20000) {
      return reply.status(413).send({ error: 'Message too large (max 20000 characters)' });
    }

    // M6 fix: never persist the user message before the Gemini call succeeds,
    // and never 500 on an AI failure. On error, store both messages with a
    // fallback assistant reply and return 200 — no orphan, no crash.
    try {
      const response = await geminiAssistant.processStudentQuery(userId, message);

      // Persist both messages only after a successful call
      await supabaseStore.saveChatMessage(userId, 'user', message);
      await supabaseStore.saveChatMessage(
        userId,
        'assistant',
        response.message || '',
        response.data || response.confirmationPayload
      );

      return response;
    } catch (err: any) {
      console.error('Chatbot /chat error:', err);
      const fallback = 'Sorry, I could not process that right now.';
      await supabaseStore.saveChatMessage(userId, 'user', message);
      await supabaseStore.saveChatMessage(userId, 'assistant', fallback);
      return {
        message: fallback,
        data: null,
        notice: 'AI service temporarily unavailable',
      };
    }
  });

  fastify.post<{ Body: { imageBase64: string; mimeType?: string; message?: string } }>('/analyze-image', async (req, reply) => {
    const userId = req.userId!;
    const { imageBase64, mimeType = 'image/jpeg', message = '' } = req.body || {};

    if (!imageBase64) {
      return reply.status(400).send({ error: 'imageBase64 string is required' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const userText = message ? `📷 [Photo]: ${message}` : '📷 [Uploaded Image for Analysis]';

    // Same M6 pattern as /chat: no orphan message, no 500 on AI failure.
    try {
      const response = await geminiAssistant.analyzeStudentImage(userId, cleanBase64, mimeType, message);

      await supabaseStore.saveChatMessage(userId, 'user', userText);
      await supabaseStore.saveChatMessage(
        userId,
        'assistant',
        response.message,
        response.expense ? { type: 'EXPENSE', data: response.expense } : undefined
      );

      return response;
    } catch (err: any) {
      console.error('Chatbot /analyze-image error:', err);
      const fallback = 'Sorry, I could not analyze that image right now.';
      await supabaseStore.saveChatMessage(userId, 'user', userText);
      await supabaseStore.saveChatMessage(userId, 'assistant', fallback);
      return {
        message: fallback,
        data: null,
        notice: 'AI service temporarily unavailable',
      };
    }
  });

  fastify.delete('/history', async (req) => {
    const userId = req.userId!;
    await supabaseStore.clearChatHistory(userId);
    return { success: true };
  });
};
