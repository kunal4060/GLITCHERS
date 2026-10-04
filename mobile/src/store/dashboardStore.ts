import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClassSession, Task, Expense, Budget, Debt, EmailSummary } from '@glitchers/shared';
import { apiClient } from '../api/client';
import { newUuid } from '../utils/tokenStorage';

const getActiveUserId = (): string => {
  // M3: never silently link data to 'offline-user' — a missing user id is a
  // programming error and must be loud, not hidden.
  try {
    const { useAuthStore } = require('./authStore');
    const id = useAuthStore?.getState?.()?.user?.id;
    if (id && typeof id === 'string') return id;
  } catch {
    /* fall through to throw */
  }
  throw new Error('[dashboardStore] getActiveUserId: no logged-in user');
};

// Real UUIDs for every client-minted entity id (L3). Backend accepts the
// client id on create, so local and server copies dedupe correctly (E2/E2b).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ensureUuid = (id?: string): string => (id && UUID_RE.test(id) ? id : newUuid());

// Consistent 50/50 split share (E4): exact half rounded to paise, used for
// both the recorded debt and any UI label — never Math.round(total/2).
export const splitShare = (totalAmount: number): number =>
  Math.round((totalAmount / 2) * 100) / 100;

// C7: in-flight guard for flushOfflineQueue — prevents overlapping flushes
// from double-sending the same queued actions.
let isFlushingQueue = false;

// H2: serialize whole-list class saves — concurrent addClass/updateClass calls
// would interleave and overwrite each other.
let classSaveChain: Promise<void> = Promise.resolve();

