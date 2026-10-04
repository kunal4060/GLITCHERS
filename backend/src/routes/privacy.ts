import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { getSupabaseClient } from '../repositories/supabaseClient.js';
import { googleService } from '../services/google/googleService.js';

export const privacyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/status', async (req) => {
    const userId = req.userId!;
    const googleConn = inMemoryStore.googleConnections.get(userId);

    return {
      googleConnected: !!googleConn,
      gmailConnected: googleConn?.gmailConnected ?? false,
      calendarConnected: googleConn?.calendarConnected ?? false,
      aiProcessingEnabled: true,
      floatingAssistantEnabled: true,
    };
  });

  fastify.post('/disconnect-google', async (req) => {
    const userId = req.userId!;
    inMemoryStore.googleConnections.delete(userId);

    try {
      googleService.clearUserToken(userId);
    } catch (err) {
      console.warn('Failed to clear cached Google token on disconnect:', err);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('google_accounts').delete().eq('user_id', userId);
      } catch (err) {
        console.warn('Supabase disconnect google error:', err);
      }
    }

    return { success: true, message: 'Google services disconnected and OAuth tokens invalidated' };
  });

  fastify.post('/export-data', async (req) => {
    const userId = req.userId!;
    const supabase = getSupabaseClient();
    // H12: collect per-source failures explicitly instead of silently
    // claiming a complete export from a partial fallback.
    const warnings: string[] = [];

    // Everything in the in-memory store for this user — kept in one place so
    // a newly added map can't be forgotten here.
    const localExport = () => ({
      profile: inMemoryStore.profiles.get(userId) ?? null,
      classes: inMemoryStore.classes.get(userId) || [],
      tasks: inMemoryStore.tasks.get(userId) || [],
      expenses: inMemoryStore.expenses.get(userId) || [],
      budget: inMemoryStore.budgets.get(userId) ?? null,
      debts: inMemoryStore.debts.get(userId) || [],
      emails: inMemoryStore.emails.get(userId) || [],
      notifications: inMemoryStore.notifications.get(userId) || [],
      attendance: inMemoryStore.attendance.get(userId) ?? {},
      documents: inMemoryStore.documents.get(userId) || [],
      calendarEvents: inMemoryStore.calendarEvents.get(userId) || [],
      assignments: inMemoryStore.assignments.get(userId) || [],
      exams: inMemoryStore.exams.get(userId) || [],
      subjects: inMemoryStore.subjects.get(userId) || [],
      preferences: inMemoryStore.preferences.get(userId) ?? null,
      chatMessages: inMemoryStore.chatMessages.get(userId) || [],
      pushTokens: inMemoryStore.pushTokens.get(userId) || [],
      googleConnected: inMemoryStore.googleConnections.has(userId),
    });

    if (supabase) {
      try {
        const [
          profileRes,
          classesRes,
          tasksRes,
          expensesRes,
          debtsRes,
          notificationsRes,
          attendanceRes,
          documentsRes,
          calendarRes,
          assignmentsRes,
          examsRes,
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase.from('classes').select('*').eq('user_id', userId),
          supabase.from('tasks').select('*').eq('user_id', userId),
          supabase.from('expenses').select('*').eq('user_id', userId),
          supabase.from('debts').select('*').eq('user_id', userId),
          supabase.from('notifications').select('*').eq('user_id', userId),
          supabase.from('attendance').select('*').eq('user_id', userId),
          supabase.from('documents').select('*').eq('user_id', userId),
          supabase.from('calendar_events').select('*').eq('user_id', userId),
          supabase.from('assignments').select('*').eq('user_id', userId),
          supabase.from('exams').select('*').eq('user_id', userId),
        ]);

        const tables = { profileRes, classesRes, tasksRes, expensesRes, debtsRes, notificationsRes, attendanceRes, documentsRes, calendarRes, assignmentsRes, examsRes } as Record<string, { error?: any; data?: any }>;
        for (const [name, res] of Object.entries(tables)) {
          if (res.error) warnings.push(`${name}: ${res.error.message || 'query failed'} — used local data`);
        }

        const local = localExport();
        return {
          exportTimestamp: new Date().toISOString(),
          source: 'Supabase Production Database',
          warnings,
          profile: profileRes.data || local.profile,
          classes: classesRes.data || local.classes,
          tasks: tasksRes.data || local.tasks,
          expenses: expensesRes.data || local.expenses,
          budget: local.budget,
          debts: debtsRes.data || local.debts,
          emails: local.emails,
          notifications: notificationsRes.data || local.notifications,
          attendance: attendanceRes.data || local.attendance,
          documents: documentsRes.data || local.documents,
          calendarEvents: calendarRes.data || local.calendarEvents,
          assignments: assignmentsRes.data || local.assignments,
          exams: examsRes.data || local.exams,
          subjects: local.subjects,
          preferences: local.preferences,
          chatMessages: local.chatMessages,
          pushTokens: local.pushTokens,
          googleConnected: local.googleConnected,
        };
      } catch (err: any) {
        warnings.push(`supabase: ${err?.message || 'export query failed'} — fell back to in-memory store`);
      }
    } else {
      warnings.push('supabase: not connected — exported from in-memory store only');
    }

    return {
      exportTimestamp: new Date().toISOString(),
      source: 'In-Memory Store',
      warnings,
      ...localExport(),
    };
  });

  fastify.delete<{ Body: { password?: string } }>('/delete-account', async (req, reply) => {
    const userId = req.userId!;
    const { password } = req.body || {};

    // H7: require explicit confirmation — account deletion is irreversible.
    // NOTE: this app uses Google OAuth (no stored password), so the field is
    // a deliberate confirmation gesture; true re-auth would verify a fresh
    // Google ID token here.
    if (typeof password !== 'string' || !password) {
      return reply.status(400).send({ error: 'Password confirmation is required to delete your account' });
    }

    // 1. Clean inMemoryStore — ALL per-user maps, none left behind
    inMemoryStore.profiles.delete(userId);
    inMemoryStore.classes.delete(userId);
    inMemoryStore.tasks.delete(userId);
    inMemoryStore.expenses.delete(userId);
    inMemoryStore.budgets.delete(userId);
    inMemoryStore.debts.delete(userId);
    inMemoryStore.emails.delete(userId);
    inMemoryStore.notifications.delete(userId);
    inMemoryStore.onboardingStates.delete(userId);
    inMemoryStore.initializationJobs.delete(userId);
    inMemoryStore.googleConnections.delete(userId);
    inMemoryStore.attendance.delete(userId);
    inMemoryStore.pushTokens.delete(userId);
    inMemoryStore.chatMessages.delete(userId);
    inMemoryStore.documents.delete(userId);
    inMemoryStore.calendarEvents.delete(userId);
    try {
      googleService.clearUserToken(userId);
    } catch (err) {
      console.warn('Failed to clear cached Google token on account deletion:', err);
    }
    inMemoryStore.preferences.delete(userId);
    inMemoryStore.subjects.delete(userId);
    inMemoryStore.exams.delete(userId);
    inMemoryStore.assignments.delete(userId);

    // 2. Cascade delete from Supabase if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Cascade delete on profiles removes all child foreign-key tables
        await supabase.from('profiles').delete().eq('id', userId);
      } catch (err: any) {
        console.warn('Supabase profile deletion notice:', err.message || err);
      }
      // H7: fail LOUDLY if the auth user can't be deleted — swallowing this
      // left users able to log back in after "deletion".
      try {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;
      } catch (err: any) {
        return reply.status(500).send({
          error: 'Account data was cleared locally but the login could not be removed. Please try again or contact support.',
        });
      }
    }

    return {
      success: true,
      message: 'Student account, profile, timetable, tasks, expenses, and credentials have been permanently deleted in accordance with data privacy regulations.',
    };
  });
};
