import { z } from 'zod';

export const DayOfWeek = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY',
} as const;

export type DayOfWeekType = (typeof DayOfWeek)[keyof typeof DayOfWeek];

export const SubjectSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  shortName: z.string().min(1),
  code: z.string().nullable().optional(),
  faculty: z.string().nullable().optional(),
  color: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).default('#3B82F6'),
});

export type Subject = z.infer<typeof SubjectSchema>;

export const ClassSessionSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  subjectName: z.string().min(1),
  day: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:mm'),
  room: z.string().nullable().optional(),
  faculty: z.string().nullable().optional(),
  classType: z.enum(['LECTURE', 'LAB', 'TUTORIAL', 'SEMINAR']).default('LECTURE'),
  isCancelled: z.boolean().default(false),
  temporaryRoom: z.string().nullable().optional(),
});

export type ClassSession = z.infer<typeof ClassSessionSchema>;

export interface ScheduleConflict {
  type: 'OVERLAP' | 'DUPLICATE' | 'INVALID_TIME';
  description: string;
  classA: ClassSession;
  classB?: ClassSession;
}
