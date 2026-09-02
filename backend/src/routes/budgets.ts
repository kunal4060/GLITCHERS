import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateBudgetStatus } from '../services/finance/calculator.js';
import type { Budget } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export const budgetRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/current', async (req) => {
    const userId = req.userId!;
    const budget = inMemoryStore.budgets.get(userId);
    const expenses = inMemoryStore.expenses.get(userId) || [];

    if (!budget) {
      return {
        configured: false,
        status: null,
      };
    }

    const status = calculateBudgetStatus(budget, expenses);
    return {
      configured: true,
      budget,
      status,
    };
  });

  fastify.post<{ Body: { monthlyLimit: number; categoryLimits?: Record<string, number> } }>('/', async (req, reply) => {
    const userId = req.userId!;
    const { monthlyLimit, categoryLimits } = req.body || {};

    if (!monthlyLimit || monthlyLimit <= 0) {
      return reply.status(400).send({ error: 'Valid monthlyLimit is required' });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const budget: Budget = {
      id: randomUUID(),
      userId,
      monthlyLimit: Number(monthlyLimit),
      currentSpending: 0,
      month: currentMonth,
      categoryLimits: categoryLimits || {},
      alertThresholds: [75, 90, 100],
    };

    inMemoryStore.budgets.set(userId, budget);
    const expenses = inMemoryStore.expenses.get(userId) || [];
    const status = calculateBudgetStatus(budget, expenses);

    return {
      budget,
      status,
    };
  });
};
