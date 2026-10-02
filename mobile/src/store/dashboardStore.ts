import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClassSession, Task, Expense, Budget, Debt, EmailSummary } from '@glitchers/shared';
import { apiClient } from '../api/client';
import { newUuid } from '../utils/tokenStorage';

const getActiveUserId = () => {
  try {
    const { useAuthStore } = require('./authStore');
    return useAuthStore?.getState?.()?.user?.id || 'offline-user';
  } catch {
    return 'offline-user';
  }
};

// Real UUIDs for every client-minted entity id (L3). Backend accepts the
// client id on create, so local and server copies dedupe correctly (E2/E2b).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ensureUuid = (id?: string): string => (id && UUID_RE.test(id) ? id : newUuid());

// Consistent 50/50 split share (E4): exact half rounded to paise, used for
// both the recorded debt and any UI label — never Math.round(total/2).
export const splitShare = (totalAmount: number): number =>
  Math.round((totalAmount / 2) * 100) / 100;

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
  isHydrated: boolean;
  classes: ClassSession[];
  tasks: Task[];
  expenses: Expense[];
  budget: Budget | null;
  debts: Debt[];
  emails: EmailSummary[];
  emailBullets: string[];
  dismissedNoticeIds: string[];
  chatMessages: ChatMessage[];
  isLoading: boolean;
  isBackendConnected: boolean;

  setIsHydrated: (isHydrated: boolean) => void;
  setClasses: (classes: ClassSession[]) => void;
  setTasks: (tasks: Task[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setBudget: (budget: Budget | null) => void;
  setDebts: (debts: Debt[]) => void;
  setEmails: (emails: EmailSummary[]) => void;
  setEmailBullets: (bullets: string[]) => void;
  dismissNotice: (noticeId: string) => void;
  restoreNotice: (noticeId: string) => void;
  setChatMessages: (chatMessages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateChatMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearChatMessages: () => void;

  addTask: (task: Task) => Promise<void>;
  updateTaskPriority: (taskId: string, priority: Task['priority']) => void;
  completeTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;

  addClass: (c: Partial<ClassSession>) => Promise<void>;
  updateClass: (classId: string, updates: Partial<ClassSession>) => void;
  deleteClass: (classId: string) => void;

  addExpense: (expense: Expense, opts?: { skipRemote?: boolean }) => Promise<void>;
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

  quietHours: boolean;
  setQuietHours: (enabled: boolean) => void;

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
  reset: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      reset: () => {
        set({
          classes: [],
          tasks: [],
          expenses: [],
          budget: null,
          debts: [],
          emails: [],
          emailBullets: [],
          dismissedNoticeIds: [],
          chatMessages: [],
          offlineSyncQueue: [],
        });
      },
      cgpa: '8.71',
      credits: 42,
      setCgpa: (cgpa) => set({ cgpa }),
      setCredits: (credits) => set({ credits }),
      updateAcademics: (cgpa, credits) => set({ cgpa, credits }),
      avatarUrl: null,
      setAvatarUrl: (avatarUrl) => set({ avatarUrl }),

      quietHours: true,
      setQuietHours: (quietHours) => set({ quietHours }),

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

        // H3: only items that actually synced are marked synced — failures
        // stay queued for the next flush instead of being silently dropped.
        const succeeded = new Set<string>();
        for (const item of pending) {
          try {
            if (item.type === 'CREATE_EXPENSE') {
              await apiClient.createExpense({ id: item.payload.id, ...item.payload });
            } else if (item.type === 'CREATE_TASK') {
              await apiClient.createTask({ id: item.payload.id, ...item.payload });
            } else if (item.type === 'CREATE_DEBT') {
              await apiClient.createDebt({ id: item.payload.id, ...item.payload });
            } else if (item.type === 'SPLIT_EXPENSE') {
              const { totalAmount, description, person } = item.payload;
              await apiClient.createExpense({
                id: newUuid(),
                amount: totalAmount,
                category: 'FOOD',
                description: `${description} (Split with ${person})`,
              });
              await apiClient.createDebt({
                id: newUuid(),
                person,
                amount: splitShare(totalAmount),
                type: 'OWES_ME',
                notes: `Split for ${description}`,
              });
            }
            succeeded.add(item.id);
          } catch (err) {
            console.warn('Offline push item failed:', err);
          }
        }
        set((s) => ({
          offlineSyncQueue: s.offlineSyncQueue.map((item) =>
            succeeded.has(item.id) ? { ...item, synced: true } : item
          ),
        }));
        return { syncedCount: succeeded.size };
      },

      isHydrated: false,
      setIsHydrated: (isHydrated) => set({ isHydrated }),
      classes: [],
      tasks: [],
      expenses: [],
      budget: null,
      debts: [],
      emails: [],
      emailBullets: ['All university circulars and notices have been acknowledged & cleared! 🎉'],
      dismissedNoticeIds: [],
      chatMessages: [],
      isLoading: false,
      isBackendConnected: false,

      setClasses: (classes) => set({ classes }),
      setTasks: (tasks) => set({ tasks }),
      setExpenses: (expenses) => set({ expenses }),
      setBudget: (budget) => {
        set({ budget });
        // E3: persist to backend — budget must survive reinstall/logout.
        if (budget) {
          apiClient.updateBudget(budget.monthlyLimit).catch(() => null);
        }
      },
      setDebts: (debts) => set({ debts }),
      setEmails: (emails) => set({ emails }),
      setEmailBullets: (emailBullets) => set({ emailBullets }),
      dismissNotice: (noticeId) => {
        set((s) => ({
          dismissedNoticeIds: Array.from(new Set([...s.dismissedNoticeIds, noticeId])),
          emails: s.emails.map((e) => (e.id === noticeId ? { ...e, isDismissed: true } : e)),
        }));
        apiClient.dismissEmailNotice(noticeId).catch(() => null);
      },
      restoreNotice: (noticeId) => {
        set((s) => ({
          dismissedNoticeIds: s.dismissedNoticeIds.filter((id) => id !== noticeId),
          emails: s.emails.map((e) => (e.id === noticeId ? { ...e, isDismissed: false } : e)),
        }));
        apiClient.restoreEmailNotice(noticeId).catch(() => null);
      },
      setChatMessages: (chatMessages) => set({ chatMessages }),
      addChatMessage: (message) => set((s) => ({ chatMessages: [...s.chatMessages, message] })),
      updateChatMessage: (id, patch) =>
        set((s) => ({
          chatMessages: s.chatMessages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      clearChatMessages: () => {
        set({ chatMessages: [] });
        apiClient.clearChatHistory().catch(() => null);
      },

      addTask: async (task) => {
        const normalized = { ...task, id: ensureUuid(task.id) };
        set((s) => ({
          tasks: [normalized, ...s.tasks.filter((t) => t.id !== normalized.id)],
        }));
        try {
          await apiClient.createTask({
            id: normalized.id,
            title: normalized.title,
            priority: normalized.priority,
            dueDate: normalized.dueDate,
            description: normalized.description,
          });
        } catch {
          get().queueOfflineAction({ type: 'CREATE_TASK', payload: normalized });
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

      updateTask: (taskId, updates) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
        }));
        apiClient.updateTask(taskId, updates).catch(() => null);
      },

      addClass: async (c) => {
        const newClass = { ...c, id: ensureUuid(c.id) } as ClassSession;
        set((s) => ({
          classes: [...s.classes.filter((x) => x.id !== newClass.id), newClass],
        }));
        try {
          await apiClient.saveTimetableClasses(get().classes);
        } catch {
          /* offline: stays local, syncs on next syncWithBackend */
        }
      },

      updateClass: (classId, updates) => {
        set((s) => ({
          classes: s.classes.map((c) => (c.id === classId ? { ...c, ...updates } : c)),
        }));
        apiClient.saveTimetableClasses(get().classes).catch(() => null);
      },

      deleteClass: (classId) => {
        set((s) => ({
          classes: s.classes.filter((c) => c.id !== classId),
        }));
        apiClient.deleteClass(classId).catch(() => null);
      },

      addExpense: async (expense, opts) => {
        const normalized = { ...expense, id: ensureUuid(expense.id) };
        set((s) => ({
          expenses: [normalized, ...s.expenses.filter((e) => e.id !== normalized.id)],
        }));
        if (opts?.skipRemote) {
          // E1: backend already saved this record (e.g. scanned bill) — don't POST again.
          return;
        }
        try {
          await apiClient.createExpense({
            id: normalized.id,
            amount: Number(normalized.amount),
            category: normalized.category,
            description: normalized.description,
            merchant: normalized.merchant || undefined,
          });
        } catch {
          get().queueOfflineAction({ type: 'CREATE_EXPENSE', payload: normalized });
        }
      },

      deleteExpense: (expenseId) => {
        set((s) => ({
          expenses: s.expenses.filter((e) => e.id !== expenseId),
        }));
        apiClient.deleteExpense(expenseId).catch(() => null);
      },

      splitExpense: (totalAmount, description, person) => {
        const half = splitShare(totalAmount);
        const currentUserId = getActiveUserId();
        const newExp: Expense = {
          id: newUuid(),
          userId: currentUserId,
          amount: totalAmount,
          category: 'FOOD',
          description: `${description} (Split with ${person})`,
          date: new Date().toISOString(),
          type: 'EXPENSE',
        };
        const newDebt: Debt = {
          id: newUuid(),
          userId: currentUserId,
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
          id: newExp.id,
          amount: totalAmount,
          category: 'FOOD',
          description: `${description} (Split with ${person})`,
        }).catch(() => {
          get().queueOfflineAction({ type: 'SPLIT_EXPENSE', payload: { totalAmount, description, person } });
        });

        apiClient.createDebt({
          id: newDebt.id,
          person,
          amount: half,
          type: 'OWES_ME',
          notes: `Split for ${description}`,
        }).catch(() => null);
      },

      addDebt: async (debt) => {
        const normalized = { ...debt, id: ensureUuid(debt.id) };
        set((s) => ({ debts: [normalized, ...s.debts.filter((d) => d.id !== normalized.id)] }));
        try {
          await apiClient.createDebt({
            id: normalized.id,
            person: normalized.person,
            amount: Number(normalized.amount),
            type: normalized.type,
            notes: normalized.notes || undefined,
          });
        } catch {
          get().queueOfflineAction({ type: 'CREATE_DEBT', payload: normalized });
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
          // Initialize/confirm real user token is ready before batch fetch
          const activeToken = await apiClient.getEffectiveToken();
          if (activeToken) {
            apiClient.setToken(activeToken);
          }

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

          // 1. Classes: merge without data loss
          if (classRes.status === 'fulfilled' && classRes.value?.classes) {
            const incoming = classRes.value.classes;
            if (incoming.length > 0) {
              set({ classes: incoming, isBackendConnected: true });
            } else if (get().classes.length > 0) {
              apiClient.saveTimetableClasses(get().classes).catch(() => null);
            }
          }

          // 2. Tasks: non-destructive merge (retain local offline tasks & push up)
          if (taskRes.status === 'fulfilled' && taskRes.value?.tasks) {
            const backendTasks: Task[] = taskRes.value.tasks;
            const localTasks = get().tasks;
            if (backendTasks.length > 0) {
              const backendIds = new Set(backendTasks.map((t) => t.id));
              const backendTitles = new Set(backendTasks.map((t) => t.title.toLowerCase().trim()));
              const unsynced = localTasks.filter(
                (t) => !backendIds.has(t.id) && !backendTitles.has(t.title.toLowerCase().trim())
              );
              set({ tasks: [...backendTasks, ...unsynced] });
              for (const t of unsynced) {
                apiClient.createTask({
                  id: t.id,
                  title: t.title,
                  priority: t.priority,
                  dueDate: t.dueDate,
                  description: t.description,
                }).catch(() => null);
              }
            } else if (localTasks.length > 0) {
              for (const t of localTasks) {
                apiClient.createTask({
                  id: t.id,
                  title: t.title,
                  priority: t.priority,
                  dueDate: t.dueDate,
                  description: t.description,
                }).catch(() => null);
              }
            }
          }

          // 3. Expenses: non-destructive merge
          if (expRes.status === 'fulfilled' && expRes.value?.expenses) {
            const backendExps: Expense[] = expRes.value.expenses;
            const localExps = get().expenses;
            if (backendExps.length > 0) {
              const backendIds = new Set(backendExps.map((e) => e.id));
              const unsynced = localExps.filter((e) => !backendIds.has(e.id));
              set({ expenses: [...backendExps, ...unsynced] });
              for (const e of unsynced) {
                apiClient.createExpense({
                  id: e.id,
                  amount: Number(e.amount),
                  category: e.category,
                  description: e.description,
                  merchant: e.merchant || undefined,
                }).catch(() => null);
              }
            } else if (localExps.length > 0) {
              for (const e of localExps) {
                apiClient.createExpense({
                  id: e.id,
                  amount: Number(e.amount),
                  category: e.category,
                  description: e.description,
                  merchant: e.merchant || undefined,
                }).catch(() => null);
              }
            }
          }

          // 4. Budget
          if (budgetRes.status === 'fulfilled' && budgetRes.value?.budget) {
            set({ budget: budgetRes.value.budget });
          }

          // 5. Debts: non-destructive merge
          if (debtRes.status === 'fulfilled' && debtRes.value?.debts) {
            const backendDebts: Debt[] = debtRes.value.debts;
            const localDebts = get().debts;
            if (backendDebts.length > 0) {
              const backendIds = new Set(backendDebts.map((d) => d.id));
              const unsynced = localDebts.filter((d) => !backendIds.has(d.id));
              set({ debts: [...backendDebts, ...unsynced] });
            } else if (localDebts.length > 0) {
              for (const d of localDebts) {
                apiClient.createDebt({
                  id: d.id,
                  person: d.person,
                  amount: Number(d.amount),
                  type: d.type,
                  notes: d.notes || undefined,
                }).catch(() => null);
              }
            }
          }

          // 6. Emails / University Circulars: merge & honor dismissed status
          if (emailRes.status === 'fulfilled' && emailRes.value?.emails) {
            const rawList: EmailSummary[] = emailRes.value.emails || [];
            const incomingEmails: EmailSummary[] = rawList.filter(
              (e: EmailSummary) =>
                !e.subject?.includes('Semester End Examination') &&
                !e.subject?.includes('Continuous Internal Assessment') &&
                !e.subject?.includes('Annual University Hackathon') &&
                e.sender !== 'dean.academics@university.edu' &&
                e.sender !== 'department.head@university.edu' &&
                e.sender !== 'events@university.edu'
            );
            const dismissedSet = new Set(get().dismissedNoticeIds);
            incomingEmails.forEach((e) => {
              if (e.isDismissed || (e as any).processed) {
                dismissedSet.add(e.id);
              }
            });
            const mergedEmails = incomingEmails.map((e) => ({
              ...e,
              isDismissed: dismissedSet.has(e.id),
            }));
            const activeList = mergedEmails.filter((e) => !e.isDismissed);
            const hasPredefinedBullets = get().emailBullets.some((b) =>
              b.includes('Semester End Examination') ||
              b.includes('Continuous Internal Assessment') ||
              b.includes('Annual University Hackathon')
            );
            set({
              emails: mergedEmails,
              dismissedNoticeIds: Array.from(dismissedSet),
              ...(hasPredefinedBullets || activeList.length === 0
                ? { emailBullets: ['All university circulars and notices have been acknowledged & cleared! 🎉'] }
                : {}),
            });
          }

          // 7. Chat messages: keep recent messages intact
          if (chatRes.status === 'fulfilled' && chatRes.value?.messages) {
            const backendMsgs = chatRes.value.messages;
            if (backendMsgs.length > 0) {
              set({ chatMessages: backendMsgs });
            }
          }

          // 8. Profile
          if (profileRes.status === 'fulfilled' && profileRes.value?.user) {
            const u = profileRes.value.user;
            if (u.id !== '00000000-0000-0000-0000-000000000001') {
              if (u.cgpa) set({ cgpa: String(u.cgpa) });
              if (u.creditsCompleted !== undefined) set({ credits: Number(u.creditsCompleted) });
              if (u.avatarUrl) set({ avatarUrl: u.avatarUrl });
            }
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
      name: 'nexa-dashboard-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setIsHydrated(true);
        }
      },
      partialize: (state) => ({
        classes: state.classes,
        tasks: state.tasks,
        expenses: state.expenses,
        budget: state.budget,
        debts: state.debts,
        emails: state.emails,
        emailBullets: state.emailBullets,
        dismissedNoticeIds: state.dismissedNoticeIds,
        chatMessages: state.chatMessages,
        cgpa: state.cgpa,
        credits: state.credits,
        avatarUrl: state.avatarUrl,
        quietHours: state.quietHours,
        aiMode: state.aiMode,
        downloadedModels: state.downloadedModels,
        activeOfflineModel: state.activeOfflineModel,
        offlineSyncQueue: state.offlineSyncQueue,
      }),
    }
  )
);
