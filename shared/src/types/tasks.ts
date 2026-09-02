import { z } from 'zod';

export const TaskPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  EXTREMELY_IMPORTANT: 'EXTREMELY_IMPORTANT',
} as const;

export type TaskPriorityType = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'EXTREMELY_IMPORTANT']).default('NORMAL'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('TODO'),
  dueDate: z.string().datetime().nullable().optional(),
  recurrence: z.string().nullable().optional(),
  relatedSubject: z.string().nullable().optional(),
  relatedEmailId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const ExamSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  subject: z.string().min(1),
  date: z.string(), // YYYY-MM-DD
  time: z.string(), // HH:mm
  room: z.string().nullable().optional(),
  syllabus: z.string().nullable().optional(),
  importance: z.enum(['NORMAL', 'HIGH', 'CRITICAL']).default('CRITICAL'),
  relatedEmailId: z.string().uuid().nullable().optional(),
});

export type Exam = z.infer<typeof ExamSchema>;

export const AssignmentSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  subject: z.string().min(1),
  description: z.string().nullable().optional(),
  deadline: z.string().datetime(),
  submissionPlatform: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'EXTREMELY_IMPORTANT']).default('HIGH'),
  status: z.enum(['PENDING', 'SUBMITTED', 'GRADED']).default('PENDING'),
  relatedEmailId: z.string().uuid().nullable().optional(),
});

export type Assignment = z.infer<typeof AssignmentSchema>;
