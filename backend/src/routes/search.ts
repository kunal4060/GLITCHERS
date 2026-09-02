import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get<{ Querystring: { q?: string } }>('/', async (req) => {
    const userId = req.userId!;
    const query = (req.query.q || '').trim().toLowerCase();

    if (!query) {
      return { results: [] };
    }

    const classes = inMemoryStore.classes.get(userId) || [];
    const tasks = inMemoryStore.tasks.get(userId) || [];
    const expenses = inMemoryStore.expenses.get(userId) || [];
    const debts = inMemoryStore.debts.get(userId) || [];
    const emails = inMemoryStore.emails.get(userId) || [];

    const matchedClasses = classes
      .filter((c) => c.subjectName.toLowerCase().includes(query) || (c.room && c.room.toLowerCase().includes(query)))
      .map((c) => ({ type: 'CLASS', title: c.subjectName, subtitle: `${c.day} ${c.startTime} - ${c.endTime} (${c.room || 'TBD'})`, data: c }));

    const matchedTasks = tasks
      .filter((t) => t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query)))
      .map((t) => ({ type: 'TASK', title: t.title, subtitle: `Priority: ${t.priority} • Status: ${t.status}`, data: t }));

    const matchedExpenses = expenses
      .filter((e) => e.description.toLowerCase().includes(query) || e.category.toLowerCase().includes(query))
      .map((e) => ({ type: 'EXPENSE', title: `₹${e.amount} - ${e.description}`, subtitle: `Category: ${e.category}`, data: e }));

    const matchedDebts = debts
      .filter((d) => d.person.toLowerCase().includes(query) || (d.notes && d.notes.toLowerCase().includes(query)))
      .map((d) => ({ type: 'DEBT', title: `${d.person}: ₹${d.amount}`, subtitle: d.type === 'OWES_ME' ? 'Owes you' : 'You owe', data: d }));

    const matchedEmails = emails
      .filter((e) => e.subject.toLowerCase().includes(query) || e.summary.toLowerCase().includes(query))
      .map((e) => ({ type: 'EMAIL', title: e.subject, subtitle: e.summary, data: e }));

    return {
      query,
      results: [...matchedClasses, ...matchedTasks, ...matchedExpenses, ...matchedDebts, ...matchedEmails],
    };
  });
};
