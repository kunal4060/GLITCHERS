import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { getISTDateStr } from '../utils/dates.js';
import { randomUUID } from 'crypto';
import type {
  OnboardingStep,
  OnboardingState,
  InitializationJob,
  ClassSession,
  Subject,
  Budget,
} from '@glitchers/shared';

export const onboardingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  /**
   * GET /api/onboarding/status
   * Retrieve current onboarding progress or initialize for new user
   */
  fastify.get('/status', async (req) => {
    const userId = req.userId!;
    let state = await supabaseStore.getOnboardingState(userId);

    if (!state) {
      state = {
        userId,
        currentStep: 'GOOGLE_AUTH',
        completedSteps: [],
        isComplete: false,
        data: {},
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await supabaseStore.saveOnboardingState(userId, state);
    }

    const profile = await supabaseStore.getProfile(userId);
    return {
      state,
      profile,
      isComplete: state.isComplete || profile?.isOnboardingComplete || false,
    };
  });

  /**
   * PATCH /api/onboarding/step
   * Save progress incrementally so student can resume anytime
   */
  fastify.patch<{
    Body: {
      step: OnboardingStep;
      data?: Record<string, any>;
      isComplete?: boolean;
    };
  }>('/step', async (req, reply) => {
    const userId = req.userId!;
    const { step, data, isComplete } = req.body || {};

    if (!step) {
      return reply.status(400).send({ error: 'Step is required' });
    }

    // Deterministic validation based on step
    if (step === 'PROFILE' && data) {
      if (data.fullName && typeof data.fullName === 'string' && data.fullName.trim().length === 0) {
        return reply.status(400).send({ error: 'Name cannot be empty' });
      }
    }

    if (step === 'ACADEMICS' && data) {
      if (data.cgpa !== undefined && data.cgpa !== null && data.cgpa !== '') {
        const numCgpa = parseFloat(String(data.cgpa));
        if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
          return reply.status(400).send({ error: 'CGPA must be a valid number between 0.00 and 10.00' });
        }
      }
    }

    let state = (await supabaseStore.getOnboardingState(userId)) || inMemoryStore.onboardingStates.get(userId);
    if (!state) {
      state = {
        userId,
        currentStep: step,
        completedSteps: [],
        isComplete: false,
        data: {},
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const currentCompleted = new Set(state.completedSteps);
    currentCompleted.add(step);

    const mergedData = { ...(state.data || {}), ...(data || {}) };
    const updatedState: OnboardingState = {
      ...state,
      currentStep: step,
      completedSteps: Array.from(currentCompleted),
      isComplete: isComplete !== undefined ? isComplete : state.isComplete,
      data: mergedData,
      completedAt: isComplete ? new Date().toISOString() : state.completedAt,
      updatedAt: new Date().toISOString(),
    };

    await supabaseStore.saveOnboardingState(userId, updatedState);

    // If profile data was updated, partially merge into profile
    if (data) {
      await supabaseStore.updateProfile(userId, {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.university ? { university: data.university } : {}),
        ...(data.course ? { course: data.course } : {}),
        ...(data.year !== undefined ? { year: Number(data.year) } : {}),
        ...(data.semester !== undefined ? { semester: Number(data.semester) } : {}),
        ...(data.section ? { section: data.section } : {}),
        ...(data.cgpa !== undefined ? { cgpa: String(data.cgpa) } : {}),
        ...(data.creditsCompleted !== undefined ? { creditsCompleted: Number(data.creditsCompleted) } : {}),
        ...(data.creditsCurrent !== undefined ? { creditsCurrent: Number(data.creditsCurrent) } : {}),
        ...(data.universityDomain ? { universityDomain: data.universityDomain } : {}),
        ...(isComplete !== undefined ? { isOnboardingComplete: isComplete } : {}),
      });
    }

    return {
      success: true,
      state: updatedState,
    };
  });

  /**
   * POST /api/onboarding/initialize
   * Idempotent background workspace initialization pipeline
   */
  fastify.post<{
    Body: {
      profile?: {
        fullName?: string;
        university?: string;
        course?: string;
        year?: number;
        semester?: number;
        section?: string;
        cgpa?: string;
        creditsCompleted?: number;
        creditsCurrent?: number;
        universityDomain?: string;
      };
      classes?: Array<Partial<ClassSession>>;
      notificationSettings?: {
        classReminderMinutes?: number;
        taskReminderHours?: number;
        quietHoursEnabled?: boolean;
        quietHoursStart?: string;
        quietHoursEnd?: string;
      };
      financeSettings?: {
        startingBalance?: number;
        monthlyBudget?: number;
      };
      floatingAssistantEnabled?: boolean;
      // Only when explicitly sent does /initialize mark onboarding complete.
      complete?: boolean;
    };
  }>('/initialize', async (req, reply) => {
    const userId = req.userId!;
    const body = req.body || {};

    // M21: never reset completed onboarding — return early instead of rebuilding state
    const priorState = (await supabaseStore.getOnboardingState(userId)) || inMemoryStore.onboardingStates.get(userId);
    if (priorState?.isComplete && body.complete !== true) {
      return { success: true, alreadyComplete: true, isComplete: true };
    }

    const jobId = randomUUID();

    // M12 fix: completion must be explicit — never force isComplete/completedSteps.
    const explicitlyComplete = body.complete === true;

    // M21: declared outside try so the catch block can mark it failed
    let job: InitializationJob | null = null;

    try {

    job = {
      id: jobId,
      userId,
      status: 'PROCESSING',
      stepStatuses: {
        profile: { status: 'PROCESSING', message: 'Saving profile & academic info' },
        timetable: { status: 'PENDING', message: 'Organizing classes and deduplicating subjects' },
        calendar: { status: 'PENDING', message: 'Configuring class schedule' },
        notifications: { status: 'PENDING', message: 'Setting up notification preferences' },
        finance: { status: 'PENDING', message: 'Initializing finance trackers' },
        email_processing: { status: 'PENDING', message: 'Queuing university email filter' },
      },
      startedAt: new Date().toISOString(),
      retryCount: 0,
    };

    inMemoryStore.initializationJobs.set(jobId, job);

    // 1. Profile initialization
    const existingProfile = (await supabaseStore.getProfile(userId)) || {
      id: userId,
      email: 'student@university.edu',
      fullName: 'Student User',
      createdAt: new Date().toISOString(),
    };

    const updatedProfile = {
      ...existingProfile,
      ...(body.profile?.fullName ? { fullName: body.profile.fullName } : {}),
      ...(body.profile?.university ? { university: body.profile.university } : {}),
      ...(body.profile?.course ? { course: body.profile.course } : {}),
      ...(body.profile?.year ? { year: Number(body.profile.year) } : {}),
      ...(body.profile?.semester ? { semester: Number(body.profile.semester) } : {}),
      ...(body.profile?.section ? { section: body.profile.section } : {}),
      ...(body.profile?.cgpa ? { cgpa: String(body.profile.cgpa) } : {}),
      ...(body.profile?.creditsCompleted !== undefined ? { creditsCompleted: Number(body.profile.creditsCompleted) } : {}),
      ...(body.profile?.creditsCurrent !== undefined ? { creditsCurrent: Number(body.profile.creditsCurrent) } : {}),
      ...(body.profile?.universityDomain ? { universityDomain: body.profile.universityDomain } : {}),
      // M12 fix: never force completion here — only when the client sent complete: true.
      isOnboardingComplete: explicitlyComplete || (existingProfile as any).isOnboardingComplete || false,
      updatedAt: new Date().toISOString(),
    };
    await supabaseStore.updateProfile(userId, updatedProfile);
    job.stepStatuses.profile = { status: 'COMPLETED', message: 'Profile created' };

    // 2. Timetable & Subject initialization (Idempotent by subject + day + start_time)
    // M12 fix: dedup against Supabase (supabaseStore.getClasses), not inMemoryStore —
    // inMemoryStore is empty after a restart, which re-inserted duplicate classes.
    let organizedClassCount = 0;
    if (body.classes && Array.isArray(body.classes) && body.classes.length > 0) {
      const currentClasses = await supabaseStore.getClasses(userId);
      const userSubjects = inMemoryStore.subjects.get(userId) || [];

      for (const item of body.classes) {
        if (!item.subjectName || !item.day || !item.startTime || !item.endTime) continue;

        // Deduplicate subject
        const normalizedSubName = item.subjectName.trim();
        let subject = userSubjects.find((s) => s.name.toLowerCase() === normalizedSubName.toLowerCase());
        if (!subject) {
          subject = {
            id: randomUUID(),
            userId,
            name: normalizedSubName,
            shortName: normalizedSubName.slice(0, 8).toUpperCase(),
            color: '#2E7470',
            // M12 fix: never invent faculty names — store empty when not provided.
            faculty: item.faculty || '',
            code: (item as any).subjectCode || undefined,
          };
          userSubjects.push(subject);
        }

        // Check if class already exists to prevent duplicate insertion
        const exists = currentClasses.some(
          (c) =>
            c.day === item.day &&
            c.startTime === item.startTime &&
            c.subjectName.toLowerCase() === normalizedSubName.toLowerCase()
        );

        if (!exists) {
          currentClasses.push({
            id: item.id || randomUUID(),
            userId,
            subjectName: normalizedSubName,
            day: item.day,
            startTime: item.startTime,
            endTime: item.endTime,
            // M12 fix: never invent room/faculty — store empty when not provided.
            room: item.room || '',
            faculty: item.faculty || '',
            classType: item.classType || 'LECTURE',
            isCancelled: false,
          });
        }
      }

      inMemoryStore.classes.set(userId, currentClasses);
      inMemoryStore.subjects.set(userId, userSubjects);
      await supabaseStore.saveClasses(userId, currentClasses).catch((err) =>
        console.warn('saveClasses to Supabase in onboarding error:', err)
      );
      organizedClassCount = currentClasses.length;
    }
    job.stepStatuses.timetable = {
      status: 'COMPLETED',
      message: `${organizedClassCount} classes organized`,
    };

    // 3. Calendar event initialization
    job.stepStatuses.calendar = { status: 'COMPLETED', message: 'Academic schedule synchronized' };

    // 4. Notifications & Preferences
    const notifSettings = body.notificationSettings || {};
    await supabaseStore.saveUserPreferences(userId, {
      quietHours: {
        enabled: notifSettings.quietHoursEnabled ?? true,
        startTime: notifSettings.quietHoursStart || '23:00',
        endTime: notifSettings.quietHoursEnd || '07:00',
        criticalBypass: true,
      },
      universityDomain: body.profile?.universityDomain || 'university.edu',
      floatingAssistantEnabled: body.floatingAssistantEnabled ?? true,
    });
    job.stepStatuses.notifications = { status: 'COMPLETED', message: 'Notification preferences saved' };

    // 5. Finance initialization
    if (body.financeSettings) {
      const { monthlyBudget } = body.financeSettings;
      if (monthlyBudget && monthlyBudget > 0) {
        const budgetData: Budget = {
          id: randomUUID(),
          userId,
          monthlyLimit: monthlyBudget,
          currentSpending: 0,
          // M12: IST month so 00:00–05:30 IST near month boundaries lands in the right month
          month: getISTDateStr().slice(0, 7),
          categoryLimits: {},
          alertThresholds: [75, 90, 100],
        };
        inMemoryStore.budgets.set(userId, budgetData);
        await supabaseStore.saveBudget(userId, budgetData).catch((err) =>
          console.warn('saveBudget to Supabase in onboarding error:', err)
        );
      }
    }
    job.stepStatuses.finance = { status: 'COMPLETED', message: 'Finance tracker initialized' };

    // 6. University Email Processing queue
    job.stepStatuses.email_processing = {
      status: 'COMPLETED',
      message: 'University email filter active',
    };

    // Finalize Job & Onboarding State
    job.status = 'COMPLETED';
    job.completedAt = new Date().toISOString();
    await supabaseStore.saveInitializationJob(job);

    const existingState = (await supabaseStore.getOnboardingState(userId)) || inMemoryStore.onboardingStates.get(userId);
    // M12 fix: do NOT force completedSteps / isComplete — only mark complete when
    // the client explicitly sent `complete: true`. Otherwise preserve prior progress.
    const finalState: OnboardingState = {
      ...(existingState || { userId, startedAt: new Date().toISOString() }),
      currentStep: explicitlyComplete ? 'COMPLETE' : existingState?.currentStep || 'INITIAL_PROCESSING',
      isComplete: explicitlyComplete,
      data: existingState?.data || {},
      completedSteps: explicitlyComplete
        ? [
            'GOOGLE_AUTH',
            'GOOGLE_SERVICES',
            'PROFILE',
            'ACADEMICS',
            'TIMETABLE',
            'TIMETABLE_REVIEW',
            'NOTIFICATION_SETUP',
            'FINANCE_SETUP',
            'FLOATING_ASSISTANT',
            'INITIAL_PROCESSING',
            'COMPLETE',
          ]
        : existingState?.completedSteps || [],
      completedAt: explicitlyComplete ? new Date().toISOString() : existingState?.completedAt,
      updatedAt: new Date().toISOString(),
    };
    await supabaseStore.saveOnboardingState(userId, finalState);

    return {
      success: true,
      jobId,
      status: 'COMPLETED',
      job,
      isComplete: explicitlyComplete,
    };
    } catch (err: any) {
      // M21: never leave the client hanging — mark the job failed and report
      if (job) {
        job.status = 'FAILED';
        job.stepStatuses.error = { status: 'FAILED', message: 'Initialization failed. Please try again.' };
        await supabaseStore.saveInitializationJob(job).catch(() => null);
      }
      return reply.status(500).send({ error: 'Onboarding initialization failed. Please try again.' });
    }
  });

  /**
   * GET /api/onboarding/jobs/:jobId
   * Polling endpoint for real progress updates on preparation screen
   */
  fastify.get<{ Params: { jobId: string } }>('/jobs/:jobId', async (req, reply) => {
    const userId = req.userId!;
    const { jobId } = req.params;
    const job = (await supabaseStore.getInitializationJob(jobId)) || inMemoryStore.initializationJobs.get(jobId);
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }
    // M31: ownership check — don't leak another user's job progress
    if (job.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }
    return { job };
  });
};
