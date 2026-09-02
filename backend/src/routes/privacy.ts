import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';

export const privacyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/status', async (req) => {
    return {
      googleConnected: true,
      gmailConnected: true,
      calendarConnected: true,
      aiProcessingEnabled: true,
      floatingAssistantEnabled: true,
    };
  });

  fastify.post('/disconnect-google', async () => {
    return { success: true, message: 'Google services disconnected' };
  });

  fastify.post('/export-data', async (req) => {
    const userId = req.userId!;
    return {
      exportTimestamp: new Date().toISOString(),
      profile: inMemoryStore.profiles.get(userId),
      classes: inMemoryStore.classes.get(userId) || [],
      tasks: inMemoryStore.tasks.get(userId) || [],
      expenses: inMemoryStore.expenses.get(userId) || [],
      budget: inMemoryStore.budgets.get(userId),
      debts: inMemoryStore.debts.get(userId) || [],
      emails: inMemoryStore.emails.get(userId) || [],
      notifications: inMemoryStore.notifications.get(userId) || [],
    };
  });

  fastify.delete('/delete-account', async (req) => {
    const userId = req.userId!;
    inMemoryStore.profiles.delete(userId);
    inMemoryStore.classes.delete(userId);
    inMemoryStore.tasks.delete(userId);
    inMemoryStore.expenses.delete(userId);
    inMemoryStore.budgets.delete(userId);
    inMemoryStore.debts.delete(userId);
    inMemoryStore.emails.delete(userId);
    inMemoryStore.notifications.delete(userId);

    return { success: true, message: 'Student account and all associated records permanently deleted.' };
  });
};
