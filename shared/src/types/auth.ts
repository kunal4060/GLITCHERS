import { z } from 'zod';

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(1),
  avatarUrl: z.string().url().nullable().optional(),
  university: z.string().nullable().optional(),
  course: z.string().nullable().optional(),
  year: z.number().int().min(1).max(6).nullable().optional(),
  semester: z.number().int().min(1).max(12).nullable().optional(),
  section: z.string().nullable().optional(),
  cgpa: z.string().nullable().optional(),
  creditsCompleted: z.number().int().nonnegative().nullable().optional(),
  creditsCurrent: z.number().int().nonnegative().nullable().optional(),
  studentId: z.string().nullable().optional(),
  universityDomain: z.string().default('university.edu').optional(),
  isOnboardingComplete: z.boolean().default(false).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const GoogleConnectionSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  email: z.string().email(),
  gmailConnected: z.boolean().default(false),
  calendarConnected: z.boolean().default(false),
  scopes: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().nullable().optional(),
});

export type GoogleConnection = z.infer<typeof GoogleConnectionSchema>;

export const OnboardingStepSchema = z.enum([
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
]);

export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export const OnboardingStateSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  currentStep: OnboardingStepSchema.default('GOOGLE_AUTH'),
  completedSteps: z.array(OnboardingStepSchema).default([]),
  isComplete: z.boolean().default(false),
  data: z.record(z.any()).default({}),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type OnboardingState = z.infer<typeof OnboardingStateSchema>;

export const JobStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'SKIPPED']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export interface InitializationJob {
  id: string;
  userId: string;
  status: JobStatus;
  stepStatuses: Record<string, { status: JobStatus; message?: string }>;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
  retryCount: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: UserProfile;
}

