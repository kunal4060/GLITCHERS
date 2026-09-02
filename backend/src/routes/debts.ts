import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateDebtTotals, calculateEqualSplit } from '../services/finance/calculator.js';
import { geminiAssistant } from '../services/gemini/geminiClient.js';
import type { Debt } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export const debtRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const debts = inMemoryStore.debts.get(userId) || [];
    const totals = calculateDebtTotals(debts);

    return {
      debts,
      totals,
    };
  });

  fastify.post<{
    Body: { text?: string; person?: string; type?: 'OWES_ME' | 'I_OWE'; amount?: number; notes?: string };
  }>('/', async (req, reply) => {
    const userId = req.userId!;
    let person = req.body.person;
    let type = req.body.type || 'OWES_ME';
    let amount = req.body.amount;
    let notes = req.body.notes;

    if (req.body.text && !person) {
      const parsed = geminiAssistant.parseNaturalDebt(req.body.text);
      person = parsed.person;
      type = parsed.type;
      amount = parsed.amount;
      notes = parsed.notes;
    }

    if (!person || !amount || amount <= 0) {
      return reply.status(400).send({ error: 'Person and valid amount are required' });
    }

    const newDebt: Debt = {
      id: randomUUID(),
      userId,
      person,
      type,
      amount: Number(amount),
      status: 'PENDING',
      paidAmount: 0,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    const debts = inMemoryStore.debts.get(userId) || [];
    debts.unshift(newDebt);
    inMemoryStore.debts.set(userId, debts);

    return { debt: newDebt };
  });

  fastify.patch<{ Params: { id: string }; Body: { paidAmount?: number } }>('/:id/pay', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const debts = inMemoryStore.debts.get(userId) || [];
    const debt = debts.find((d) => d.id === id);

    if (!debt) return reply.status(404).send({ error: 'Debt not found' });

    const payAmount = req.body.paidAmount !== undefined ? req.body.paidAmount : debt.amount;
    debt.paidAmount = payAmount;
    debt.status = debt.paidAmount >= debt.amount ? 'PAID' : 'PARTIALLY_PAID';

    return { debt };
  });

  fastify.post<{ Body: { totalAmount: number; description: string; numberOfPeople: number; friends: string[] } }>(
    '/split',
    async (req, reply) => {
      const userId = req.userId!;
      const { totalAmount, description, numberOfPeople, friends } = req.body || {};

      if (!totalAmount || !numberOfPeople || numberOfPeople < 2) {
        return reply.status(400).send({ error: 'Valid totalAmount and at least 2 people required' });
      }

      const sharePerPerson = calculateEqualSplit(totalAmount, numberOfPeople);
      const debts = inMemoryStore.debts.get(userId) || [];

      const createdDebts: Debt[] = [];
      const peopleList = friends && friends.length > 0 ? friends : Array.from({ length: numberOfPeople - 1 }, (_, i) => `Friend ${i + 1}`);

      for (const friendName of peopleList) {
        const debt: Debt = {
          id: randomUUID(),
          userId,
          person: friendName,
          type: 'OWES_ME',
          amount: sharePerPerson,
          status: 'PENDING',
          paidAmount: 0,
          notes: `Split for ${description} (Total: ₹${totalAmount})`,
          createdAt: new Date().toISOString(),
        };
        debts.unshift(debt);
        createdDebts.push(debt);
      }

      inMemoryStore.debts.set(userId, debts);

      return {
        totalAmount,
        sharePerPerson,
        createdDebts,
      };
    }
  );
};
