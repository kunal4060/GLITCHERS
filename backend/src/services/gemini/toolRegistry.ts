import { inMemoryStore } from '../../repositories/inMemoryStore.js';
import { calculateBudgetStatus, calculateDebtTotals } from '../finance/calculator.js';
import type { Task, Expense, Debt } from '@glitchers/shared';
import { randomUUID } from 'crypto';

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

  complete_task: async (userId: string, taskId: string): Promise<ToolExecutionResult> => {
    const userTasks = inMemoryStore.tasks.get(userId) || [];
    const task = userTasks.find((t) => t.id === taskId);
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

  get_important_emails: async (userId: string): Promise<ToolExecutionResult> => {
    const emails = inMemoryStore.emails.get(userId) || [];
    const important = emails.filter((e) => e.importance === 'HIGH' || e.importance === 'CRITICAL');
    return {
      toolName: 'get_important_emails',
      success: true,
      result: important,
    };
  },
};
