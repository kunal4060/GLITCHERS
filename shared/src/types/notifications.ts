import { z } from 'zod';

export const NotificationPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type NotificationPriorityType = (typeof NotificationPriority)[keyof typeof NotificationPriority];

export const NotificationType = {
  CLASS_REMINDER: 'CLASS_REMINDER',
  TASK_REMINDER: 'TASK_REMINDER',
  EXAM_REMINDER: 'EXAM_REMINDER',
  ASSIGNMENT_DEADLINE: 'ASSIGNMENT_DEADLINE',
  IMPORTANT_EMAIL: 'IMPORTANT_EMAIL',
  BUDGET_ALERT: 'BUDGET_ALERT',
  DEBT_REMINDER: 'DEBT_REMINDER',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

export const QuietHoursSchema = z.object({
  enabled: z.boolean().default(true),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default('23:00'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default('07:00'),
  criticalBypass: z.boolean().default(true),
});

export type QuietHours = z.infer<typeof QuietHoursSchema>;

export const NotificationItemSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum([
    'CLASS_REMINDER',
    'TASK_REMINDER',
    'EXAM_REMINDER',
    'ASSIGNMENT_DEADLINE',
    'IMPORTANT_EMAIL',
    'BUDGET_ALERT',
    'DEBT_REMINDER',
    'SYSTEM_ALERT',
  ]),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  read: z.boolean().default(false),
  scheduledFor: z.string().datetime(),
  sentAt: z.string().datetime().nullable().optional(),
  sourceId: z.string().optional(),
});

export type NotificationItem = z.infer<typeof NotificationItemSchema>;