// H3: last-seen backend IDs per entity. Lets sync distinguish "never synced"
// (push up) from "synced before but now gone" (deleted on another device —
// drop locally instead of resurrecting by pushing back up).
let lastBackendIds: Record<string, Set<string>> = {};

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
  emailsLoaded: boolean;
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

  attendance: Record<string, { attended: number; total: number }>;
  markAttendance: (subjectName: string, present: boolean) => void;
  resetAttendance: (subjectName: string) => void;

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
    type: 'CREATE_EXPENSE' | 'CREATE_TASK' | 'SPLIT_EXPENSE' | 'CREATE_DEBT' | 'DELETE_TASK' | 'DELETE_EXPENSE' | 'DELETE_CLASS' | 'PAY_DEBT' | 'UPDATE_PROFILE' | 'UPDATE_TASK';
    payload: any;
    timestamp: string;
  }>;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  queueOfflineAction: (action: { type: 'CREATE_EXPENSE' | 'CREATE_TASK' | 'SPLIT_EXPENSE' | 'CREATE_DEBT' | 'DELETE_TASK' | 'DELETE_EXPENSE' | 'DELETE_CLASS' | 'PAY_DEBT' | 'UPDATE_PROFILE' | 'UPDATE_TASK'; payload: any }) => void;
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
          emailsLoaded: false,
          emailBullets: [],
          dismissedNoticeIds: [],
          chatMessages: [],
          offlineSyncQueue: [],
          // S12: clear ALL persisted user-data fields — otherwise user B sees
          // user A's cgpa/attendance/etc. on a shared device after logout.
          cgpa: '',
          credits: 0,
          avatarUrl: null,
          quietHours: true,
          attendance: {},
          aiMode: 'AUTO',
          activeOfflineModel: '',
          downloadedModels: [],
          downloadProgress: {},
          loadedModelFile: null,
          isLoading: false,
          isBackendConnected: false,
        });
      },
      cgpa: '',
      credits: 0,
      setCgpa: (cgpa) => set({ cgpa }),
      setCredits: (credits) => set({ credits }),
      updateAcademics: (cgpa, credits) => set({ cgpa, credits }),
      avatarUrl: null,
      setAvatarUrl: (avatarUrl) => set({ avatarUrl }),

      quietHours: true,
      setQuietHours: (quietHours) => set({ quietHours }),

      attendance: {},
      markAttendance: (subjectName, present) =>
        set((s) => {
          const prev = s.attendance[subjectName] || { attended: 0, total: 0 };
          return {
            attendance: {
              ...s.attendance,
              [subjectName]: {
                attended: prev.attended + (present ? 1 : 0),
                total: prev.total + 1,
              },
            },
          };
        }),
      resetAttendance: (subjectName) =>
        set((s) => {
          const next = { ...s.attendance };
          delete next[subjectName];
          return { attendance: next };
        }),

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
      // ponytail: no real download happens here yet — this just registers the
      // model id. The fake staged progress (15→45→80→100 on timers) was removed.
      // Upgrade path: implement actual Hugging Face download with real progress.
      downloadOfflineModel: async (modelId: string) => {
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
          id: newUuid(),
          type: action.type,
          payload: action.payload,
          timestamp: new Date().toISOString(),
        };
        set((s) => ({ offlineSyncQueue: [...s.offlineSyncQueue, item] }));
      },
      flushOfflineQueue: async () => {
        // C7: in-flight guard — a second concurrent flush would re-send the
        // same pending items before the first marks them done.
        if (isFlushingQueue) return { syncedCount: 0 };
        isFlushingQueue = true;
        try {
          const pending = get().offlineSyncQueue;
          if (pending.length === 0) return { syncedCount: 0 };

          // H3: only items that actually synced are removed — failures
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
                // C4: reuse the ids minted when the split was created locally,
                // so the server copy dedupes with the optimistic local one
                // instead of creating duplicates. (Older queued items without
                // ids fall back to fresh UUIDs.)
                const { expenseId, debtId, totalAmount, description, person } = item.payload;
                const splitTotal = Number(totalAmount);
                if (!Number.isFinite(splitTotal) || splitTotal <= 0) {
                  throw new Error('invalid split amount');
                }
                await apiClient.createExpense({
                  id: expenseId || newUuid(),
                  amount: splitTotal,
                  category: 'FOOD',
                  description: `${description} (Split with ${person})`,
                });
                await apiClient.createDebt({
                  id: debtId || newUuid(),
                  person,
                  amount: splitShare(totalAmount),
                  type: 'OWES_ME',
                  notes: `Split for ${description}`,
                });
              } else if (item.type === 'DELETE_TASK') {
                await apiClient.deleteTask(item.payload.id);
              } else if (item.type === 'DELETE_EXPENSE') {
                await apiClient.deleteExpense(item.payload.id);
              } else if (item.type === 'DELETE_CLASS') {
                await apiClient.deleteClass(item.payload.id);
              } else if (item.type === 'PAY_DEBT') {
                await apiClient.payDebt(item.payload.id);
              } else if (item.type === 'UPDATE_PROFILE') {
                await apiClient.updateProfile(item.payload);
              } else if (item.type === 'UPDATE_TASK') {
                await apiClient.updateTask(item.payload.id, item.payload.updates);
              }
              succeeded.add(item.id);
            } catch (err) {
              console.warn('[dashboardStore] flushOfflineQueue item failed:', item.type, err);
            }
          }
          // C7: remove synced items from the queue instead of just marking
          // them — the queue no longer grows unbounded.
          set((s) => ({
            offlineSyncQueue: s.offlineSyncQueue.filter((item) => !succeeded.has(item.id)),
          }));
          return { syncedCount: succeeded.size };
        } finally {
          isFlushingQueue = false;
        }
      },

      isHydrated: false,
      setIsHydrated: (isHydrated) => set({ isHydrated }),
      classes: [],
      tasks: [],
      expenses: [],
      budget: null,
      debts: [],
      emails: [],
      emailsLoaded: false,
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
        // M1: null clears the backend budget too (was silently kept).
        if (budget) {
          apiClient.updateBudget(budget.monthlyLimit).catch((e) =>
            console.warn('[dashboardStore] setBudget failed:', e?.message)
          );
        } else {
          apiClient.clearBudget().catch((e) =>
            console.warn('[dashboardStore] clearBudget failed:', e?.message)
          );
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
        apiClient.updateTask(taskId, { priority }).catch((e) => {
          console.warn('[dashboardStore] updateTaskPriority failed:', e?.message);
          get().queueOfflineAction({ type: 'UPDATE_TASK', payload: { id: taskId, updates: { priority } } });
        });
      },

      completeTask: (taskId) => {
        const completedAt = new Date().toISOString();
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, status: 'COMPLETED', completedAt } : t
          ),
        }));
        apiClient.updateTask(taskId, { status: 'COMPLETED', completedAt }).catch((e) => {
          console.warn('[dashboardStore] completeTask failed:', e?.message);
          get().queueOfflineAction({ type: 'UPDATE_TASK', payload: { id: taskId, updates: { status: 'COMPLETED', completedAt } } });
        });
      },

      deleteTask: (taskId) => {
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== taskId),
        }));
        // C5: on failure, queue the delete so the next flush retries it —
        // otherwise the item is resurrected by the next sync merge.
        apiClient.deleteTask(taskId).catch((e) => {
          console.warn('[dashboardStore] deleteTask failed:', e?.message);
          get().queueOfflineAction({ type: 'DELETE_TASK', payload: { id: taskId } });
        });
      },

      updateTask: (taskId, updates) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
        }));
        apiClient.updateTask(taskId, updates).catch((e) => {
          console.warn('[dashboardStore] updateTask failed:', e?.message);
          get().queueOfflineAction({ type: 'UPDATE_TASK', payload: { id: taskId, updates } });
        });
      },

      addClass: async (c) => {
        const newClass = { ...c, id: ensureUuid(c.id) } as ClassSession;
        set((s) => ({
          classes: [...s.classes.filter((x) => x.id !== newClass.id), newClass],
        }));
        // H2: chain whole-list saves so concurrent calls can't interleave.
        const run = classSaveChain.then(async () => {
          try {
            await apiClient.saveTimetableClasses(get().classes);
          } catch {
            /* offline: stays local, syncs on next syncWithBackend */
          }
        });
        classSaveChain = run.catch(() => undefined);
        await run;
      },

      updateClass: (classId, updates) => {
        set((s) => ({
          classes: s.classes.map((c) => (c.id === classId ? { ...c, ...updates } : c)),
        }));
        const run = classSaveChain.then(() =>
          apiClient.saveTimetableClasses(get().classes).catch((e) =>
            console.warn('[dashboardStore] updateClass save failed:', e?.message)
          )
        );
        classSaveChain = run.catch(() => undefined);
      },

      deleteClass: (classId) => {
        set((s) => ({
          classes: s.classes.filter((c) => c.id !== classId),
        }));
        // C5: on failure, queue the delete so the next flush retries it.
        apiClient.deleteClass(classId).catch((e) => {
          console.warn('[dashboardStore] deleteClass failed:', e?.message);
          get().queueOfflineAction({ type: 'DELETE_CLASS', payload: { id: classId } });
        });
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
        // H4: never send NaN to backend — default to 0.
        const safeAmount = Number(normalized.amount);
        normalized.amount = Number.isFinite(safeAmount) ? safeAmount : 0;
        try {
          await apiClient.createExpense({
            id: normalized.id,
            amount: normalized.amount,
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
        // C5: on failure, queue the delete so the next flush retries it.
        apiClient.deleteExpense(expenseId).catch((e) => {
          console.warn('[dashboardStore] deleteExpense failed:', e?.message);
          get().queueOfflineAction({ type: 'DELETE_EXPENSE', payload: { id: expenseId } });
        });
      },

      splitExpense: (totalAmount, description, person) => {
        // H4: reject non-finite amounts instead of recording garbage.
        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
          console.warn('[dashboardStore] splitExpense: invalid amount', totalAmount);
          return;
        }
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
        }).catch((e) => {
          console.warn('[dashboardStore] splitExpense createExpense failed:', e?.message);
          // C4: queue with the ids already minted above — flushOfflineQueue
          // reuses them so the server copy dedupes with the local one.
          get().queueOfflineAction({
            type: 'SPLIT_EXPENSE',
            payload: { expenseId: newExp.id, debtId: newDebt.id, totalAmount, description, person },
          });
        });

        apiClient.createDebt({
          id: newDebt.id,
          person,
          amount: half,
          type: 'OWES_ME',
          notes: `Split for ${description}`,
        }).catch((e) => {
          console.warn('[dashboardStore] splitExpense createDebt failed:', e?.message);
        });
      },

      addDebt: async (debt) => {
        const normalized = { ...debt, id: ensureUuid(debt.id) };
        set((s) => ({ debts: [normalized, ...s.debts.filter((d) => d.id !== normalized.id)] }));
        const debtAmt = Number(normalized.amount);
        normalized.amount = Number.isFinite(debtAmt) ? debtAmt : 0;
        try {
          await apiClient.createDebt({
            id: normalized.id,
            person: normalized.person,
            amount: normalized.amount,
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
        // C5: on failure, queue the pay action so the next flush retries it.
        apiClient.payDebt(debtId).catch((e) => {
          console.warn('[dashboardStore] markDebtPaid failed:', e?.message);
          get().queueOfflineAction({ type: 'PAY_DEBT', payload: { id: debtId } });
        });
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

          // 1. Classes: merge — empty backend list is valid (H3). Items synced
          // before but now missing were deleted elsewhere: drop them locally
          // instead of pushing them back up (resurrection).
          if (classRes.status === 'fulfilled' && classRes.value?.classes) {
            const incoming: ClassSession[] = classRes.value.classes;
            const localClasses = get().classes;
            const backendIds = new Set(incoming.map((c) => c.id));
            const prevIds = lastBackendIds.classes || new Set<string>();
            const unsynced = localClasses.filter((c) => {
              if (!c.id) return true;
              if (backendIds.has(c.id)) return false;
              return !prevIds.has(c.id); // seen on backend before → deleted elsewhere, drop
            });
            set({ classes: [...incoming, ...unsynced], isBackendConnected: true });
            lastBackendIds.classes = backendIds;
            if (unsynced.length > 0) {
              apiClient.saveTimetableClasses(unsynced).catch((e) => console.warn('[dashboardStore] syncWithBackend saveTimetableClasses failed:', e?.message));
            }
          }

          // 2. Tasks: merge — empty backend list is valid (H3).
          if (taskRes.status === 'fulfilled' && taskRes.value?.tasks) {
            const backendTasks: Task[] = taskRes.value.tasks;
            const localTasks = get().tasks;
            const backendIds = new Set(backendTasks.map((t) => t.id));
            const prevIds = lastBackendIds.tasks || new Set<string>();
            // S10: dedupe by id only — two different tasks may share a title.
            const unsynced = localTasks.filter((t) => !backendIds.has(t.id) && !prevIds.has(t.id));
            set({ tasks: [...backendTasks, ...unsynced] });
            lastBackendIds.tasks = backendIds;
            for (const t of unsynced) {
              apiClient.createTask({
                id: t.id,
                title: t.title,
                priority: t.priority,
                dueDate: t.dueDate,
                description: t.description,
              }).catch((e) => console.warn('[dashboardStore] syncWithBackend createTask failed:', e?.message));
            }
          }

          // 3. Expenses: merge — empty backend list is valid (H3).
          if (expRes.status === 'fulfilled' && expRes.value?.expenses) {
            const backendExps: Expense[] = expRes.value.expenses;
            const localExps = get().expenses;
            const backendIds = new Set(backendExps.map((e) => e.id));
            const prevIds = lastBackendIds.expenses || new Set<string>();
            const unsynced = localExps.filter((e) => !backendIds.has(e.id) && !prevIds.has(e.id));
            set({ expenses: [...backendExps, ...unsynced] });
            lastBackendIds.expenses = backendIds;
            for (const e of unsynced) {
              const amt = Number(e.amount);
              apiClient.createExpense({
                id: e.id,
                amount: Number.isFinite(amt) ? amt : 0,
                category: e.category,
                description: e.description,
                merchant: e.merchant || undefined,
              }).catch((err) => console.warn('[dashboardStore] syncWithBackend createExpense failed:', err?.message));
            }
          }

          // 4. Budget — M4: clear local when backend has none (was kept stale).
          if (budgetRes.status === 'fulfilled') {
            set({ budget: budgetRes.value?.budget ?? null });
          }

          // 5. Debts: merge — empty backend list is valid (H3).
          if (debtRes.status === 'fulfilled' && debtRes.value?.debts) {
            const backendDebts: Debt[] = debtRes.value.debts;
            const localDebts = get().debts;
            const backendIds = new Set(backendDebts.map((d) => d.id));
            const prevIds = lastBackendIds.debts || new Set<string>();
            const unsynced = localDebts.filter((d) => !backendIds.has(d.id) && !prevIds.has(d.id));
            set({ debts: [...backendDebts, ...unsynced] });
            lastBackendIds.debts = backendIds;
            // S8: always push unsynced local debts.
            for (const d of unsynced) {
              const amt = Number(d.amount);
              apiClient.createDebt({
                id: d.id,
                person: d.person,
                amount: Number.isFinite(amt) ? amt : 0,
                type: d.type,
                notes: d.notes || undefined,
              }).catch((e) => console.warn('[dashboardStore] syncWithBackend createDebt failed:', e?.message));
            }
          }

          // 6. Emails / University Circulars: merge & honor dismissed status.
          // NOTE: no subject-based filtering — the old demo-data filter could
          // hide REAL university emails with similar subjects.
          if (emailRes.status === 'fulfilled' && emailRes.value?.emails) {
            const incomingEmails: EmailSummary[] = emailRes.value.emails || [];
            const dismissedSet = new Set(get().dismissedNoticeIds);
            incomingEmails.forEach((e) => {
              if ((e.isDismissed || (e as any).processed) && e.id) {
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
              emailsLoaded: true,
              dismissedNoticeIds: Array.from(dismissedSet),
              ...(hasPredefinedBullets || activeList.length === 0
                ? { emailBullets: ['All university circulars and notices have been acknowledged & cleared! 🎉'] }
                : {}),
            });
          }

          // 7. Chat messages: merge — keep offline-composed local messages (C6).
          // Dedupe by id: local-only messages first, then backend messages.
          if (chatRes.status === 'fulfilled' && chatRes.value?.messages) {
            const backendMsgs: ChatMessage[] = chatRes.value.messages;
            const backendIds = new Set(backendMsgs.map((m) => m.id));
            const localOnly = get().chatMessages.filter((m) => m.id && !backendIds.has(m.id));
            set({ chatMessages: [...localOnly, ...backendMsgs] });
          }

          // 8. Profile
          if (profileRes.status === 'fulfilled' && profileRes.value?.user) {
            const u = profileRes.value.user;
            if (u.id !== '00000000-0000-0000-0000-000000000001') {
              if (u.cgpa) set({ cgpa: String(u.cgpa) });
              if (u.creditsCompleted !== undefined && u.creditsCompleted !== null) {
                const cr = Number(u.creditsCompleted);
                if (Number.isFinite(cr)) set({ credits: cr });
              }
              if (u.avatarUrl) set({ avatarUrl: u.avatarUrl });
            }
          }

          // Automatically push temporary offline queued actions to cloud dataset
          set({ isOnline: true });
          await get().flushOfflineQueue();
        } catch (err: any) {
          // M2: only treat transport failures as offline — a code bug throwing
          // here must not be misreported as "no internet".
          const msg = String(err?.message || '').toLowerCase();
          const isNetwork = err?.name === 'AbortError' || err?.name === 'TypeError' ||
            /network|fetch|timeout|aborted|econn|offline/.test(msg);
          if (isNetwork) {
            set({ isOnline: false });
          } else {
            console.warn('[dashboardStore] syncWithBackend code error:', err);
          }
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
        attendance: state.attendance,
        aiMode: state.aiMode,
        downloadedModels: state.downloadedModels,
        activeOfflineModel: state.activeOfflineModel,
        offlineSyncQueue: state.offlineSyncQueue,
      }),
    }
  )
);
