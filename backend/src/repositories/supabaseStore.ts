import { randomUUID, createHash } from 'crypto';
import { getSupabaseClient } from './supabaseClient.js';
import { inMemoryStore, type DocumentRecord, type CustomCalendarEvent } from './inMemoryStore.js';
import type {
  UserProfile,
  ClassSession,
  Task,
  Expense,
  Debt,
  EmailSummary,
  Budget,
  NotificationItem,
  QuietHours,
  Exam,
  Assignment,
  OnboardingState,
  InitializationJob,
} from '@glitchers/shared';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureUUID(id?: string): string {
  if (id && UUID_REGEX.test(id)) {
    return id;
  }
  return randomUUID();
}

/**
 * Deterministic UUID derived from an arbitrary string (e.g. a Gmail message
 * id). Same input always yields the same id, so re-syncing the same email
 * upserts onto the existing row instead of inserting a duplicate.
 */
function deterministicUuid(input: string): string {
  const hex = createHash('sha256').update(input).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
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
            university: data.university || null,
            course: data.course || null,
            year: data.year ?? null,
            semester: data.semester ?? null,
            section: data.section || null,
            cgpa: data.cgpa ? String(data.cgpa) : null,
            creditsCompleted: data.credits_completed ?? null,
            creditsCurrent: data.credits_current ?? null,
            universityDomain: data.university_domain || '',
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
            university: data.university || null,
            course: data.course || null,
            year: data.year ?? null,
            semester: data.semester ?? null,
            section: data.section || null,
            cgpa: data.cgpa ? String(data.cgpa) : null,
            creditsCompleted: data.credits_completed ?? null,
            creditsCurrent: data.credits_current ?? null,
            universityDomain: data.university_domain || (safeEmail.includes('@') ? safeEmail.split('@')[1] : ''),
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
        // Prefer the profiles table (indexed by email) over paginated listUsers(),
        // which misses users beyond the first 50 and creates duplicates.
        let authUser: { id: string; email?: string } | undefined;
        if (existingProfile?.id && UUID_REGEX.test(existingProfile.id)) {
          const { data } = await supabase.auth.admin.getUserById(existingProfile.id);
          if (data?.user) authUser = data.user;
        }
        if (!authUser) {
          // Paginated fallback for users without a profile row yet (safety-capped).
          let page = 1;
          const perPage = 100;
          while (!authUser && page <= 10) {
            const { data: userList } = await supabase.auth.admin.listUsers({ page, perPage });
            authUser = userList?.users?.find((u) => u.email?.toLowerCase() === safeEmail);
            if (!userList?.users || userList.users.length < perPage) break;
            page++;
          }
        }

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
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('expenses').delete().eq('id', expenseId).eq('user_id', userId);
      } catch (err) {
        console.warn('SupabaseStore.deleteExpense warning:', err);
        return false;
      }
    }
    // Only remove from memory AFTER backend confirms (prevents resurrection on next sync)
    const list = inMemoryStore.expenses.get(userId) || [];
    inMemoryStore.expenses.set(userId, list.filter((e) => e.id !== expenseId));
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
    const supabase = getSupabaseClient();

    // Look up the task: in-memory cache first, then Supabase (source of truth).
    const list = inMemoryStore.tasks.get(userId) || [];
    const idx = list.findIndex((t) => t.id === taskId);

    let existing: Task | null = null;
    if (idx !== -1) {
      existing = list[idx];
    } else if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .eq('user_id', userId)
          .maybeSingle();
        if (data && !error) {
          existing = {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            description: data.description || null,
            priority: data.priority || 'NORMAL',
            status: data.status || 'TODO',
            dueDate: data.due_date || null,
            recurrence: data.recurrence || null,
            relatedSubject: data.related_subject || null,
            createdAt: data.created_at || new Date().toISOString(),
            completedAt: data.completed_at || null,
          };
        }
      } catch (err) {
        console.warn('SupabaseStore.updateTask lookup warning:', err);
      }
    }

    // Never fabricate a task on update — return null so the route can 404.
    if (!existing) {
      return null;
    }

    const updated: Task = { ...existing, ...updates };
    if (updates.status === 'COMPLETED' && !updated.completedAt) {
      updated.completedAt = new Date().toISOString();
    }

    if (idx !== -1) {
      list[idx] = updated;
      inMemoryStore.tasks.set(userId, list);
    } else {
      inMemoryStore.tasks.set(userId, [updated, ...list]);
    }

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
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
      } catch (err) {
        console.warn('SupabaseStore.deleteTask warning:', err);
        return false;
      }
    }
    // Only remove from memory AFTER backend confirms (prevents resurrection on next sync)
    const list = inMemoryStore.tasks.get(userId) || [];
    inMemoryStore.tasks.set(userId, list.filter((t) => t.id !== taskId));
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

    // Merge with existing (don't wipe local classes when syncing a partial list)
    const existing = inMemoryStore.classes.get(userId) || [];
    const byId = new Map(existing.map((c) => [c.id, c]));
    for (const c of prepared) byId.set(c.id, c);
    inMemoryStore.classes.set(userId, [...byId.values()]);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId) && prepared.length > 0) {
      try {
        // 1. Ensure active semester exists
        let semesterId: string | null = null;
        let timetableId: string | null = null;

        const { data: existingSem } = await supabase
          .from('semesters')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingSem) {
          semesterId = existingSem.id;
        } else {
          const { data: newSem } = await supabase
            .from('semesters')
            .insert({
              user_id: userId,
              name: 'Semester 3 (Academic Year 2026-27)',
              start_date: '2026-08-01',
              end_date: '2026-12-20',
              is_active: true,
            })
            .select('id')
            .maybeSingle();
          semesterId = newSem?.id || null;
        }

        // 2. Ensure active timetable exists
        const { data: existingTt } = await supabase
          .from('timetables')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingTt) {
          timetableId = existingTt.id;
        } else {
          const { data: newTt } = await supabase
            .from('timetables')
            .insert({
              user_id: userId,
              semester_id: semesterId,
              is_active: true,
            })
            .select('id')
            .maybeSingle();
          timetableId = newTt?.id || null;
        }

        // 3. Keep subjects lookup table synchronized with distinct courses
        const uniqueSubjects = new Map<string, string | undefined>();
        for (const c of prepared) {
          if (c.subjectName && !uniqueSubjects.has(c.subjectName)) {
            uniqueSubjects.set(c.subjectName, c.faculty || undefined);
          }
        }
        for (const [subName, faculty] of uniqueSubjects.entries()) {
          const { data: existingSub } = await supabase
            .from('subjects')
            .select('id')
            .eq('user_id', userId)
            .eq('name', subName)
            .maybeSingle();

          if (!existingSub) {
            await supabase.from('subjects').insert({
              user_id: userId,
              semester_id: semesterId,
              name: subName,
              short_name: subName.slice(0, 10),
              code: subName,
              faculty: faculty || null,
            });
          }
        }

        // 4. Fetch subject map
        const { data: allSubjects } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('user_id', userId);

        const subMap = new Map((allSubjects || []).map((s) => [s.name.toLowerCase().trim(), s.id]));

        // 5. Upsert classes with timetable_id and subject_id
        const rows = prepared.map((c) => ({
          id: c.id,
          user_id: userId,
          timetable_id: timetableId,
          subject_id: subMap.get(c.subjectName.toLowerCase().trim()) || null,
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

  public async deleteClass(userId: string, classId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('classes').delete().eq('id', classId).eq('user_id', userId);
      } catch (err) {
        console.warn('SupabaseStore.deleteClass warning:', err);
        return false;
      }
    }
    // Only remove from memory AFTER backend confirms (prevents resurrection on next sync)
    const classes = inMemoryStore.classes.get(userId) || [];
    inMemoryStore.classes.set(userId, classes.filter((c) => c.id !== classId));
    return true;
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
    const supabase = getSupabaseClient();

    const list = inMemoryStore.debts.get(userId) || [];
    const idx = list.findIndex((d) => d.id === debtId);

    let existing: Debt | null = null;
    if (idx !== -1) {
      existing = list[idx];
    } else if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('debts')
          .select('*')
          .eq('id', debtId)
          .eq('user_id', userId)
          .maybeSingle();
        if (data && !error) {
          existing = {
            id: data.id,
            userId: data.user_id,
            person: data.person,
            type: data.type || 'OWES_ME',
            amount: Number(data.amount),
            status: data.status || 'PENDING',
            paidAmount: Number(data.paid_amount || 0),
            dueDate: data.due_date || null,
            notes: data.notes || null,
            createdAt: data.created_at || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('SupabaseStore.updateDebt lookup warning:', err);
      }
    }

    // Never fabricate a debt on update — return null so the route can 404.
    if (!existing) {
      return null;
    }

    const updated: Debt = { ...existing, ...updates };

    if (idx !== -1) {
      list[idx] = updated;
      inMemoryStore.debts.set(userId, list);
    } else {
      inMemoryStore.debts.set(userId, [updated, ...list]);
    }

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
        const { data: created, error: insertErr } = await supabase
          .from('ai_conversations')
          .insert({
            id: newConvId,
            user_id: userId,
            title: 'NIA Chat',
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (created?.id && !insertErr) {
          this.activeConversationIds.set(userId, created.id);
          return created.id;
        }
        // Insert failed — do NOT cache the phantom id (would cause FK violations
        // on later message inserts). Fall through to a local-only id.
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

    return inMemoryStore.chatMessages.get(userId) || [];
  }

  public async saveChatMessage(
    userId: string,
    role: 'user' | 'assistant',
    text: string,
    actionCard?: any
  ): Promise<string> {
    const messageId = randomUUID();
    const timestamp = new Date().toISOString();
    const record = {
      id: messageId,
      sender: role,
      text,
      actionCard: actionCard || undefined,
      timestamp,
    };

    // Always keep an inMemory copy so messages survive Supabase failures
    const existing = inMemoryStore.chatMessages.get(userId) || [];
    inMemoryStore.chatMessages.set(userId, [...existing, record]);

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
          created_at: timestamp,
        });
      } catch (err) {
        console.warn('SupabaseStore.saveChatMessage warning:', err);
      }
    }

    return messageId;
  }

  public async clearChatHistory(userId: string): Promise<boolean> {
    inMemoryStore.chatMessages.delete(userId);
    this.activeConversationIds.delete(userId);
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const convId = await this.getOrCreateConversationId(userId);
        await supabase.from('ai_messages').delete().eq('conversation_id', convId);
        return true;
      } catch (err) {
        console.warn('SupabaseStore.clearChatHistory warning:', err);
      }
    }
    return true;
  }

  // ==========================================
  // EMAILS / UNIVERSITY NOTICES
  // ==========================================

  public async getEmails(userId: string): Promise<EmailSummary[]> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('emails')
          .select('*')
          .eq('user_id', userId)
          .order('received_at', { ascending: false });

        if (data && !error && data.length > 0) {
          const list: EmailSummary[] = data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            providerMessageId: d.provider_message_id,
            sender: d.sender,
            subject: d.subject,
            receivedAt: d.received_at,
            isUniversityRelated: d.is_university_related ?? true,
            importance: d.importance || 'NORMAL',
            summary: d.summary || d.subject,
            actionRequired: d.action_required ?? false,
            actionItem: d.action_item || undefined,
            extractedDeadline: d.extracted_deadline || undefined,
            scheduleChange: d.schedule_change || undefined,
            // M20: the DB `processed` column means dismissed only. isProcessed is
            // an app-level flag (AI pipeline handled it) and is never conflated.
            isProcessed: false,
            isDismissed: d.processed ?? false,
            dismissedAt: d.processed ? d.created_at : undefined,
          }));
          inMemoryStore.emails.set(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('SupabaseStore.getEmails error:', err);
      }
    }

    return inMemoryStore.emails.get(userId) || [];
  }

  public async saveEmails(userId: string, emails: EmailSummary[]): Promise<void> {
    const prepared: EmailSummary[] = emails.map((e) => ({
      ...e,
      // Gmail message ids are stable but not UUIDs: derive a deterministic id
      // from the provider message id so re-syncs upsert onto the same row
      // (onConflict: 'id') instead of inserting duplicates.
      id: e.providerMessageId
        ? deterministicUuid(`gmail:${e.providerMessageId}`)
        : ensureUUID(e.id),
      userId,
    }));

    inMemoryStore.emails.set(userId, prepared);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId) && prepared.length > 0) {
      try {
        const rows = prepared.map((e) => ({
          id: e.id,
          user_id: userId,
          provider_message_id: e.providerMessageId || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sender: e.sender,
          subject: e.subject,
          received_at: e.receivedAt || new Date().toISOString(),
          is_university_related: e.isUniversityRelated ?? true,
          importance: e.importance || 'NORMAL',
          summary: e.summary || e.subject,
          action_required: e.actionRequired ?? false,
          action_item: e.actionItem || null,
          extracted_deadline: e.extractedDeadline || null,
          schedule_change: e.scheduleChange || null,
          // M20: persist dismissal only — never conflate isProcessed into this bit
          processed: e.isDismissed ?? false,
        }));

        await supabase.from('emails').upsert(rows, { onConflict: 'id' });
      } catch (err) {
        console.warn('SupabaseStore.saveEmails warning:', err);
      }
    }
  }

  public async dismissEmail(userId: string, emailId: string, dismissed: boolean = true): Promise<boolean> {
    const list = inMemoryStore.emails.get(userId) || [];
    const updatedList = list.map((e) => (e.id === emailId ? { ...e, isDismissed: dismissed, isProcessed: dismissed } : e));
    inMemoryStore.emails.set(userId, updatedList);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase
          .from('emails')
          .update({ processed: dismissed })
          .eq('id', emailId)
          .eq('user_id', userId);
      } catch (err) {
        console.warn('SupabaseStore.dismissEmail warning:', err);
      }
    }
    return true;
  }

  // ==========================================
  // BUDGETS
  // ==========================================

  public async getBudget(userId: string): Promise<Budget | null> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          const budget: Budget = {
            id: data.id,
            userId: data.user_id,
            monthlyLimit: Number(data.monthly_limit),
            currentSpending: 0,
            month: data.month,
            categoryLimits: data.category_limits || {},
            alertThresholds: data.alert_thresholds || [75, 90, 100],
          };
          inMemoryStore.budgets.set(userId, budget);
          return budget;
        }
      } catch (err) {
        console.warn('SupabaseStore.getBudget error:', err);
      }
    }

    return inMemoryStore.budgets.get(userId) || null;
  }

  public async saveBudget(userId: string, budget: Budget): Promise<Budget> {
    const validId = ensureUUID(budget.id);
    const prepared: Budget = { ...budget, id: validId, userId };
    inMemoryStore.budgets.set(userId, prepared);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('budgets').upsert({
          id: validId,
          user_id: userId,
          monthly_limit: Number(prepared.monthlyLimit),
          month: prepared.month,
          category_limits: prepared.categoryLimits || {},
          alert_thresholds: prepared.alertThresholds || [75, 90, 100],
        }, { onConflict: 'user_id,month' });
      } catch (err) {
        console.warn('SupabaseStore.saveBudget warning:', err);
      }
    }

    return prepared;
  }

  // M1 (mobile): clear the user's budget from both stores.
  public async clearBudget(userId: string): Promise<void> {
    inMemoryStore.budgets.delete(userId);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('budgets').delete().eq('user_id', userId);
      } catch (err) {
        console.warn('SupabaseStore.clearBudget warning:', err);
      }
    }
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  public async getNotifications(userId: string): Promise<NotificationItem[]> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('scheduled_for', { ascending: false });

        if (data && !error) {
          const list: NotificationItem[] = data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            title: d.title,
            message: d.message,
            type: d.type,
            priority: d.priority || 'NORMAL',
            read: d.read ?? false,
            scheduledFor: d.scheduled_for,
            sentAt: d.sent_at || null,
            sourceId: d.source_id || undefined,
          }));
          inMemoryStore.notifications.set(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('SupabaseStore.getNotifications error:', err);
      }
    }

    return inMemoryStore.notifications.get(userId) || [];
  }

  public async createNotification(userId: string, notification: Partial<NotificationItem>): Promise<NotificationItem> {
    const validId = ensureUUID(notification.id);
    const item: NotificationItem = {
      id: validId,
      userId,
      title: notification.title || 'Notification',
      message: notification.message || '',
      type: notification.type || 'SYSTEM_ALERT',
      priority: notification.priority || 'NORMAL',
      read: notification.read ?? false,
      scheduledFor: notification.scheduledFor || new Date().toISOString(),
      sentAt: notification.sentAt || new Date().toISOString(),
      sourceId: notification.sourceId,
    };

    const list = inMemoryStore.notifications.get(userId) || [];
    inMemoryStore.notifications.set(userId, [item, ...list]);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('notifications').upsert({
          id: validId,
          user_id: userId,
          title: item.title,
          message: item.message,
          type: item.type,
          priority: item.priority,
          read: item.read,
          scheduled_for: item.scheduledFor,
          sent_at: item.sentAt,
          source_id: item.sourceId || null,
        });
      } catch (err) {
        console.warn('SupabaseStore.createNotification warning:', err);
      }
    }

    return item;
  }

  public async markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
    const list = inMemoryStore.notifications.get(userId) || [];
    const item = list.find((n) => n.id === notificationId);
    if (item) item.read = true;

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId)
          .eq('user_id', userId);
        return true;
      } catch (err) {
        console.warn('SupabaseStore.markNotificationAsRead warning:', err);
      }
    }

    return true;
  }

  // ==========================================
  // USER PREFERENCES & SETTINGS
  // ==========================================

  public async getUserPreferences(userId: string): Promise<{
    quietHours: QuietHours;
    universityDomain: string;
    floatingAssistantEnabled: boolean;
    aiProcessingEnabled: boolean;
  }> {
    const fallback = {
      quietHours: { enabled: true, startTime: '23:00', endTime: '07:00', criticalBypass: true },
      universityDomain: 'university.edu',
      floatingAssistantEnabled: true,
      aiProcessingEnabled: true,
    };

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (data && !error) {
          const res = {
            quietHours: {
              enabled: data.quiet_hours_enabled ?? true,
              startTime: (data.quiet_hours_start || '23:00:00').slice(0, 5),
              endTime: (data.quiet_hours_end || '07:00:00').slice(0, 5),
              criticalBypass: data.critical_bypass ?? true,
            },
            universityDomain: data.university_domain || 'university.edu',
            floatingAssistantEnabled: data.floating_assistant_enabled ?? true,
            aiProcessingEnabled: data.ai_processing_enabled ?? true,
          };
          inMemoryStore.preferences.set(userId, {
            quietHours: res.quietHours,
            universityDomain: res.universityDomain,
          });
          return res;
        }
      } catch (err) {
        console.warn('SupabaseStore.getUserPreferences error:', err);
      }
    }

    const inMem = inMemoryStore.preferences.get(userId);
    return {
      quietHours: inMem?.quietHours || fallback.quietHours,
      universityDomain: inMem?.universityDomain || fallback.universityDomain,
      floatingAssistantEnabled: true,
      aiProcessingEnabled: true,
    };
  }

  public async saveUserPreferences(userId: string, prefs: {
    quietHours?: Partial<QuietHours>;
    universityDomain?: string;
    floatingAssistantEnabled?: boolean;
    aiProcessingEnabled?: boolean;
  }): Promise<void> {
    const current = await this.getUserPreferences(userId);
    const updated = {
      quietHours: { ...current.quietHours, ...(prefs.quietHours || {}) },
      universityDomain: prefs.universityDomain || current.universityDomain,
      floatingAssistantEnabled: prefs.floatingAssistantEnabled ?? current.floatingAssistantEnabled,
      aiProcessingEnabled: prefs.aiProcessingEnabled ?? current.aiProcessingEnabled,
    };

    inMemoryStore.preferences.set(userId, {
      quietHours: updated.quietHours,
      universityDomain: updated.universityDomain,
    });

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('user_preferences').upsert({
          user_id: userId,
          quiet_hours_enabled: updated.quietHours.enabled,
          quiet_hours_start: `${updated.quietHours.startTime}:00`,
          quiet_hours_end: `${updated.quietHours.endTime}:00`,
          critical_bypass: updated.quietHours.criticalBypass,
          floating_assistant_enabled: updated.floatingAssistantEnabled,
          ai_processing_enabled: updated.aiProcessingEnabled,
          university_domain: updated.universityDomain,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.warn('SupabaseStore.saveUserPreferences warning:', err);
      }
    }
  }

  // ==========================================
  // EXAMS
  // ==========================================

  public async getExams(userId: string): Promise<Exam[]> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('exams')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: true });

        if (data && !error && data.length > 0) {
          const list: Exam[] = data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            subject: d.subject,
            date: d.date,
            time: (d.time || '10:00:00').slice(0, 5),
            room: d.room || undefined,
            syllabus: d.syllabus || undefined,
            importance: d.importance || 'CRITICAL',
          }));
          inMemoryStore.exams.set(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('SupabaseStore.getExams error:', err);
      }
    }

    return inMemoryStore.exams.get(userId) || [];
  }

  public async createExam(userId: string, exam: Partial<Exam>): Promise<Exam> {
    const validId = ensureUUID(exam.id);
    const newExam: Exam = {
      id: validId,
      userId,
      subject: exam.subject || 'Subject Exam',
      date: exam.date || new Date().toISOString().slice(0, 10),
      time: (exam.time || '10:00').slice(0, 5),
      room: exam.room || null,
      syllabus: exam.syllabus || null,
      importance: exam.importance || 'CRITICAL',
    };

    const list = inMemoryStore.exams.get(userId) || [];
    inMemoryStore.exams.set(userId, [...list, newExam]);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('exams').upsert({
          id: validId,
          user_id: userId,
          subject: newExam.subject,
          date: newExam.date,
          time: newExam.time.length === 5 ? `${newExam.time}:00` : newExam.time,
          room: newExam.room || null,
          syllabus: newExam.syllabus || null,
          importance: newExam.importance,
        });
      } catch (err) {
        console.warn('SupabaseStore.createExam warning:', err);
      }
    }

    return newExam;
  }

  public async deleteExam(userId: string, examId: string): Promise<boolean> {
    const list = inMemoryStore.exams.get(userId) || [];
    const existed = list.some((e) => e.id === examId);
    inMemoryStore.exams.set(userId, list.filter((e) => e.id !== examId));

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { error, count } = await supabase.from('exams').delete({ count: 'exact' }).eq('id', examId).eq('user_id', userId);
        if (error) throw error;
        return (count ?? 0) > 0 || existed;
      } catch (err) {
        console.warn('SupabaseStore.deleteExam warning:', err);
        return false;
      }
    }

    return existed;
  }

  // ==========================================
  // GOOGLE ACCOUNTS & ONBOARDING STATE
  // ==========================================

  public async saveGoogleAccount(userId: string, data: {
    googleId: string;
    email: string;
    accessToken?: string;
    refreshToken?: string;
    scopes?: string[];
  }): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('google_accounts').upsert({
          user_id: userId,
          google_id: data.googleId,
          email: data.email,
          ...(data.accessToken ? { access_token: data.accessToken } : {}),
          ...(data.refreshToken ? { refresh_token: data.refreshToken } : {}),
          scopes: data.scopes || ['userinfo.email', 'userinfo.profile', 'openid'],
          gmail_connected: true,
          calendar_connected: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.warn('SupabaseStore.saveGoogleAccount warning:', err);
      }
    }
  }

  public async saveOnboardingState(userId: string, state: OnboardingState): Promise<void> {
    inMemoryStore.onboardingStates.set(userId, state);
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('onboarding_state').upsert({
          user_id: userId,
          current_step: state.currentStep,
          completed_steps: state.completedSteps,
          is_complete: state.isComplete,
          data: state.data || {},
          started_at: state.startedAt || new Date().toISOString(),
          completed_at: state.completedAt || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.warn('SupabaseStore.saveOnboardingState warning:', err);
      }
    }
  }

  public async getOnboardingState(userId: string): Promise<OnboardingState | null> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('onboarding_state')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (data && !error) {
          const state: OnboardingState = {
            userId: data.user_id,
            currentStep: data.current_step,
            completedSteps: data.completed_steps || [],
            isComplete: data.is_complete ?? false,
            data: data.data || {},
            startedAt: data.started_at,
            completedAt: data.completed_at || undefined,
            updatedAt: data.updated_at,
          };
          inMemoryStore.onboardingStates.set(userId, state);
          return state;
        }
      } catch (err) {
        console.warn('SupabaseStore.getOnboardingState error:', err);
      }
    }

    return inMemoryStore.onboardingStates.get(userId) || null;
  }

  public async saveInitializationJob(job: InitializationJob): Promise<void> {
    inMemoryStore.initializationJobs.set(job.id, job);
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(job.userId)) {
      try {
        await supabase.from('initialization_jobs').upsert({
          id: ensureUUID(job.id),
          user_id: job.userId,
          status: job.status,
          step_statuses: job.stepStatuses || {},
          started_at: job.startedAt || new Date().toISOString(),
          completed_at: job.completedAt || null,
          error_message: job.errorMessage || null,
          retry_count: job.retryCount || 0,
        });
      } catch (err) {
        console.warn('SupabaseStore.saveInitializationJob warning:', err);
      }
    }
  }

  public async getInitializationJob(jobId: string): Promise<InitializationJob | null> {
    const inMem = inMemoryStore.initializationJobs.get(jobId);
    if (inMem) return inMem;

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(jobId)) {
      try {
        const { data, error } = await supabase
          .from('initialization_jobs')
          .select('*')
          .eq('id', jobId)
          .maybeSingle();

        if (data && !error) {
          const job: InitializationJob = {
            id: data.id,
            userId: data.user_id,
            status: data.status,
            stepStatuses: data.step_statuses || {},
            startedAt: data.started_at,
            completedAt: data.completed_at || undefined,
            errorMessage: data.error_message || undefined,
            retryCount: data.retry_count || 0,
          };
          inMemoryStore.initializationJobs.set(jobId, job);
          return job;
        }
      } catch (err) {
        console.warn('SupabaseStore.getInitializationJob error:', err);
      }
    }

    return null;
  }

  // ==========================================
  // ATTENDANCE
  // ==========================================

  public async getAttendance(userId: string): Promise<Record<string, { attended: number; total: number }>> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userId);

        if (data && !error) {
          const map: Record<string, { attended: number; total: number }> = {};
          for (const d of data) {
            map[d.subject_name] = { attended: d.attended ?? 0, total: d.total ?? 0 };
          }
          inMemoryStore.attendance.set(userId, map);
          return map;
        }
      } catch (err) {
        console.warn('SupabaseStore.getAttendance error:', err);
      }
    }

    return inMemoryStore.attendance.get(userId) || {};
  }

  public async markAttendance(
    userId: string,
    subjectName: string,
    present: boolean
  ): Promise<{ attended: number; total: number }> {
    const current = await this.getAttendance(userId);
    const prev = current[subjectName] || { attended: 0, total: 0 };
    const next = { attended: prev.attended + (present ? 1 : 0), total: prev.total + 1 };
    inMemoryStore.attendance.set(userId, { ...current, [subjectName]: next });

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('attendance').upsert(
          {
            user_id: userId,
            subject_name: subjectName,
            attended: next.attended,
            total: next.total,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,subject_name' }
        );
      } catch (err) {
        console.warn('SupabaseStore.markAttendance warning:', err);
      }
    }
    return next;
  }

  public async resetAttendance(userId: string, subjectName: string): Promise<void> {
    const current = await this.getAttendance(userId);
    delete current[subjectName];
    inMemoryStore.attendance.set(userId, { ...current });

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('attendance').delete().eq('user_id', userId).eq('subject_name', subjectName);
      } catch (err) {
        console.warn('SupabaseStore.resetAttendance warning:', err);
      }
    }
  }

  // ==========================================
  // PUSH NOTIFICATIONS
  // ==========================================

  public async savePushToken(userId: string, token: string): Promise<void> {
    const existing = inMemoryStore.pushTokens.get(userId) || [];
    if (!existing.includes(token)) {
      inMemoryStore.pushTokens.set(userId, [...existing, token]);
    }

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('push_tokens').upsert(
          {
            user_id: userId,
            token,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,token' }
        );
      } catch (err) {
        console.warn('SupabaseStore.savePushToken warning:', err);
      }
    }
  }

  public async getAllPushTokens(): Promise<string[]> {
    const tokens = new Set<string>();
    for (const list of inMemoryStore.pushTokens.values()) {
      for (const t of list) tokens.add(t);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('push_tokens').select('token');
        if (data && !error) {
          for (const d of data) {
            if (d.token) tokens.add(d.token);
          }
        }
      } catch (err) {
        console.warn('SupabaseStore.getAllPushTokens error:', err);
      }
    }
    return [...tokens];
  }

  public async broadcastPush(title: string, body: string): Promise<{ sent: number; total: number }> {
    const tokens = await this.getAllPushTokens();
    if (tokens.length === 0) return { sent: 0, total: 0 };

    // Expo Push API accepts up to 100 messages per request
    let sent = 0;
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100).map((token) => ({
        to: token,
        sound: 'default' as const,
        title,
        body,
      }));
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
        });
        if (res.ok) sent += chunk.length;
      } catch (err) {
        console.warn('SupabaseStore.broadcastPush warning:', err);
      }
    }
    return { sent, total: tokens.length };
  }

  // ==========================================
  // ASSIGNMENTS
  // ==========================================

  public async getAssignments(userId: string): Promise<Assignment[]> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .eq('user_id', userId)
          .order('deadline', { ascending: true });

        if (data && !error) {
          const list: Assignment[] = data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            title: d.title,
            subject: d.subject,
            deadline: d.deadline,
            description: d.description || null,
            submissionPlatform: d.submission_platform || 'University Portal',
            priority: d.priority || 'HIGH',
            status: d.status || 'PENDING',
            relatedEmailId: d.related_email_id || null,
          }));
          inMemoryStore.assignments.set(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('SupabaseStore.getAssignments error:', err);
      }
    }

    return inMemoryStore.assignments.get(userId) || [];
  }

  public async saveAssignment(userId: string, assignment: Assignment): Promise<Assignment> {
    const validId = ensureUUID(assignment.id);
    const newAssignment: Assignment = { ...assignment, id: validId, userId };

    const list = inMemoryStore.assignments.get(userId) || [];
    inMemoryStore.assignments.set(userId, [...list.filter((a) => a.id !== validId), newAssignment]);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('assignments').upsert({
          id: validId,
          user_id: userId,
          title: newAssignment.title,
          subject: newAssignment.subject,
          deadline: newAssignment.deadline,
          description: newAssignment.description || null,
          submission_platform: newAssignment.submissionPlatform || 'University Portal',
          priority: newAssignment.priority || 'HIGH',
          status: newAssignment.status || 'PENDING',
          related_email_id: newAssignment.relatedEmailId || null,
        });
      } catch (err) {
        console.warn('SupabaseStore.saveAssignment warning:', err);
      }
    }

    return newAssignment;
  }

  public async updateAssignmentStatus(
    userId: string,
    assignmentId: string,
    status: Assignment['status']
  ): Promise<Assignment | null> {
    const list = inMemoryStore.assignments.get(userId) || [];
    const idx = list.findIndex((a) => a.id === assignmentId);

    let existing: Assignment | null = idx !== -1 ? list[idx] : null;
    if (!existing) {
      const supabase = getSupabaseClient();
      if (supabase && UUID_REGEX.test(userId)) {
        try {
          const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .eq('id', assignmentId)
            .eq('user_id', userId)
            .maybeSingle();
          if (data && !error) {
            existing = {
              id: data.id,
              userId: data.user_id,
              title: data.title,
              subject: data.subject,
              deadline: data.deadline,
              description: data.description || null,
              submissionPlatform: data.submission_platform || 'University Portal',
              priority: data.priority || 'HIGH',
              status: data.status || 'PENDING',
              relatedEmailId: data.related_email_id || null,
            };
          }
        } catch (err) {
          console.warn('SupabaseStore.updateAssignmentStatus lookup warning:', err);
        }
      }
    }

    // Never fabricate an assignment on update — return null so the route can 404.
    if (!existing) {
      return null;
    }

    const updated: Assignment = { ...existing, status };
    if (idx !== -1) {
      list[idx] = updated;
      inMemoryStore.assignments.set(userId, list);
    } else {
      inMemoryStore.assignments.set(userId, [...list, updated]);
    }

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase
          .from('assignments')
          .update({ status })
          .eq('id', assignmentId)
          .eq('user_id', userId);
      } catch (err) {
        console.warn('SupabaseStore.updateAssignmentStatus warning:', err);
      }
    }

    return updated;
  }

  public async deleteAssignment(userId: string, assignmentId: string): Promise<boolean> {
    const list = inMemoryStore.assignments.get(userId) || [];
    inMemoryStore.assignments.set(userId, list.filter((a) => a.id !== assignmentId));

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('assignments').delete().eq('id', assignmentId).eq('user_id', userId);
        return true;
      } catch (err) {
        console.warn('SupabaseStore.deleteAssignment warning:', err);
      }
    }
    return true;
  }

  // ==========================================
  // DOCUMENTS
  // ==========================================

  public async getDocuments(userId: string): Promise<DocumentRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (data && !error) {
          const list: DocumentRecord[] = data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            title: d.title,
            type: d.type || 'PDF',
            fileUrl: d.file_url || undefined,
            content: d.content || null,
            extractedDeadline: d.extracted_deadline || null,
            extractedNotes: d.extracted_notes || null,
            actionItem: d.action_item || undefined,
            processed: d.processed ?? false,
            createdAt: d.created_at || new Date().toISOString(),
          }));
          inMemoryStore.documents.set(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('SupabaseStore.getDocuments error:', err);
      }
    }

    return inMemoryStore.documents.get(userId) || [];
  }

  public async saveDocument(userId: string, doc: DocumentRecord): Promise<DocumentRecord> {
    const validId = ensureUUID(doc.id);
    const newDoc: DocumentRecord = { ...doc, id: validId, userId };

    // Newest first, matching the route's previous unshift behavior.
    const list = inMemoryStore.documents.get(userId) || [];
    inMemoryStore.documents.set(userId, [newDoc, ...list.filter((d) => d.id !== validId)]);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('documents').upsert({
          id: validId,
          user_id: userId,
          title: newDoc.title,
          type: newDoc.type,
          file_url: newDoc.fileUrl || null,
          content: newDoc.content || null,
          extracted_deadline: newDoc.extractedDeadline || null,
          extracted_notes: newDoc.extractedNotes || null,
          action_item: newDoc.actionItem || null,
          processed: newDoc.processed ?? false,
          created_at: newDoc.createdAt,
        });
      } catch (err) {
        console.warn('SupabaseStore.saveDocument warning:', err);
      }
    }

    return newDoc;
  }

  public async deleteDocument(userId: string, documentId: string): Promise<boolean> {
    const list = inMemoryStore.documents.get(userId) || [];
    inMemoryStore.documents.set(userId, list.filter((d) => d.id !== documentId));

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('documents').delete().eq('id', documentId).eq('user_id', userId);
        return true;
      } catch (err) {
        console.warn('SupabaseStore.deleteDocument warning:', err);
      }
    }
    return true;
  }

  // ==========================================
  // CALENDAR EVENTS
  // ==========================================

  public async getCalendarEvents(userId: string): Promise<CustomCalendarEvent[]> {
    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId)
          .order('start_time', { ascending: true });

        if (data && !error) {
          const list: CustomCalendarEvent[] = data.map((d) => ({
            id: d.id,
            title: d.title,
            startTime: d.start_time,
            endTime: d.end_time,
            location: d.location || null,
            source: 'MANUAL',
          }));
          inMemoryStore.calendarEvents.set(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('SupabaseStore.getCalendarEvents error:', err);
      }
    }

    return inMemoryStore.calendarEvents.get(userId) || [];
  }

  public async saveCalendarEvent(userId: string, event: CustomCalendarEvent): Promise<CustomCalendarEvent> {
    const validId = ensureUUID(event.id);
    const newEvent: CustomCalendarEvent = { ...event, id: validId };

    const list = inMemoryStore.calendarEvents.get(userId) || [];
    inMemoryStore.calendarEvents.set(userId, [...list.filter((e) => e.id !== validId), newEvent]);

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('calendar_events').upsert({
          id: validId,
          user_id: userId,
          title: newEvent.title,
          start_time: newEvent.startTime,
          end_time: newEvent.endTime,
          location: newEvent.location || null,
        });
      } catch (err) {
        console.warn('SupabaseStore.saveCalendarEvent warning:', err);
      }
    }

    return newEvent;
  }

  public async deleteCalendarEvent(userId: string, eventId: string): Promise<boolean> {
    const list = inMemoryStore.calendarEvents.get(userId) || [];
    inMemoryStore.calendarEvents.set(userId, list.filter((e) => e.id !== eventId));

    const supabase = getSupabaseClient();
    if (supabase && UUID_REGEX.test(userId)) {
      try {
        await supabase.from('calendar_events').delete().eq('id', eventId).eq('user_id', userId);
        return true;
      } catch (err) {
        console.warn('SupabaseStore.deleteCalendarEvent warning:', err);
      }
    }
    return true;
  }
}

export const supabaseStore = new SupabaseStore();
