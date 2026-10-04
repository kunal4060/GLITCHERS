import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';

// Null-safe case-insensitive substring match (avoids the item.title crash pattern).
const includes = (value: unknown, query: string): boolean =>
  String(value ?? '').toLowerCase().includes(query);

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get<{ Querystring: { q?: string } }>('/', async (req) => {
    const userId = req.userId!;
    const query = (req.query.q || '').trim().toLowerCase();

    if (!query) {
      return { results: [] };
    }

    // M10 fix: query the persistent stores via supabaseStore (Supabase-backed,
    // falling back to its in-memory cache) and merge with the request-scoped
    // in-memory store so search works after a restart.
    const [sbClasses, sbTasks, sbExpenses, sbDebts, sbEmails] = await Promise.all([
      supabaseStore.getClasses(userId),
      supabaseStore.getTasks(userId),
      supabaseStore.getExpenses(userId),
      supabaseStore.getDebts(userId),
      supabaseStore.getEmails(userId),
    ]);

    const classes = [...(inMemoryStore.classes.get(userId) || []), ...sbClasses];
    const tasks = [...(inMemoryStore.tasks.get(userId) || []), ...sbTasks];
    const expenses = [...(inMemoryStore.expenses.get(userId) || []), ...sbExpenses];
    // M24: debts via supabaseStore too (falls back to its in-memory cache) —
    // inMemory-only missed every Supabase-backed debt row.
    const debts = [...(inMemoryStore.debts.get(userId) || []), ...sbDebts];
    const emails = [...(inMemoryStore.emails.get(userId) || []), ...sbEmails];

    const matchedClasses = classes
      .filter((c) => includes(c.subjectName, query) || includes(c.room, query))
      .map((c) => ({ type: 'CLASS', title: c.subjectName, subtitle: `${c.day} ${c.startTime} - ${c.endTime} (${c.room || 'TBD'})`, data: c }));

    const matchedTasks = tasks
      .filter((t) => includes(t.title, query) || includes(t.description, query))
      .map((t) => ({ type: 'TASK', title: t.title, subtitle: `Priority: ${t.priority} • Status: ${t.status}`, data: t }));

    const matchedExpenses = expenses
      .filter((e) => includes(e.description, query) || includes(e.category, query))
      .map((e) => ({ type: 'EXPENSE', title: `₹${e.amount} - ${e.description}`, subtitle: `Category: ${e.category}`, data: e }));

    const matchedDebts = debts
      .filter((d) => includes(d.person, query) || includes(d.notes, query))
      .map((d) => ({ type: 'DEBT', title: `${d.person}: ₹${d.amount}`, subtitle: d.type === 'OWES_ME' ? 'Owes you' : 'You owe', data: d }));

    const matchedEmails = emails
      .filter((e) => includes(e.subject, query) || includes(e.summary, query))
      .map((e) => ({ type: 'EMAIL', title: e.subject, subtitle: e.summary, data: e }));

    // Dedupe across the two stores (same row can appear in both).
    const seen = new Set<string>();
    const results: Array<{ type: string; title: unknown; subtitle: unknown; data: unknown }> = [];
    for (const r of [...matchedClasses, ...matchedTasks, ...matchedExpenses, ...matchedDebts, ...matchedEmails]) {
      const key = `${r.type}:${(r.data as { id?: string } | null)?.id ?? r.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(r);
      }
    }

    return {
      query,
      results,
    };
  });
};
