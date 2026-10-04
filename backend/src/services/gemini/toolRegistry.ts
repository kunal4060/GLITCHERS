import { inMemoryStore } from '../../repositories/inMemoryStore.js';
import { supabaseStore } from '../../repositories/supabaseStore.js';
import { calculateBudgetStatus, calculateDebtTotals } from '../finance/calculator.js';
import type { Task, Expense, Debt } from '@glitchers/shared';
import { randomUUID } from 'crypto';

export interface CalendarEvent {
  id: string;
  userId: string;
  googleEventId?: string | null;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  location?: string | null;
  eventType: 'ACADEMIC' | 'PERSONAL' | 'EXAM';
  source: 'MANUAL' | 'GOOGLE' | 'TIMETABLE';
  isSyncedToGoogle: boolean;
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  result: any;
  message?: string;
}

export const toolRegistry = {
  get_today_schedule: async (userId: string): Promise<ToolExecutionResult> => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = days[new Date().getDay()];
    const dbClasses = await supabaseStore.getClasses(userId).catch(() => []);
    const classes = dbClasses.length ? dbClasses : (inMemoryStore.classes.get(userId) || []);
    const todayClasses = classes.filter((c) => c.day === currentDay && !c.isCancelled);

    return {
      toolName: 'get_today_schedule',
      success: true,
      result: {
        day: currentDay,
        count: todayClasses.length,
        classes: todayClasses,
      },
    };
  },

  get_tomorrow_schedule: async (userId: string): Promise<ToolExecutionResult> => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const tomorrowDay = days[(new Date().getDay() + 1) % 7];
    const dbClasses = await supabaseStore.getClasses(userId).catch(() => []);
    const classes = dbClasses.length ? dbClasses : (inMemoryStore.classes.get(userId) || []);
    const tomorrowClasses = classes.filter((c) => c.day === tomorrowDay && !c.isCancelled);

    return {
      toolName: 'get_tomorrow_schedule',
      success: true,
      result: {
        day: tomorrowDay,
        count: tomorrowClasses.length,
        classes: tomorrowClasses,
      },
    };
  },

  get_tasks: async (userId: string, filter?: { status?: string }): Promise<ToolExecutionResult> => {
    const dbTasks = await supabaseStore.getTasks(userId).catch(() => []);
    const tasks = dbTasks.length ? dbTasks : (inMemoryStore.tasks.get(userId) || []);
    const filtered = filter?.status ? tasks.filter((t) => t.status === filter.status) : tasks;
    return {
      toolName: 'get_tasks',
      success: true,
      result: filtered,
    };
  },

  create_task: async (
    userId: string,
    payload: { title: string; priority?: Task['priority']; dueDate?: string; description?: string }
  ): Promise<ToolExecutionResult> => {
    const userTasks = inMemoryStore.tasks.get(userId) || [];
    const newTask: Task = {
      id: randomUUID(),
      userId,
      title: payload.title,
      description: payload.description || null,
      priority: payload.priority || 'NORMAL',
      status: 'TODO',
      dueDate: payload.dueDate || null,
      createdAt: new Date().toISOString(),
    };
    userTasks.push(newTask);
    inMemoryStore.tasks.set(userId, userTasks);
    await supabaseStore.createTask(userId, newTask).catch(() => null);

    return {
      toolName: 'create_task',
      success: true,
      result: newTask,
      message: `Task "${newTask.title}" scheduled successfully.`,
    };
  },

  update_task_priority: async (
    userId: string,
    payload: { titleMatch?: string; priority: Task['priority'] }
  ): Promise<ToolExecutionResult> => {
    const dbTasks = await supabaseStore.getTasks(userId).catch(() => []);
    const userTasks = dbTasks.length ? dbTasks : (inMemoryStore.tasks.get(userId) || []);
    const task = payload.titleMatch
      ? userTasks.find((t) => t.title.toLowerCase().includes(payload.titleMatch!.toLowerCase()))
      : userTasks[userTasks.length - 1]; // defaults to most recent task

    if (!task) {
      return { toolName: 'update_task_priority', success: false, result: null, message: 'No matching task found to update priority.' };
    }
    task.priority = payload.priority;
    if (task.id) await supabaseStore.updateTask(userId, task.id, { priority: payload.priority }).catch(() => null);

    return {
      toolName: 'update_task_priority',
      success: true,
      result: task,
      message: `Priority for "${task.title}" updated to ${task.priority}.`,
    };
  },

  complete_task: async (userId: string, taskIdOrTitle: string): Promise<ToolExecutionResult> => {
    const dbTasks = await supabaseStore.getTasks(userId).catch(() => []);
    const userTasks = dbTasks.length ? dbTasks : (inMemoryStore.tasks.get(userId) || []);
    const task = userTasks.find(
      (t) => t.id === taskIdOrTitle || t.title.toLowerCase().includes(taskIdOrTitle.toLowerCase())
    );
    if (!task) {
      return { toolName: 'complete_task', success: false, result: null, message: 'Task not found' };
    }
    task.status = 'COMPLETED';
    task.completedAt = new Date().toISOString();
    if (task.id) await supabaseStore.updateTask(userId, task.id, { status: 'COMPLETED', completedAt: task.completedAt }).catch(() => null);

    return {
      toolName: 'complete_task',
      success: true,
      result: task,
      message: `Task "${task.title}" marked as completed.`,
    };
  },

  delete_task: async (userId: string, taskIdOrTitle: string): Promise<ToolExecutionResult> => {
    const dbTasks = await supabaseStore.getTasks(userId).catch(() => []);
    const userTasks = dbTasks.length ? dbTasks : (inMemoryStore.tasks.get(userId) || []);
    const index = userTasks.findIndex(
      (t) => t.id === taskIdOrTitle || t.title.toLowerCase().includes(taskIdOrTitle.toLowerCase())
    );
    if (index === -1) {
      return { toolName: 'delete_task', success: false, result: null, message: 'Task not found.' };
    }
    const [deleted] = userTasks.splice(index, 1);
    inMemoryStore.tasks.set(userId, userTasks);
    if (deleted.id) await supabaseStore.deleteTask(userId, deleted.id).catch(() => null);

    return {
      toolName: 'delete_task',
      success: true,
      result: deleted,
      message: `Deleted task "${deleted.title}".`,
    };
  },

  get_expenses: async (userId: string): Promise<ToolExecutionResult> => {
    const dbExpenses = await supabaseStore.getExpenses(userId).catch(() => []);
    const expenses = dbExpenses.length ? dbExpenses : (inMemoryStore.expenses.get(userId) || []);
    return {
      toolName: 'get_expenses',
      success: true,
      result: expenses,
    };
  },

  add_expense: async (
    userId: string,
    payload: { amount: number; category: Expense['category']; description: string; merchant?: string }
  ): Promise<ToolExecutionResult> => {
    const expenses = inMemoryStore.expenses.get(userId) || [];
    const newExpense: Expense = {
      id: randomUUID(),
      userId,
      amount: Number(payload.amount),
      category: payload.category || 'OTHER',
      description: payload.description,
      merchant: payload.merchant || null,
      date: new Date().toISOString(),
      type: 'EXPENSE',
    };
    expenses.unshift(newExpense);
    inMemoryStore.expenses.set(userId, expenses);
    await supabaseStore.createExpense(userId, newExpense).catch(() => null);

    return {
      toolName: 'add_expense',
      success: true,
      result: newExpense,
      message: `Recorded ₹${newExpense.amount} for ${newExpense.description} under ${newExpense.category}.`,
    };
  },

  delete_expense: async (userId: string, expenseIdOrDesc: string): Promise<ToolExecutionResult> => {
    const dbExpenses = await supabaseStore.getExpenses(userId).catch(() => []);
    const expenses = dbExpenses.length ? dbExpenses : (inMemoryStore.expenses.get(userId) || []);
    const query = expenseIdOrDesc.trim();
    const queryLower = query.toLowerCase();

    // Exact match (id or full description) deletes immediately.
    const exactIndex = expenses.findIndex(
      (e) => e.id === query || e.description.toLowerCase() === queryLower
    );
    if (exactIndex !== -1) {
      const [deleted] = expenses.splice(exactIndex, 1);
      inMemoryStore.expenses.set(userId, expenses);
      if (deleted.id) await supabaseStore.deleteExpense(userId, deleted.id).catch(() => null);

      return {
        toolName: 'delete_expense',
        success: true,
        result: deleted,
        message: `Deleted expense record for "${deleted.description}" (₹${deleted.amount}).`,
      };
    }

    // Fuzzy match: never delete blindly — ask for confirmation instead.
    const fuzzyMatches = expenses.filter((e) => e.description.toLowerCase().includes(queryLower));
    if (fuzzyMatches.length === 0) {
      return { toolName: 'delete_expense', success: false, result: null, message: 'Expense record not found.' };
    }
    const listing = fuzzyMatches
      .slice(0, 5)
      .map((e) => `"${e.description}" (₹${e.amount}, ${e.date ? e.date.slice(0, 10) : 'no date'})`)
      .join('; ');
    return {
      toolName: 'delete_expense',
      success: false,
      result: fuzzyMatches.map((e) => e.id),
      message: `I found ${fuzzyMatches.length} matching expense(s): ${listing}. I won't delete without confirmation — reply with the exact description or ID of the one to delete.`,
    };
  },

  split_expense: async (
    userId: string,
    payload: { totalAmount: number; description: string; person: string; category?: Expense['category'] }
  ): Promise<ToolExecutionResult> => {
    const total = Number(payload.totalAmount);
    if (!Number.isFinite(total) || total <= 0) {
      return {
        toolName: 'split_expense',
        success: false,
        result: null,
        message: 'Please provide a valid total amount to split.',
      };
    }
    // 2-person split: record only the user's own share as their expense,
    // not the full total. floor/ceil pair keeps odd totals exact.
    const userShare = Math.floor(total / 2);
    const otherShare = total - userShare;

    // 1. Record User's share of the split expense
    const expenses = inMemoryStore.expenses.get(userId) || [];
    const newExpense: Expense = {
      id: randomUUID(),
      userId,
      amount: userShare,
      category: payload.category || 'FOOD',
      description: `${payload.description} (Your share of split with ${payload.person})`,
      date: new Date().toISOString(),
      type: 'EXPENSE',
    };
    expenses.unshift(newExpense);
    inMemoryStore.expenses.set(userId, expenses);
    await supabaseStore.createExpense(userId, newExpense).catch(() => null);

    // 2. Record Debt: Person owes user their share
    const debts = inMemoryStore.debts.get(userId) || [];
    const newDebt: Debt = {
      id: randomUUID(),
      userId,
      person: payload.person,
      type: 'OWES_ME',
      amount: otherShare,
      status: 'PENDING',
      paidAmount: 0,
      notes: `Split for ${payload.description} (Total ₹${total})`,
      createdAt: new Date().toISOString(),
    };
    debts.unshift(newDebt);
    inMemoryStore.debts.set(userId, debts);
    await supabaseStore.createDebt(userId, newDebt).catch(() => null);

    return {
      toolName: 'split_expense',
      success: true,
      result: { expense: newExpense, debt: newDebt },
      message: `Split ₹${total} for ${payload.description}: your share ₹${userShare} recorded, and ${payload.person} owes you ₹${otherShare}.`,
    };
  },

  get_budget: async (userId: string): Promise<ToolExecutionResult> => {
    const budget = (await supabaseStore.getBudget(userId).catch(() => null)) || inMemoryStore.budgets.get(userId);
    const dbExpenses = await supabaseStore.getExpenses(userId).catch(() => []);
    const expenses = dbExpenses.length ? dbExpenses : (inMemoryStore.expenses.get(userId) || []);
    if (!budget) {
      return { toolName: 'get_budget', success: false, result: null, message: 'No budget configured' };
    }
    const status = calculateBudgetStatus(budget, expenses);
    return {
      toolName: 'get_budget',
      success: true,
      result: status,
    };
  },

  get_debts: async (userId: string): Promise<ToolExecutionResult> => {
    const dbDebts = await supabaseStore.getDebts(userId).catch(() => []);
    const debts = dbDebts.length ? dbDebts : (inMemoryStore.debts.get(userId) || []);
    const totals = calculateDebtTotals(debts);
    return {
      toolName: 'get_debts',
      success: true,
      result: {
        debts,
        totals,
      },
    };
  },

  add_debt: async (
    userId: string,
    payload: { person: string; type: 'OWES_ME' | 'I_OWE'; amount: number; notes?: string }
  ): Promise<ToolExecutionResult> => {
    const debts = inMemoryStore.debts.get(userId) || [];
    const newDebt: Debt = {
      id: randomUUID(),
      userId,
      person: payload.person,
      type: payload.type,
      amount: Number(payload.amount),
      status: 'PENDING',
      paidAmount: 0,
      notes: payload.notes || null,
      createdAt: new Date().toISOString(),
    };
    debts.unshift(newDebt);
    inMemoryStore.debts.set(userId, debts);
    await supabaseStore.createDebt(userId, newDebt).catch(() => null);

    const rel = newDebt.type === 'OWES_ME' ? 'owes you' : 'you owe';
    return {
      toolName: 'add_debt',
      success: true,
      result: newDebt,
      message: `Recorded: ${newDebt.person} ${rel} ₹${newDebt.amount}.`,
    };
  },

  mark_debt_paid: async (userId: string, personOrDebtId: string): Promise<ToolExecutionResult> => {
    const dbDebts = await supabaseStore.getDebts(userId).catch(() => []);
    const debts = dbDebts.length ? dbDebts : (inMemoryStore.debts.get(userId) || []);
    const debt = debts.find(
      (d) => d.id === personOrDebtId || d.person.toLowerCase().includes(personOrDebtId.toLowerCase())
    );
    if (!debt) {
      return { toolName: 'mark_debt_paid', success: false, result: null, message: 'Debt record not found.' };
    }
    debt.status = 'PAID';
    debt.paidAmount = debt.amount;
    if (debt.id) await supabaseStore.updateDebt(userId, debt.id, { status: 'PAID', paidAmount: debt.amount }).catch(() => null);

    return {
      toolName: 'mark_debt_paid',
      success: true,
      result: debt,
      message: `Marked debt with ${debt.person} (₹${debt.amount}) as fully paid.`,
    };
  },

  get_important_emails: async (userId: string): Promise<ToolExecutionResult> => {
    const dbEmails = await supabaseStore.getEmails(userId).catch(() => []);
    const emails = dbEmails.length ? dbEmails : (inMemoryStore.emails.get(userId) || []);
    const important = emails.filter((e) => !e.isDismissed && (e.importance === 'HIGH' || e.importance === 'CRITICAL'));
    return {
      toolName: 'get_important_emails',
      success: true,
      result: important,
    };
  },

  create_calendar_event: async (
    userId: string,
    payload: { title: string; startTime: string; endTime?: string; location?: string; description?: string }
  ): Promise<ToolExecutionResult> => {
    const title = (payload.title || '').trim();
    const startTime = (payload.startTime || '').trim();
    if (!title || !startTime) {
      return {
        toolName: 'create_calendar_event',
        success: false,
        result: null,
        message: 'Cannot create a calendar event without a title and a start time.',
      };
    }

    const saved = await supabaseStore
      .saveCalendarEvent(userId, {
        id: randomUUID(),
        title,
        startTime,
        endTime: (payload.endTime || '').trim() || startTime,
        location: (payload.location || '').trim() || null,
        source: 'MANUAL',
      })
      .catch(() => null);

    if (!saved) {
      return {
        toolName: 'create_calendar_event',
        success: false,
        result: null,
        message: 'Could not save the calendar event. Please try again.',
      };
    }

    return {
      toolName: 'create_calendar_event',
      success: true,
      result: saved,
      message: `Event "${saved.title}" added to your calendar.`,
    };
  },
};
