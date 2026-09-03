import { inMemoryStore } from '../../repositories/inMemoryStore.js';
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
    const classes = inMemoryStore.classes.get(userId) || [];
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
    const classes = inMemoryStore.classes.get(userId) || [];
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
    const tasks = inMemoryStore.tasks.get(userId) || [];
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
    const userTasks = inMemoryStore.tasks.get(userId) || [];
    const task = payload.titleMatch
      ? userTasks.find((t) => t.title.toLowerCase().includes(payload.titleMatch!.toLowerCase()))
      : userTasks[userTasks.length - 1]; // defaults to most recent task

    if (!task) {
      return { toolName: 'update_task_priority', success: false, result: null, message: 'No matching task found to update priority.' };
    }
    task.priority = payload.priority;

    return {
      toolName: 'update_task_priority',
      success: true,
      result: task,
      message: `Priority for "${task.title}" updated to ${task.priority}.`,
    };
  },

  complete_task: async (userId: string, taskIdOrTitle: string): Promise<ToolExecutionResult> => {
    const userTasks = inMemoryStore.tasks.get(userId) || [];
    const task = userTasks.find(
      (t) => t.id === taskIdOrTitle || t.title.toLowerCase().includes(taskIdOrTitle.toLowerCase())
    );
    if (!task) {
      return { toolName: 'complete_task', success: false, result: null, message: 'Task not found' };
    }
    task.status = 'COMPLETED';
    task.completedAt = new Date().toISOString();

    return {
      toolName: 'complete_task',
      success: true,
      result: task,
      message: `Task "${task.title}" marked as completed.`,
    };
  },

  delete_task: async (userId: string, taskIdOrTitle: string): Promise<ToolExecutionResult> => {
    const userTasks = inMemoryStore.tasks.get(userId) || [];
    const index = userTasks.findIndex(
      (t) => t.id === taskIdOrTitle || t.title.toLowerCase().includes(taskIdOrTitle.toLowerCase())
    );
    if (index === -1) {
      return { toolName: 'delete_task', success: false, result: null, message: 'Task not found.' };
    }
    const [deleted] = userTasks.splice(index, 1);
    inMemoryStore.tasks.set(userId, userTasks);

    return {
      toolName: 'delete_task',
      success: true,
      result: deleted,
      message: `Deleted task "${deleted.title}".`,
    };
  },

  get_expenses: async (userId: string): Promise<ToolExecutionResult> => {
    const expenses = inMemoryStore.expenses.get(userId) || [];
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

    return {
      toolName: 'add_expense',
      success: true,
      result: newExpense,
      message: `Recorded ₹${newExpense.amount} for ${newExpense.description} under ${newExpense.category}.`,
    };
  },

  delete_expense: async (userId: string, expenseIdOrDesc: string): Promise<ToolExecutionResult> => {
    const expenses = inMemoryStore.expenses.get(userId) || [];
    const index = expenses.findIndex(
      (e) => e.id === expenseIdOrDesc || e.description.toLowerCase().includes(expenseIdOrDesc.toLowerCase())
    );
    if (index === -1) {
      return { toolName: 'delete_expense', success: false, result: null, message: 'Expense record not found.' };
    }
    const [deleted] = expenses.splice(index, 1);
    inMemoryStore.expenses.set(userId, expenses);

    return {
      toolName: 'delete_expense',
      success: true,
      result: deleted,
      message: `Deleted expense record for "${deleted.description}" (₹${deleted.amount}).`,
    };
  },

  split_expense: async (
    userId: string,
    payload: { totalAmount: number; description: string; person: string; category?: Expense['category'] }
  ): Promise<ToolExecutionResult> => {
    const total = Number(payload.totalAmount);
    const half = Math.round(total / 2);

    // 1. Record User's full or split expense
    const expenses = inMemoryStore.expenses.get(userId) || [];
    const newExpense: Expense = {
      id: randomUUID(),
      userId,
      amount: total,
      category: payload.category || 'FOOD',
      description: `${payload.description} (Split with ${payload.person})`,
      date: new Date().toISOString(),
      type: 'EXPENSE',
    };
    expenses.unshift(newExpense);
    inMemoryStore.expenses.set(userId, expenses);

    // 2. Record Debt: Person owes user half
    const debts = inMemoryStore.debts.get(userId) || [];
    const newDebt: Debt = {
      id: randomUUID(),
      userId,
      person: payload.person,
      type: 'OWES_ME',
      amount: half,
      status: 'PENDING',
      paidAmount: 0,
      notes: `Split for ${payload.description} (Total ₹${total})`,
      createdAt: new Date().toISOString(),
    };
    debts.unshift(newDebt);
    inMemoryStore.debts.set(userId, debts);

    return {
      toolName: 'split_expense',
      success: true,
      result: { expense: newExpense, debt: newDebt },
      message: `Split ₹${total} for ${payload.description}: Your share is ₹${half}, and ${payload.person} owes you ₹${half}.`,
    };
  },

  get_budget: async (userId: string): Promise<ToolExecutionResult> => {
    const budget = inMemoryStore.budgets.get(userId);
    const expenses = inMemoryStore.expenses.get(userId) || [];
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
    const debts = inMemoryStore.debts.get(userId) || [];
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

    const rel = newDebt.type === 'OWES_ME' ? 'owes you' : 'you owe';
    return {
      toolName: 'add_debt',
      success: true,
      result: newDebt,
      message: `Recorded: ${newDebt.person} ${rel} ₹${newDebt.amount}.`,
    };
  },

  mark_debt_paid: async (userId: string, personOrDebtId: string): Promise<ToolExecutionResult> => {
    const debts = inMemoryStore.debts.get(userId) || [];
    const debt = debts.find(
      (d) => d.id === personOrDebtId || d.person.toLowerCase().includes(personOrDebtId.toLowerCase())
    );
    if (!debt) {
      return { toolName: 'mark_debt_paid', success: false, result: null, message: 'Debt record not found.' };
    }
    debt.status = 'PAID';
    debt.paidAmount = debt.amount;

    return {
      toolName: 'mark_debt_paid',
      success: true,
      result: debt,
      message: `Marked debt with ${debt.person} (₹${debt.amount}) as fully paid.`,
    };
  },

  get_important_emails: async (userId: string): Promise<ToolExecutionResult> => {
    const emails = inMemoryStore.emails.get(userId) || [];
    const important = emails.filter((e) => e.importance === 'HIGH' || e.importance === 'CRITICAL');
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
    const newEvent: CalendarEvent = {
      id: randomUUID(),
      userId,
      googleEventId: null,
      title: payload.title,
      description: payload.description || null,
      startTime: payload.startTime,
      endTime: payload.endTime || payload.startTime,
      location: payload.location || null,
      eventType: 'ACADEMIC',
      source: 'MANUAL',
      isSyncedToGoogle: false,
    };

    return {
      toolName: 'create_calendar_event',
      success: true,
      result: newEvent,
      message: `Event "${newEvent.title}" added to academic calendar.`,
    };
  },
};
