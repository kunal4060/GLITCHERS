import { z } from 'zod';

export const EmailImportance = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type EmailImportanceType = (typeof EmailImportance)[keyof typeof EmailImportance];

export const ScheduleChangeExtractionSchema = z.object({
  hasScheduleChange: z.boolean(),
  subject: z.string().nullable().optional(),
  originalTime: z.string().nullable().optional(),
  newTime: z.string().nullable().optional(),
  newRoom: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export type ScheduleChangeExtraction = z.infer<typeof ScheduleChangeExtractionSchema>;

export const EmailSummarySchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  providerMessageId: z.string(),
  sender: z.string(),
  subject: z.string(),
  receivedAt: z.string().datetime(),
  isUniversityRelated: z.boolean(),
  importance: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  summary: z.string(),
  actionRequired: z.boolean().default(false),
  actionItem: z.string().nullable().optional(),
  extractedDeadline: z.string().datetime().nullable().optional(),
  scheduleChange: ScheduleChangeExtractionSchema.nullable().optional(),
  isProcessed: z.boolean().default(true),
});

export type EmailSummary = z.infer<typeof EmailSummarySchema>;
