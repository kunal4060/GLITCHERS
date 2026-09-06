import { randomUUID } from 'crypto';
import { getSupabaseClient } from './supabaseClient.js';
import { inMemoryStore } from './inMemoryStore.js';
import type {
  UserProfile,
  ClassSession,
  Task,
  Expense,
  Debt,
} from '@glitchers/shared';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureUUID(id?: string): string {
  if (id && UUID_REGEX.test(id)) {
    return id;
  }
  return randomUUID();
}

export class SupabaseStore {
  // ==========================================
  // PROFILES & AUTH
  // ==========================================

  public async getProfile(userId: string): Promise<UserProfile | null> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (data && !error) {
          const profile: UserProfile = {
            id: data.id,
            email: data.email,
            fullName: data.full_name || '',
            avatarUrl: data.avatar_url || null,
            university: data.university || 'State Technological University',
            course: data.course || 'Computer Science & Engineering',
            year: data.year || 3,
            semester: data.semester || 6,
            section: data.section || 'A',
            cgpa: data.cgpa ? String(data.cgpa) : '8.71',
            creditsCompleted: data.credits_completed ?? 42,
            creditsCurrent: data.credits_current ?? 18,
            universityDomain: data.university_domain || 'university.edu',
            isOnboardingComplete: data.is_onboarding_complete ?? false,
            createdAt: data.created_at || new Date().toISOString(),
          };
          inMemoryStore.profiles.set(userId, profile);
          return profile;
        }
      } catch (err) {
        console.warn('SupabaseStore.getProfile error:', err);
      }
    }

    return inMemoryStore.profiles.get(userId) || null;
  }

  public async findProfileByEmail(email: string): Promise<UserProfile | null> {
    const safeEmail = email.trim().toLowerCase();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', safeEmail)
          .maybeSingle();

        if (data && !error) {
          const profile: UserProfile = {
            id: data.id,
            email: data.email,
            fullName: data.full_name || '',
            avatarUrl: data.avatar_url || null,
            university: data.university || 'State Technological University',
            course: data.course || 'Computer Science & Engineering',
            year: data.year || 3,
            semester: data.semester || 6,
            section: data.section || 'A',
            cgpa: data.cgpa ? String(data.cgpa) : '8.71',
            creditsCompleted: data.credits_completed ?? 42,
            creditsCurrent: data.credits_current ?? 18,
            universityDomain: data.university_domain || (safeEmail.includes('@') ? safeEmail.split('@')[1] : 'university.edu'),
            isOnboardingComplete: data.is_onboarding_complete ?? false,
            createdAt: data.created_at || new Date().toISOString(),
          };
          inMemoryStore.profiles.set(profile.id, profile);
          return profile;
        }
      } catch (err) {
        console.warn('SupabaseStore.findProfileByEmail error:', err);
      }
    }

    const inMem = Array.from(inMemoryStore.profiles.values()).find(
      (p) => p.email.toLowerCase() === safeEmail
    );
    return inMem || null;
  }

  public async syncOrEnsureUser(email: string, name?: string): Promise<UserProfile> {
    const safeEmail = email.trim().toLowerCase();
    const supabase = getSupabaseClient();

    let userId: string | null = null;
    let existingProfile: UserProfile | null = await this.findProfileByEmail(safeEmail);

    if (supabase) {
      try {
        const { data: userList } = await supabase.auth.admin.listUsers();
        let authUser = userList?.users?.find((u) => u.email?.toLowerCase() === safeEmail);

        if (!authUser) {
          const { data: created, error: createErr } = await supabase.auth.admin.createUser({
            email: safeEmail,
            email_confirm: true,
            user_metadata: { full_name: name || 'Student User' },
          });
          if (createErr) console.warn('Supabase createUser warning:', createErr.message);
          authUser = created?.user || undefined;
        }

        if (authUser) {
          userId = authUser.id;

          const defaultName = name || existingProfile?.fullName || 'Student User';
          const defaultUni = existingProfile?.university || (safeEmail.includes('@') && !safeEmail.endsWith('gmail.com') ? safeEmail.split('@')[1].toUpperCase() : 'State Technological University');
          const defaultDomain = safeEmail.includes('@') ? safeEmail.split('@')[1] : 'university.edu';

          const { data: profileRow } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              email: safeEmail,
              full_name: defaultName,
              university: defaultUni,
              course: existingProfile?.course || 'Computer Science & Engineering',
              year: existingProfile?.year || 3,
              semester: existingProfile?.semester || 6,
              section: existingProfile?.section || 'A',
              cgpa: existingProfile?.cgpa ? String(existingProfile.cgpa) : '8.71',
              credits_completed: existingProfile?.creditsCompleted ?? 42,
              credits_current: existingProfile?.creditsCurrent ?? 18,
              university_domain: defaultDomain,
              is_onboarding_complete: existingProfile?.isOnboardingComplete ?? false,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })
            .select('*')
            .maybeSingle();

          if (profileRow) {
            const profile: UserProfile = {
              id: profileRow.id,
              email: profileRow.email,
              fullName: profileRow.full_name || defaultName,
              avatarUrl: profileRow.avatar_url || null,
              university: profileRow.university || defaultUni,
              course: profileRow.course || 'Computer Science & Engineering',
              year: profileRow.year || 3,
              semester: profileRow.semester || 6,
              section: profileRow.section || 'A',
              cgpa: profileRow.cgpa ? String(profileRow.cgpa) : '8.71',
              creditsCompleted: profileRow.credits_completed ?? 42,
              creditsCurrent: profileRow.credits_current ?? 18,
              universityDomain: profileRow.university_domain || defaultDomain,
              isOnboardingComplete: profileRow.is_onboarding_complete ?? false,
              createdAt: profileRow.created_at || new Date().toISOString(),
            };
            inMemoryStore.profiles.set(userId, profile);
            return profile;
          }
        }
      } catch (err) {
        console.warn('SupabaseStore.syncOrEnsureUser warning:', err);
      }
    }

    if (existingProfile) return existingProfile;

    const fallbackId = userId || randomUUID();
    const fallbackProfile: UserProfile = {
      id: fallbackId,
      email: safeEmail,
      fullName: name || 'Student User',
      university: 'State Technological University',
      course: 'Computer Science & Engineering',
      year: 3,
      semester: 6,
      section: 'A',
      cgpa: '8.71',
      creditsCompleted: 42,
      creditsCurrent: 18,
      universityDomain: safeEmail.includes('@') ? safeEmail.split('@')[1] : 'university.edu',
      isOnboardingComplete: false,
      createdAt: new Date().toISOString(),
    };
    inMemoryStore.profiles.set(fallbackId, fallbackProfile);
    return fallbackProfile;
  }

  public async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const existing = (await this.getProfile(userId)) || {
      id: userId,
      email: 'student@university.edu',
      fullName: 'Student User',
      university: 'State Technological University',
      course: 'Computer Science & Engineering',
      year: 3,
      semester: 6,
      section: 'A',
      cgpa: '8.71',
      creditsCompleted: 42,
      creditsCurrent: 18,
      universityDomain: 'university.edu',
      isOnboardingComplete: false,
      createdAt: new Date().toISOString(),
    };

    const updated: UserProfile = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.profiles.set(userId, updated);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase
          .from('profiles')
          .update({
            ...(updates.fullName !== undefined ? { full_name: updates.fullName } : {}),
            ...(updates.avatarUrl !== undefined ? { avatar_url: updates.avatarUrl } : {}),
            ...(updates.university !== undefined ? { university: updates.university } : {}),
            ...(updates.course !== undefined ? { course: updates.course } : {}),
            ...(updates.year !== undefined ? { year: Number(updates.year) } : {}),
            ...(updates.semester !== undefined ? { semester: Number(updates.semester) } : {}),
            ...(updates.section !== undefined ? { section: updates.section } : {}),
            ...(updates.cgpa !== undefined ? { cgpa: String(updates.cgpa) } : {}),
            ...(updates.creditsCompleted !== undefined ? { credits_completed: Number(updates.creditsCompleted) } : {}),
            ...(updates.creditsCurrent !== undefined ? { credits_current: Number(updates.creditsCurrent) } : {}),
            ...(updates.universityDomain !== undefined ? { university_domain: updates.universityDomain } : {}),
            ...(updates.isOnboardingComplete !== undefined ? { is_onboarding_complete: updates.isOnboardingComplete } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } catch (err) {
        console.warn('SupabaseStore.updateProfile warning:', err);
      }
    }

    return updated;
  }

  // ==========================================
  // EXPENSES
  // ==========================================

  public async getExpenses(userId: string): Promise<Expense[]> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (data && !error) {
          const list: Expense[] = data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            amount: Number(d.amount),
            category: d.category || 'OTHER',
            merchant: d.merchant || null,
            description: d.description || 'Expense',
            date: d.date || d.created_at || new Date().toISOString(),
            type: d.type || 'EXPENSE',
          }));
          inMemoryStore.expenses.set(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('SupabaseStore.getExpenses error:', err);
      }
    }

    return inMemoryStore.expenses.get(userId) || [];
  }

  public async createExpense(userId: string, expense: Expense): Promise<Expense> {
    const validId = ensureUUID(expense.id);
    const newExpense: Expense = {
      ...expense,
      id: validId,
      userId,
      date: expense.date || new Date().toISOString(),
    };

    // Update in-memory
    const list = inMemoryStore.expenses.get(userId) || [];
    inMemoryStore.expenses.set(userId, [newExpense, ...list.filter((e) => e.id !== validId)]);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('expenses').upsert({
          id: validId,
          user_id: userId,
          amount: Number(newExpense.amount),
          category: newExpense.category,
          merchant: newExpense.merchant || null,
          description: newExpense.description || 'Expense',
          date: newExpense.date,
          type: newExpense.type || 'EXPENSE',
        });
      } catch (err) {
        console.warn('SupabaseStore.createExpense warning:', err);
      }
    }

    return newExpense;
  }

  public async deleteExpense(userId: string, expenseId: string): Promise<boolean> {
    const list = inMemoryStore.expenses.get(userId) || [];
    inMemoryStore.expenses.set(userId, list.filter((e) => e.id !== expenseId));

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('expenses').delete().eq('id', expenseId).eq('user_id', userId);
        return true;
      } catch (err) {
        console.warn('SupabaseStore.deleteExpense warning:', err);
      }
    }
    return true;
  }

  // ==========================================
  // TASKS
  // ==========================================

  public async getTasks(userId: string): Promise<Task[]> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (data && !error) {
          const list: Task[] = data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            title: d.title,
            description: d.description || null,
            priority: d.priority || 'NORMAL',
            status: d.status || 'TODO',
            dueDate: d.due_date || null,
            recurrence: d.recurrence || null,
            relatedSubject: d.related_subject || null,
            createdAt: d.created_at || new Date().toISOString(),
            completedAt: d.completed_at || null,
          }));
          inMemoryStore.tasks.set(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('SupabaseStore.getTasks error:', err);
      }
    }

    return inMemoryStore.tasks.get(userId) || [];
  }

  public async createTask(userId: string, task: Task): Promise<Task> {
    const validId = ensureUUID(task.id);
    const newTask: Task = {
      ...task,
      id: validId,
      userId,
      createdAt: task.createdAt || new Date().toISOString(),
    };

    const list = inMemoryStore.tasks.get(userId) || [];
    inMemoryStore.tasks.set(userId, [newTask, ...list.filter((t) => t.id !== validId)]);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('tasks').upsert({
          id: validId,
          user_id: userId,
          title: newTask.title,
          description: newTask.description || null,
          priority: newTask.priority || 'NORMAL',
          status: newTask.status || 'TODO',
          due_date: newTask.dueDate || null,
          recurrence: newTask.recurrence || null,
          related_subject: newTask.relatedSubject || null,
          created_at: newTask.createdAt,
          completed_at: newTask.completedAt || null,
        });
      } catch (err) {
        console.warn('SupabaseStore.createTask warning:', err);
      }
    }

    return newTask;
  }

  public async updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const list = inMemoryStore.tasks.get(userId) || [];
    const idx = list.findIndex((t) => t.id === taskId);
    let updated: Task;

    if (idx !== -1) {
      updated = { ...list[idx], ...updates };
      if (updates.status === 'COMPLETED' && !updated.completedAt) {
        updated.completedAt = new Date().toISOString();
      }
      list[idx] = updated;
      inMemoryStore.tasks.set(userId, list);
    } else {
      updated = {
        id: taskId,
        userId,
        title: updates.title || 'Task',
        priority: updates.priority || 'NORMAL',
        status: updates.status || 'TODO',
        createdAt: new Date().toISOString(),
        ...updates,
      };
      inMemoryStore.tasks.set(userId, [updated, ...list]);
    }

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase
          .from('tasks')
          .update({
            ...(updates.title !== undefined ? { title: updates.title } : {}),
            ...(updates.description !== undefined ? { description: updates.description } : {}),
            ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
            ...(updates.status !== undefined ? { status: updates.status } : {}),
            ...(updates.dueDate !== undefined ? { due_date: updates.dueDate } : {}),
            ...(updates.completedAt !== undefined || updates.status === 'COMPLETED'
              ? { completed_at: updated.completedAt || new Date().toISOString() }
              : {}),
          })
          .eq('id', taskId)
          .eq('user_id', userId);
      } catch (err) {
        console.warn('SupabaseStore.updateTask warning:', err);
      }
    }

    return updated;
  }

  public async deleteTask(userId: string, taskId: string): Promise<boolean> {
    const list = inMemoryStore.tasks.get(userId) || [];
    inMemoryStore.tasks.set(userId, list.filter((t) => t.id !== taskId));

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
        return true;
      } catch (err) {
        console.warn('SupabaseStore.deleteTask warning:', err);
      }
    }
    return true;
  }

  // ==========================================
  // CLASSES / TIMETABLE
  // ==========================================

  public async getClasses(userId: string): Promise<ClassSession[]> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('user_id', userId)
          .order('day', { ascending: true });

        if (data && !error && data.length > 0) {
          const list: ClassSession[] = data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            timetableId: d.timetable_id || undefined,
            subjectId: d.subject_id || undefined,
            subjectName: d.subject_name,
            day: d.day,
            startTime: (d.start_time || '10:00:00').slice(0, 5),
            endTime: (d.end_time || '11:00:00').slice(0, 5),
            room: d.room || undefined,
            faculty: d.faculty || undefined,
            classType: d.class_type || 'LECTURE',
            isCancelled: d.is_cancelled ?? false,
          }));
          inMemoryStore.classes.set(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('SupabaseStore.getClasses error:', err);
      }
    }

    return inMemoryStore.classes.get(userId) || [];
  }

  public async saveClasses(userId: string, classes: ClassSession[]): Promise<ClassSession[]> {
    const prepared: ClassSession[] = classes.map((c) => ({
      ...c,
      id: ensureUUID(c.id),
      userId,
    }));

    inMemoryStore.classes.set(userId, prepared);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId) && prepared.length > 0) {
      try {
        const rows = prepared.map((c) => ({
          id: c.id,
          user_id: userId,
          subject_name: c.subjectName,
          day: c.day,
          start_time: c.startTime.length === 5 ? `${c.startTime}:00` : c.startTime,
          end_time: c.endTime.length === 5 ? `${c.endTime}:00` : c.endTime,
          room: c.room || null,
          faculty: c.faculty || null,
          class_type: c.classType || 'LECTURE',
          is_cancelled: c.isCancelled ?? false,
        }));

        await supabase.from('classes').upsert(rows, { onConflict: 'id' });
      } catch (err) {
        console.warn('SupabaseStore.saveClasses warning:', err);
      }
    }

    return prepared;
  }

  // ==========================================
  // DEBTS
  // ==========================================

  public async getDebts(userId: string): Promise<Debt[]> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('debts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (data && !error) {
          const list: Debt[] = data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            person: d.person,
            type: d.type || 'OWES_ME',
            amount: Number(d.amount),
            status: d.status || 'PENDING',
            paidAmount: Number(d.paid_amount || 0),
            dueDate: d.due_date || null,
            notes: d.notes || null,
            createdAt: d.created_at || new Date().toISOString(),
          }));
          inMemoryStore.debts.set(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('SupabaseStore.getDebts error:', err);
      }
    }

    return inMemoryStore.debts.get(userId) || [];
  }

  public async createDebt(userId: string, debt: Debt): Promise<Debt> {
    const validId = ensureUUID(debt.id);
    const newDebt: Debt = {
      ...debt,
      id: validId,
      userId,
      createdAt: debt.createdAt || new Date().toISOString(),
    };

    const list = inMemoryStore.debts.get(userId) || [];
    inMemoryStore.debts.set(userId, [newDebt, ...list.filter((d) => d.id !== validId)]);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('debts').upsert({
          id: validId,
          user_id: userId,
          person: newDebt.person,
          type: newDebt.type,
          amount: Number(newDebt.amount),
          status: newDebt.status,
          paid_amount: Number(newDebt.paidAmount || 0),
          notes: newDebt.notes || null,
          created_at: newDebt.createdAt,
        });
      } catch (err) {
        console.warn('SupabaseStore.createDebt warning:', err);
      }
    }

    return newDebt;
  }

  public async updateDebt(userId: string, debtId: string, updates: Partial<Debt>): Promise<Debt | null> {
    const list = inMemoryStore.debts.get(userId) || [];
    const idx = list.findIndex((d) => d.id === debtId);
    let updated: Debt;

    if (idx !== -1) {
      updated = { ...list[idx], ...updates };
      list[idx] = updated;
      inMemoryStore.debts.set(userId, list);
    } else {
      updated = {
        id: debtId,
        userId,
        person: updates.person || 'Friend',
        type: updates.type || 'OWES_ME',
        amount: updates.amount || 0,
        status: updates.status || 'PENDING',
        paidAmount: updates.paidAmount || 0,
        createdAt: new Date().toISOString(),
        ...updates,
      };
      inMemoryStore.debts.set(userId, [updated, ...list]);
    }

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase
          .from('debts')
          .update({
            ...(updates.status !== undefined ? { status: updates.status } : {}),
            ...(updates.paidAmount !== undefined ? { paid_amount: updates.paidAmount } : {}),
            ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
          })
          .eq('id', debtId)
          .eq('user_id', userId);
      } catch (err) {
        console.warn('SupabaseStore.updateDebt warning:', err);
      }
    }

    return updated;
  }

  // ==========================================
  // AI CONVERSATIONS & CHAT HISTORY
  // ==========================================

  private activeConversationIds = new Map<string, string>();

  public async getOrCreateConversationId(userId: string): Promise<string> {
    if (this.activeConversationIds.has(userId)) {
      return this.activeConversationIds.get(userId)!;
    }

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data } = await supabase
          .from('ai_conversations')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.id) {
          this.activeConversationIds.set(userId, data.id);
          return data.id;
        }

        const newConvId = randomUUID();
        const { data: created } = await supabase
          .from('ai_conversations')
          .insert({
            id: newConvId,
            user_id: userId,
            title: 'AI Companion Chat',
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        const cid = created?.id || newConvId;
        this.activeConversationIds.set(userId, cid);
        return cid;
      } catch (err) {
        console.warn('SupabaseStore.getOrCreateConversationId warning:', err);
      }
    }

    const localId = randomUUID();
    this.activeConversationIds.set(userId, localId);
    return localId;
  }

  public async getChatHistory(userId: string): Promise<Array<{
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    actionCard?: any;
    timestamp: string;
  }>> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const convId = await this.getOrCreateConversationId(userId);
        const { data, error } = await supabase
          .from('ai_messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true });

        if (data && !error) {
          return data.map((m) => ({
            id: m.id,
            sender: m.role === 'user' ? 'user' : 'assistant',
            text: m.content || '',
            actionCard: Array.isArray(m.tool_calls) && m.tool_calls.length > 0 ? m.tool_calls[0] : (m.tool_calls || undefined),
            timestamp: m.created_at || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('SupabaseStore.getChatHistory error:', err);
      }
    }

    return [];
  }

  public async saveChatMessage(
    userId: string,
    role: 'user' | 'assistant',
    text: string,
    actionCard?: any
  ): Promise<string> {
    const messageId = randomUUID();
    const supabase = getSupabaseClient();

    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const convId = await this.getOrCreateConversationId(userId);
        await supabase.from('ai_messages').insert({
          id: messageId,
          conversation_id: convId,
          role: role === 'user' ? 'user' : 'model',
          content: text,
          tool_calls: actionCard ? [actionCard] : null,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('SupabaseStore.saveChatMessage warning:', err);
      }
    }

    return messageId;
  }

  public async clearChatHistory(userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const convId = await this.getOrCreateConversationId(userId);
        await supabase.from('ai_messages').delete().eq('conversation_id', convId);
        this.activeConversationIds.delete(userId);
        return true;
      } catch (err) {
        console.warn('SupabaseStore.clearChatHistory warning:', err);
      }
    }
    return true;
  }
}

export const supabaseStore = new SupabaseStore();
