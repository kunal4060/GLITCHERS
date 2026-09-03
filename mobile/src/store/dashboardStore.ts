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

  cgpa: string;
  credits: number;
  setCgpa: (cgpa: string) => void;
  setCredits: (credits: number) => void;
  updateAcademics: (cgpa: string, credits: number) => void;

  avatarUrl: string | null;
  setAvatarUrl: (avatarUrl: string | null) => void;

  aiMode: 'AUTO' | 'OFFLINE' | 'CLOUD';
  activeOfflineModel: string;
  downloadedModels: string[];
  downloadProgress: Record<string, number>;
  setAiMode: (mode: 'AUTO' | 'OFFLINE' | 'CLOUD') => void;
  setActiveOfflineModel: (modelId: string) => void;
  downloadOfflineModel: (modelId: string) => Promise<void>;

  offlineSyncQueue: Array<{
    id: string;
    type: 'CREATE_EXPENSE' | 'CREATE_TASK' | 'SPLIT_EXPENSE' | 'CREATE_DEBT';
    payload: any;
    timestamp: string;
    synced: boolean;
  }>;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  queueOfflineAction: (action: { type: 'CREATE_EXPENSE' | 'CREATE_TASK' | 'SPLIT_EXPENSE' | 'CREATE_DEBT'; payload: any }) => void;
  flushOfflineQueue: () => Promise<{ syncedCount: number }>;

  syncWithBackend: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  cgpa: '8.71',
  credits: 42,
  setCgpa: (cgpa) => set({ cgpa }),
  setCredits: (credits) => set({ credits }),
  updateAcademics: (cgpa, credits) => set({ cgpa, credits }),
  avatarUrl: null,
  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),

  aiMode: 'AUTO',
  activeOfflineModel: 'HuggingFaceTB/SmolLM2-360M-Instruct',
  downloadedModels: ['HuggingFaceTB/SmolLM2-360M-Instruct'],
  downloadProgress: {},

  offlineSyncQueue: [],
  isOnline: true,
  setIsOnline: (isOnline) => set({ isOnline }),
  queueOfflineAction: (action) => {
    const item = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
      type: action.type,
      payload: action.payload,
      timestamp: new Date().toISOString(),
      synced: false,
    };
    set((s) => ({ offlineSyncQueue: [...s.offlineSyncQueue, item] }));
  },
  flushOfflineQueue: async () => {
    const pending = get().offlineSyncQueue.filter((q) => !q.synced);
    if (pending.length === 0) return { syncedCount: 0 };

    let syncedCount = 0;
    for (const item of pending) {
      try {
        if (item.type === 'CREATE_EXPENSE') {
          await apiClient.createExpense(item.payload);
          syncedCount++;
        } else if (item.type === 'CREATE_TASK') {
          await apiClient.createTask(item.payload);
          syncedCount++;
        }
      } catch (err) {
        console.warn('Offline push item failed:', err);
      }
    }
    set((s) => ({
      offlineSyncQueue: s.offlineSyncQueue.map((item) => ({ ...item, synced: true })),
    }));
    return { syncedCount };
  },

  setAiMode: (aiMode) => set({ aiMode }),
  setActiveOfflineModel: (activeOfflineModel) => set({ activeOfflineModel }),
  downloadOfflineModel: async (modelId: string) => {
    // Simulate real progressive download of Hugging Face weights
    for (let p = 15; p <= 100; p += 20) {
      set((s) => ({ downloadProgress: { ...s.downloadProgress, [modelId]: Math.min(100, p) } }));
      await new Promise((r) => setTimeout(r, 120));
    }
    set((s) => ({
      downloadedModels: s.downloadedModels.includes(modelId) ? s.downloadedModels : [...s.downloadedModels, modelId],
      activeOfflineModel: modelId,
      downloadProgress: { ...s.downloadProgress, [modelId]: 100 },
    }));
  },
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
  expenses: [],
  budget: {
    id: 'b1',
    userId: 'u1',
    monthlyLimit: 10000,
    currentSpending: 0,
    month: new Date().toISOString().slice(0, 7),
    alertThresholds: [75, 90, 100],
  },
  debts: [],
  emails: [],
  isLoading: false,
  isBackendConnected: false,

  setClasses: (classes) => set({ classes }),
  setTasks: (tasks) => set({ tasks }),
  setExpenses: (expenses) => set({ expenses }),
  setBudget: (budget) => set({ budget }),
  setDebts: (debts) => set({ debts }),
  setEmails: (emails) => set({ emails }),

  addTask: async (task) => {
    set((s) => ({
      tasks: [task, ...s.tasks.filter((t) => t.id !== task.id)],
    }));
    try {
      await apiClient.createTask({
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
        description: task.description,
      });
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
    set((s) => ({
      expenses: [expense, ...s.expenses.filter((e) => e.id !== expense.id)],
    }));
    try {
      await apiClient.createExpense({
        amount: Number(expense.amount),
        category: expense.category,
        description: expense.description,
      });
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
        const backendTasks = taskRes.value.tasks;
        set((s) => {
          const merged = [...backendTasks];
          for (const localT of s.tasks) {
            if (!merged.some((m) => m.id === localT.id || (m.title.toLowerCase() === localT.title.toLowerCase() && m.status === localT.status))) {
              merged.push(localT);
            }
          }
          return { tasks: merged };
        });
      }
      if (expRes.status === 'fulfilled' && expRes.value.expenses) {
        const backendExps = expRes.value.expenses;
        set((s) => {
          const merged = [...backendExps];
          for (const localE of s.expenses) {
            if (!merged.some((m) => m.id === localE.id)) {
              merged.push(localE);
            }
          }
          return { expenses: merged };
        });
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

      // Automatically push temporary offline queued actions to cloud dataset
      set({ isOnline: true });
      await get().flushOfflineQueue();
    } catch {
      // Offline fallback
      set({ isOnline: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
