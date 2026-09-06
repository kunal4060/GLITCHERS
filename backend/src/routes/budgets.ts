import type { FastifyPluginAsync } from 'fastify';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateBudgetStatus, calculateBurnRateForecast } from '../services/finance/calculator.js';
import type { Budget } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export const budgetRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/current', async (req) => {
    const userId = req.userId!;
    const budget = await supabaseStore.getBudget(userId);
    const expenses = await supabaseStore.getExpenses(userId);

    if (!budget) {
      return {
        configured: false,
        status: null,
        burnRateForecast: null,
      };
    }

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    const status = calculateBudgetStatus(budget, expenses);
    const burnRateForecast = calculateBurnRateForecast(budget, expenses, daysPassed, daysRemaining);

    return {
      configured: true,
      budget,
      status,
      burnRateForecast,
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

    const savedBudget = await supabaseStore.saveBudget(userId, budget);
    const expenses = await supabaseStore.getExpenses(userId);
    const status = calculateBudgetStatus(savedBudget, expenses);

    return {
      budget: savedBudget,
      status,
    };
  });
};
