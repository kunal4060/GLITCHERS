import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateDebtTotals } from '../services/finance/calculator.js';
import { geminiAssistant } from '../services/gemini/geminiClient.js';
import type { Debt } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export const debtRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (req) => {
    const userId = req.userId!;
    const debts = await supabaseStore.getDebts(userId);
    const totals = calculateDebtTotals(debts);

    return {
      debts,
      totals,
    };
  });

  fastify.post<{
    Body: { id?: string; text?: string; person?: string; type?: 'OWES_ME' | 'I_OWE'; amount?: number; notes?: string };
  }>('/', async (req, reply) => {
    const userId = req.userId!;
    const body = req.body || {};
    let person = body.person;
    let type = body.type || 'OWES_ME';
    let amount = body.amount;
    let notes = body.notes;

    if (body.text && !person) {
      const parsed = geminiAssistant.parseNaturalDebt(body.text);
      person = parsed.person;
      type = parsed.type;
      amount = parsed.amount ?? undefined;
      notes = parsed.notes;
    }

    const numAmount = Number(amount);
    if (!person || typeof person !== 'string' || !person.trim() || !Number.isFinite(numAmount) || numAmount <= 0) {
      return reply.status(400).send({ error: 'Person and valid amount are required' });
    }
    if (type !== 'OWES_ME' && type !== 'I_OWE') {
      return reply.status(400).send({ error: 'Invalid debt type' });
    }

    const newDebt: Debt = {
      id: typeof body.id === 'string' && body.id.trim().length > 0 ? body.id.trim() : randomUUID(),
      userId,
      person,
      type,
      amount: Number(amount),
      status: 'PENDING',
      paidAmount: 0,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    const saved = await supabaseStore.createDebt(userId, newDebt);
    return { debt: saved };
  });

  fastify.patch<{ Params: { id: string }; Body: { paidAmount?: number } }>('/:id/pay', async (req, reply) => {
    const userId = req.userId!;
    const { id } = req.params;
    const debts = await supabaseStore.getDebts(userId);
    const debt = debts.find((d) => d.id === id);

    if (!debt) return reply.status(404).send({ error: 'Debt not found' });

    // M14: guard against empty/undefined body — req.body.paidAmount would 500
    const { paidAmount } = req.body || {};
    const requested = paidAmount !== undefined ? Number(paidAmount) : Number(debt.amount);
    if (!Number.isFinite(requested) || requested <= 0) {
      return reply.status(400).send({ error: 'paidAmount must be a positive number' });
    }
    // M30: cap payment at the remaining amount — no overpayment
    const remaining = Math.max(0, Number(debt.amount) - Number(debt.paidAmount || 0));
    const payAmount = Math.min(requested, remaining);
    if (payAmount <= 0) {
      return reply.status(400).send({ error: 'Debt is already fully paid' });
    }

    const newPaidTotal = Number(debt.paidAmount || 0) + payAmount;
    const status = newPaidTotal >= Number(debt.amount) ? 'PAID' : 'PARTIALLY_PAID';
    const updated = await supabaseStore.updateDebt(userId, id, { paidAmount: newPaidTotal, status });

    return { debt: updated || debt };
  });

  fastify.post<{ Body: { totalAmount: number; description: string; numberOfPeople: number; friends: string[] } }>(
    '/split',
    async (req, reply) => {
      const userId = req.userId!;
      const { totalAmount, description, numberOfPeople, friends } = req.body || {};

      // H5: strict validation — "abc" amounts must not become NaN rows, and
      // numberOfPeople: 1e9 must not OOM the server via Array.from.
      const numTotal = Number(totalAmount);
      const numPeople = Number(numberOfPeople);
      if (!Number.isFinite(numTotal) || numTotal <= 0) {
        return reply.status(400).send({ error: 'totalAmount must be a valid positive number' });
      }
      if (!Number.isInteger(numPeople) || numPeople < 2 || numPeople > 50) {
        return reply.status(400).send({ error: 'numberOfPeople must be an integer between 2 and 50' });
      }
      if (typeof description !== 'string' || !description.trim()) {
        return reply.status(400).send({ error: 'description is required' });
      }
      if (friends !== undefined && (!Array.isArray(friends) || friends.length > 50)) {
        return reply.status(400).send({ error: 'friends must be an array of at most 50 names' });
      }

      const peopleList = friends && friends.length > 0 ? friends : Array.from({ length: numberOfPeople - 1 }, (_, i) => `Friend ${i + 1}`);

      if (peopleList.length > numberOfPeople) {
        return reply.status(400).send({ error: 'Friends list cannot exceed numberOfPeople' });
      }

      // Split into exact paise so the shares sum EXACTLY to the total
      // (e.g. ₹100 / 3 → 3334 + 3333 + 3333 paise, not 33.33 × 3 = 99.99).
      const totalPaise = Math.round(Number(totalAmount) * 100);
      const baseSharePaise = Math.floor(totalPaise / numberOfPeople);
      const remainderPaise = totalPaise - baseSharePaise * numberOfPeople;
      const shareForPerson = (index: number) => (baseSharePaise + (index < remainderPaise ? 1 : 0)) / 100;

      const sharePerPerson = shareForPerson(0);
      const createdDebts: Debt[] = [];

      for (let i = 0; i < peopleList.length; i++) {
        const friendName = peopleList[i];
        const debt: Debt = {
          id: randomUUID(),
          userId,
          person: friendName,
          type: 'OWES_ME',
          amount: shareForPerson(i),
          status: 'PENDING',
          paidAmount: 0,
          notes: `Split for ${description} (Total: ₹${totalAmount})`,
          createdAt: new Date().toISOString(),
        };
        const saved = await supabaseStore.createDebt(userId, debt);
        createdDebts.push(saved);
      }

      return {
        totalAmount,
        sharePerPerson,
        createdDebts,
      };
    }
  );
};
