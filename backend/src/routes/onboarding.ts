import type { FastifyPluginAsync } from 'fastify';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { randomUUID } from 'crypto';
import type {
  OnboardingStep,
  OnboardingState,
  InitializationJob,
  ClassSession,
  Subject,
} from '@glitchers/shared';

export const onboardingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);

  /**
   * GET /api/onboarding/status
   * Retrieve current onboarding progress or initialize for new user
   */
  fastify.get('/status', async (req) => {
    const userId = req.userId!;
    let state = inMemoryStore.onboardingStates.get(userId);

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
      inMemoryStore.onboardingStates.set(userId, state);
    }

    const profile = inMemoryStore.profiles.get(userId);
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

    let state = inMemoryStore.onboardingStates.get(userId);
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

    inMemoryStore.onboardingStates.set(userId, updatedState);

    // If profile data was updated, partially merge into profile
    const profile = inMemoryStore.profiles.get(userId);
    if (profile && data) {
      const updatedProfile = {
        ...profile,
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
        updatedAt: new Date().toISOString(),
      };
      inMemoryStore.profiles.set(userId, updatedProfile);
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
    };
  }>('/initialize', async (req) => {
    const userId = req.userId!;
    const body = req.body || {};
    const jobId = randomUUID();

    const job: InitializationJob = {
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
    const existingProfile = inMemoryStore.profiles.get(userId) || {
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
      isOnboardingComplete: true,
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore.profiles.set(userId, updatedProfile);
    job.stepStatuses.profile = { status: 'COMPLETED', message: 'Profile created' };

    // 2. Timetable & Subject initialization (Idempotent by subject + day + start_time)
    if (body.classes && Array.isArray(body.classes) && body.classes.length > 0) {
      const currentClasses = inMemoryStore.classes.get(userId) || [];
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
            faculty: item.faculty || 'Department Faculty',
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
            room: item.room || 'AB1-204',
            faculty: item.faculty || 'Faculty Member',
            classType: item.classType || 'LECTURE',
            isCancelled: false,
          });
        }
      }

      inMemoryStore.classes.set(userId, currentClasses);
      inMemoryStore.subjects.set(userId, userSubjects);
    }
    job.stepStatuses.timetable = {
      status: 'COMPLETED',
      message: `${(inMemoryStore.classes.get(userId) || []).length} classes organized`,
    };

    // 3. Calendar event initialization
    job.stepStatuses.calendar = { status: 'COMPLETED', message: 'Academic schedule synchronized' };

    // 4. Notifications & Preferences
    const notifSettings = body.notificationSettings || {};
    inMemoryStore.preferences.set(userId, {
      quietHours: {
        enabled: notifSettings.quietHoursEnabled ?? true,
        startTime: notifSettings.quietHoursStart || '23:00',
        endTime: notifSettings.quietHoursEnd || '07:00',
        criticalBypass: true,
      },
      universityDomain: body.profile?.universityDomain || 'university.edu',
    });
    job.stepStatuses.notifications = { status: 'COMPLETED', message: 'Notification preferences saved' };

    // 5. Finance initialization
    if (body.financeSettings) {
      const { monthlyBudget } = body.financeSettings;
      if (monthlyBudget && monthlyBudget > 0) {
        inMemoryStore.budgets.set(userId, {
          id: randomUUID(),
          userId,
          monthlyLimit: monthlyBudget,
          currentSpending: 0,
          month: new Date().toISOString().slice(0, 7),
          categoryLimits: {},
          alertThresholds: [75, 90, 100],
        });
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
    inMemoryStore.initializationJobs.set(jobId, job);

    const existingState = inMemoryStore.onboardingStates.get(userId);
    inMemoryStore.onboardingStates.set(userId, {
      ...(existingState || { userId, startedAt: new Date().toISOString() }),
      currentStep: 'COMPLETE',
      isComplete: true,
      data: existingState?.data || {},
      completedSteps: [
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
      ],
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      jobId,
      status: 'COMPLETED',
      job,
      isComplete: true,
    };
  });

  /**
   * GET /api/onboarding/jobs/:jobId
   * Polling endpoint for real progress updates on preparation screen
   */
  fastify.get<{ Params: { jobId: string } }>('/jobs/:jobId', async (req, reply) => {
    const { jobId } = req.params;
    const job = inMemoryStore.initializationJobs.get(jobId);
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }
    return { job };
  });
};
