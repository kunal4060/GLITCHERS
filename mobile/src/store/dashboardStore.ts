import { create } from 'zustand';
import type { ClassSession, Task, Expense, Budget, Debt, EmailSummary } from '@glitchers/shared';
import { apiClient } from '../api/client';

interface DashboardState {
  classes: ClassSession[];
  tasks: Task[];
  expenses: Expense[];
  budget: Budget | null;
  debts: Debt[];
  emails: EmailSummary[];
  isLoading: boolean;
  isBackendConnected: boolean;

  setClasses: (classes: ClassSession[]) => void;
  setTasks: (tasks: Task[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setBudget: (budget: Budget | null) => void;
  setDebts: (debts: Debt[]) => void;
  setEmails: (emails: EmailSummary[]) => void;

  addTask: (task: Task) => Promise<void>;
  updateTaskPriority: (taskId: string, priority: Task['priority']) => void;
  completeTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;

  addExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (expenseId: string) => void;
  splitExpense: (totalAmount: number, description: string, person: string) => void;

  addDebt: (debt: Debt) => Promise<void>;
  markDebtPaid: (debtId: string) => void;

  syncWithBackend: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  classes: [
    {
      id: 'c1',
      userId: 'u1',
      subjectName: 'Artificial Intelligence',
      day: 'THURSDAY',
      startTime: '09:00',
      endTime: '09:50',
      room: '120-CB',
      faculty: 'MITHILESH KUMAR DUBEY',
      classType: 'LECTURE',
      isCancelled: false,
    },
    {
      id: 'c2',
      userId: 'u1',
      subjectName: 'Entrepreneurship',
      day: 'THURSDAY',
      startTime: '10:01',
      endTime: '10:51',
      room: '408-CB',
      faculty: 'Ishfaq Ahmad Thaku',
      classType: 'LECTURE',
      isCancelled: false,
    },
    {
      id: 'c3',
      userId: 'u1',
      subjectName: 'Computer Organization and Architecture',
      day: 'THURSDAY',
      startTime: '11:00',
      endTime: '11:50',
      room: '220-CB',
      faculty: 'PULLURI HARISH',
      classType: 'LECTURE',
      isCancelled: false,
    },
    {
      id: 'c4',
      userId: 'u1',
      subjectName: 'Discrete Mathematical Structures',
      day: 'THURSDAY',
      startTime: '12:00',
      endTime: '12:50',
      room: '120-CB',
      faculty: 'Venkatrajam Marka',
      classType: 'LECTURE',
      isCancelled: false,
    },
  ],
  tasks: [
    {
      id: 't1',
      userId: 'u1',
      title: 'Complete AI Assignment 2',
      priority: 'EXTREMELY_IMPORTANT',
      status: 'TODO',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      id: 't2',
      userId: 'u1',
      title: 'DBMS Normalization Lab Report',
      priority: 'HIGH',
      status: 'TODO',
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    },
    {
      id: 't3',
      userId: 'u1',
      title: 'COA Cache Memory Quiz Preparation',
      priority: 'NORMAL',
      status: 'TODO',
      dueDate: new Date(Date.now() + 4 * 86400000).toISOString(),
    },
  ],
  expenses: [
    {
      id: 'e1',
      userId: 'u1',
      amount: 180,
      category: 'FOOD',
      description: 'Dinner at Domino’s',
      merchant: "Domino's",
      date: new Date().toISOString(),
      type: 'EXPENSE',
    },
    {
      id: 'e2',
      userId: 'u1',
      amount: 80,
      category: 'TRANSPORT',
      description: 'Auto to campus',
      date: new Date().toISOString(),
      type: 'EXPENSE',
    },
    {
      id: 'e3',
      userId: 'u1',
      amount: 450,
      category: 'EDUCATION',
      description: 'Calculus reference guide',
      date: new Date(Date.now() - 86400000).toISOString(),
      type: 'EXPENSE',
    },
  ],
  budget: {
    id: 'b1',
    userId: 'u1',
    monthlyLimit: 10000,
    currentSpending: 710,
    month: '2026-09',
    alertThresholds: [75, 90, 100],
  },
  debts: [
    {
      id: 'd1',
      userId: 'u1',
      person: 'Rahul',
      type: 'OWES_ME',
      amount: 500,
      status: 'PENDING',
      paidAmount: 0,
      notes: 'Lunch canteen split',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'd2',
      userId: 'u1',
      person: 'Aman',
      type: 'I_OWE',
      amount: 200,
      status: 'PENDING',
      paidAmount: 0,
      notes: 'Stationery purchase',
      createdAt: new Date().toISOString(),
    },
  ],
  emails: [
    {
      id: 'em1',
      userId: 'u1',
      providerMessageId: 'm1',
      sender: 'examcell@university.edu',
      subject: '🔴 Midterm Exam Schedule Announcement',
      receivedAt: new Date().toISOString(),
      isUniversityRelated: true,
      importance: 'CRITICAL',
      summary: 'Midterm examinations start next Monday. Room allocations published.',
      actionRequired: true,
      actionItem: 'Check assigned examination hall',
      isProcessed: true,
    },
    {
      id: 'em2',
      userId: 'u1',
      providerMessageId: 'm2',
      sender: 'placement@university.edu',
      subject: 'Google Summer Internship Drive Registration',
      receivedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      isUniversityRelated: true,
      importance: 'HIGH',
      summary: 'Applications open for 3rd year engineering students. Deadline: Sept 15.',
      actionRequired: true,
      actionItem: 'Submit resume on portal',
      isProcessed: true,
    },
  ],
  isLoading: false,
  isBackendConnected: false,

  setClasses: (classes) => set({ classes }),
  setTasks: (tasks) => set({ tasks }),
  setExpenses: (expenses) => set({ expenses }),
  setBudget: (budget) => set({ budget }),
  setDebts: (debts) => set({ debts }),
  setEmails: (emails) => set({ emails }),

  addTask: async (task) => {
    set((s) => ({ tasks: [task, ...s.tasks] }));
    try {
      await apiClient.createTaskFromText(`${task.title}, priority: ${task.priority}`);
    } catch {
      // Retained in optimistic store
    }
  },

  updateTaskPriority: (taskId, priority) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, priority } : t)),
    }));
  },

  completeTask: (taskId) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'COMPLETED', completedAt: new Date().toISOString() } : t
      ),
    }));
  },

  deleteTask: (taskId) => {
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== taskId),
    }));
  },

  addExpense: async (expense) => {
    set((s) => ({ expenses: [expense, ...s.expenses] }));
    try {
      await apiClient.createExpenseFromText(`Spent ${expense.amount} on ${expense.description}`);
    } catch {
      // Retained in optimistic store
    }
  },

  deleteExpense: (expenseId) => {
    set((s) => ({
      expenses: s.expenses.filter((e) => e.id !== expenseId),
    }));
  },

  splitExpense: (totalAmount, description, person) => {
    const half = Math.round(totalAmount / 2);
    const newExp: Expense = {
      id: String(Date.now()),
      userId: 'u1',
      amount: totalAmount,
      category: 'FOOD',
      description: `${description} (Split with ${person})`,
      date: new Date().toISOString(),
      type: 'EXPENSE',
    };
    const newDebt: Debt = {
      id: String(Date.now() + 1),
      userId: 'u1',
      person,
      type: 'OWES_ME',
      amount: half,
      status: 'PENDING',
      paidAmount: 0,
      notes: `Split for ${description}`,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      expenses: [newExp, ...s.expenses],
      debts: [newDebt, ...s.debts],
    }));
  },

  addDebt: async (debt) => {
    set((s) => ({ debts: [debt, ...s.debts] }));
  },

  markDebtPaid: (debtId) => {
    set((s) => ({
      debts: s.debts.map((d) => (d.id === debtId ? { ...d, status: 'PAID', paidAmount: d.amount } : d)),
    }));
  },

  syncWithBackend: async () => {
    set({ isLoading: true });
    try {
      const [classRes, taskRes, expRes, budgetRes, debtRes, emailRes] = await Promise.allSettled([
        apiClient.fetchTimetableClasses(),
        apiClient.fetchTasks(),
        apiClient.fetchExpenses(),
        apiClient.fetchBudget(),
        apiClient.fetchDebts(),
        apiClient.fetchEmails(),
      ]);

      if (classRes.status === 'fulfilled' && classRes.value.classes) {
        set({ classes: classRes.value.classes, isBackendConnected: true });
      }
      if (taskRes.status === 'fulfilled' && taskRes.value.tasks) {
        set({ tasks: taskRes.value.tasks });
      }
      if (expRes.status === 'fulfilled' && expRes.value.expenses) {
        set({ expenses: expRes.value.expenses });
      }
      if (budgetRes.status === 'fulfilled' && budgetRes.value.budget) {
        set({ budget: budgetRes.value.budget });
      }
      if (debtRes.status === 'fulfilled' && debtRes.value.debts) {
        set({ debts: debtRes.value.debts });
      }
      if (emailRes.status === 'fulfilled' && emailRes.value.emails) {
        set({ emails: emailRes.value.emails });
      }
    } catch {
      // Offline fallback
    } finally {
      set({ isLoading: false });
    }
  },
}));
