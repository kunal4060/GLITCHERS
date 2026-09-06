import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClassSession, Task, Expense, Budget, Debt, EmailSummary } from '@glitchers/shared';
import { apiClient } from '../api/client';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  imageUri?: string;
  actionCard?: any;
  timestamp: string;
}

export interface LoadedModelFileInfo {
  name: string;
  size: number;
  uri: string;
  mimeType?: string;
  loadedAt: string;
  modelId?: string;
}

interface DashboardState {
  classes: ClassSession[];
  tasks: Task[];
  expenses: Expense[];
  budget: Budget | null;
  debts: Debt[];
  emails: EmailSummary[];
  chatMessages: ChatMessage[];
  isLoading: boolean;
  isBackendConnected: boolean;

  setClasses: (classes: ClassSession[]) => void;
  setTasks: (tasks: Task[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setBudget: (budget: Budget | null) => void;
  setDebts: (debts: Debt[]) => void;
  setEmails: (emails: EmailSummary[]) => void;
  setChatMessages: (chatMessages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;

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
  loadedModelFile: LoadedModelFileInfo | null;
  setAiMode: (mode: 'AUTO' | 'OFFLINE' | 'CLOUD') => void;
  setActiveOfflineModel: (modelId: string) => void;
  setLoadedModelFile: (file: LoadedModelFileInfo | null) => void;
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

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      cgpa: '8.71',
      credits: 42,
      setCgpa: (cgpa) => set({ cgpa }),
      setCredits: (credits) => set({ credits }),
      updateAcademics: (cgpa, credits) => set({ cgpa, credits }),
      avatarUrl: null,
      setAvatarUrl: (avatarUrl) => set({ avatarUrl }),

      aiMode: 'AUTO',
      activeOfflineModel: '',
      downloadedModels: [],
      downloadProgress: {},
      loadedModelFile: null,
      setAiMode: (aiMode) => set({ aiMode }),
      setActiveOfflineModel: (activeOfflineModel) => set({ activeOfflineModel }),
      setLoadedModelFile: (loadedModelFile) =>
        set((s) => ({
          loadedModelFile,
          aiMode: loadedModelFile ? 'OFFLINE' : s.aiMode,
          activeOfflineModel: loadedModelFile ? (loadedModelFile.modelId || loadedModelFile.name) : s.activeOfflineModel,
          downloadedModels: loadedModelFile
            ? Array.from(new Set([...s.downloadedModels, loadedModelFile.modelId || loadedModelFile.name]))
            : s.downloadedModels,
        })),
      downloadOfflineModel: async (modelId: string) => {
        set((s) => ({
          downloadProgress: { ...s.downloadProgress, [modelId]: 15 },
        }));
        await new Promise((r) => setTimeout(r, 250));
        set((s) => ({
          downloadProgress: { ...s.downloadProgress, [modelId]: 45 },
        }));
        await new Promise((r) => setTimeout(r, 300));
        set((s) => ({
          downloadProgress: { ...s.downloadProgress, [modelId]: 80 },
        }));
        await new Promise((r) => setTimeout(r, 250));
        set((s) => ({
          downloadProgress: { ...s.downloadProgress, [modelId]: 100 },
          downloadedModels: Array.from(new Set([...s.downloadedModels, modelId])),
          activeOfflineModel: modelId,
        }));
      },

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
            } else if (item.type === 'CREATE_DEBT') {
              await apiClient.createDebt(item.payload);
              syncedCount++;
            } else if (item.type === 'SPLIT_EXPENSE') {
              const { totalAmount, description, person } = item.payload;
              await apiClient.createExpense({
                amount: totalAmount,
                category: 'FOOD',
                description: `${description} (Split with ${person})`,
              });
              await apiClient.createDebt({
                person,
                amount: Math.round(totalAmount / 2),
                type: 'OWES_ME',
                notes: `Split for ${description}`,
              });
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

      classes: [],
      tasks: [],
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
      chatMessages: [],
      isLoading: false,
      isBackendConnected: false,

      setClasses: (classes) => set({ classes }),
      setTasks: (tasks) => set({ tasks }),
      setExpenses: (expenses) => set({ expenses }),
      setBudget: (budget) => set({ budget }),
      setDebts: (debts) => set({ debts }),
      setEmails: (emails) => set({ emails }),
      setChatMessages: (chatMessages) => set({ chatMessages }),
      addChatMessage: (message) => set((s) => ({ chatMessages: [...s.chatMessages, message] })),
      clearChatMessages: () => {
        set({ chatMessages: [] });
        apiClient.clearChatHistory().catch(() => null);
      },

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
          get().queueOfflineAction({ type: 'CREATE_TASK', payload: task });
        }
      },

      updateTaskPriority: (taskId, priority) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, priority } : t)),
        }));
        apiClient.updateTask(taskId, { priority }).catch(() => null);
      },

      completeTask: (taskId) => {
        const completedAt = new Date().toISOString();
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, status: 'COMPLETED', completedAt } : t
          ),
        }));
        apiClient.updateTask(taskId, { status: 'COMPLETED', completedAt }).catch(() => null);
      },

      deleteTask: (taskId) => {
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== taskId),
        }));
        apiClient.deleteTask(taskId).catch(() => null);
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
            merchant: expense.merchant || undefined,
          });
        } catch {
          get().queueOfflineAction({ type: 'CREATE_EXPENSE', payload: expense });
        }
      },

      deleteExpense: (expenseId) => {
        set((s) => ({
          expenses: s.expenses.filter((e) => e.id !== expenseId),
        }));
        apiClient.deleteExpense(expenseId).catch(() => null);
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

        apiClient.createExpense({
          amount: totalAmount,
          category: 'FOOD',
          description: `${description} (Split with ${person})`,
        }).catch(() => {
          get().queueOfflineAction({ type: 'SPLIT_EXPENSE', payload: { totalAmount, description, person } });
        });

        apiClient.createDebt({
          person,
          amount: half,
          type: 'OWES_ME',
          notes: `Split for ${description}`,
        }).catch(() => null);
      },

      addDebt: async (debt) => {
        set((s) => ({ debts: [debt, ...s.debts] }));
        try {
          await apiClient.createDebt({
            person: debt.person,
            amount: Number(debt.amount),
            type: debt.type,
            notes: debt.notes || undefined,
          });
        } catch {
          get().queueOfflineAction({ type: 'CREATE_DEBT', payload: debt });
        }
      },

      markDebtPaid: (debtId) => {
        set((s) => ({
          debts: s.debts.map((d) => (d.id === debtId ? { ...d, status: 'PAID', paidAmount: d.amount } : d)),
        }));
        apiClient.payDebt(debtId).catch(() => null);
      },

      syncWithBackend: async () => {
        set({ isLoading: true });
        try {
          const [classRes, taskRes, expRes, budgetRes, debtRes, emailRes, chatRes, profileRes] = await Promise.allSettled([
            apiClient.fetchTimetableClasses(),
            apiClient.fetchTasks(),
            apiClient.fetchExpenses(),
            apiClient.fetchBudget(),
            apiClient.fetchDebts(),
            apiClient.fetchEmails(),
            apiClient.getChatHistory(),
            apiClient.getProfile(),
          ]);

          if (classRes.status === 'fulfilled' && classRes.value?.classes) {
            set({ classes: classRes.value.classes, isBackendConnected: true });
          }
          if (taskRes.status === 'fulfilled' && taskRes.value?.tasks) {
            set({ tasks: taskRes.value.tasks });
          }
          if (expRes.status === 'fulfilled' && expRes.value?.expenses) {
            set({ expenses: expRes.value.expenses });
          }
          if (budgetRes.status === 'fulfilled' && budgetRes.value?.budget) {
            set({ budget: budgetRes.value.budget });
          }
          if (debtRes.status === 'fulfilled' && debtRes.value?.debts) {
            set({ debts: debtRes.value.debts });
          }
          if (emailRes.status === 'fulfilled' && emailRes.value?.emails) {
            set({ emails: emailRes.value.emails });
          }
          if (chatRes.status === 'fulfilled' && chatRes.value?.messages) {
            set({ chatMessages: chatRes.value.messages });
          }
          if (profileRes.status === 'fulfilled' && profileRes.value?.user) {
            const u = profileRes.value.user;
            if (u.cgpa) set({ cgpa: String(u.cgpa) });
            if (u.creditsCompleted !== undefined) set({ credits: Number(u.creditsCompleted) });
            if (u.avatarUrl) set({ avatarUrl: u.avatarUrl });
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
    }),
    {
      name: 'glitchers-dashboard-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        classes: state.classes,
        tasks: state.tasks,
        expenses: state.expenses,
        budget: state.budget,
        debts: state.debts,
        chatMessages: state.chatMessages,
        cgpa: state.cgpa,
        credits: state.credits,
        avatarUrl: state.avatarUrl,
        aiMode: state.aiMode,
        downloadedModels: state.downloadedModels,
        activeOfflineModel: state.activeOfflineModel,
      }),
    }
  )
);
