import type { FastifyPluginAsync } from 'fastify';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { getISTNow, getISTDateStr } from '../utils/dates.js';
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

    const now = getISTNow();
    const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
    const daysPassed = now.getUTCDate();
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

    // M17: reject Infinity/NaN and validate categoryLimits
    const limit = Number(monthlyLimit);
    if (!Number.isFinite(limit) || limit <= 0) {
      return reply.status(400).send({ error: 'Valid monthlyLimit is required' });
    }
    let cleanCategoryLimits: Record<string, number> = {};
    if (categoryLimits && typeof categoryLimits === 'object') {
      for (const [k, v] of Object.entries(categoryLimits)) {
        const n = Number(v);
        if (typeof k === 'string' && k.trim() && Number.isFinite(n) && n >= 0) {
          cleanCategoryLimits[k.trim()] = n;
        }
      }
    }

    const currentMonth = getISTDateStr().slice(0, 7);
    const budget: Budget = {
      id: randomUUID(),
      userId,
      monthlyLimit: limit,
      currentSpending: 0,
      month: currentMonth,
      categoryLimits: cleanCategoryLimits,
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

  // M1 (mobile): clear the user's budget.
  fastify.delete('/', async (req) => {
    const userId = req.userId!;
    await supabaseStore.clearBudget(userId);
    return { ok: true };
  });
};
