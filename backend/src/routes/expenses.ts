import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateCategoryBreakdown, calculateTotalSpent } from '../services/finance/calculator.js';
import { geminiAssistant } from '../services/gemini/geminiClient.js';
import type { Expense } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export const expenseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const expenses = inMemoryStore.expenses.get(userId) || [];
    const total = calculateTotalSpent(expenses);
    const breakdown = calculateCategoryBreakdown(expenses);

    return {
      expenses,
      totalSpent: total,
      categoryBreakdown: breakdown,
    };
  });

  fastify.post<{
    Body: { text?: string; amount?: number; category?: Expense['category']; description?: string; merchant?: string };
  }>('/', async (req, reply) => {
    const userId = req.userId!;
    let amount = req.body.amount;
    let category = req.body.category || 'OTHER';
    let description = req.body.description;
    let merchant = req.body.merchant;

    if (req.body.text && !amount) {
      const parsed = geminiAssistant.parseNaturalExpense(req.body.text);
      amount = parsed.amount;
      category = parsed.category;
      description = parsed.description;
    }

    if (!amount || amount <= 0) {
      return reply.status(400).send({ error: 'Valid expense amount is required' });
    }

    const newExpense: Expense = {
      id: randomUUID(),
      userId,
      amount: Number(amount),
      category,
      description: description || 'Expense',
      merchant: merchant || null,
      date: new Date().toISOString(),
      type: 'EXPENSE',
    };

    const expenses = inMemoryStore.expenses.get(userId) || [];
    expenses.unshift(newExpense);
    inMemoryStore.expenses.set(userId, expenses);

    return { expense: newExpense };
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const expenses = inMemoryStore.expenses.get(userId) || [];
    const filtered = expenses.filter((e) => e.id !== id);

    if (filtered.length === expenses.length) {
      return reply.status(404).send({ error: 'Expense not found' });
    }

    inMemoryStore.expenses.set(userId, filtered);
    return { success: true };
  });

  /**
   * Scan Bill / Receipt Image with Gemini Multimodal Vision
   * Analyzes receipt photo, extracts items, total, merchant, and logs expense.
   */
  fastify.post<{
    Body: { imageBase64?: string; mimeType?: string };
  }>('/scan-bill', async (req, reply) => {
    const userId = req.userId!;
    const { imageBase64, mimeType = 'image/jpeg' } = req.body || {};

    if (!imageBase64) {
      return reply.status(400).send({ error: 'imageBase64 is required to scan bill' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const result = await geminiAssistant.analyzeBillImage(userId, cleanBase64, mimeType);
    return result;
  });
};
