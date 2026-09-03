import { z } from 'zod';

export const RouterIntent = {
  GENERAL_QUERY: 'GENERAL_QUERY',
  GET_SCHEDULE: 'GET_SCHEDULE',
  GET_TASKS: 'GET_TASKS',
  CREATE_TASK: 'CREATE_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  COMPLETE_TASK: 'COMPLETE_TASK',
  DELETE_TASK: 'DELETE_TASK',
  GET_EXPENSES: 'GET_EXPENSES',
  ADD_EXPENSE: 'ADD_EXPENSE',
  UPDATE_EXPENSE: 'UPDATE_EXPENSE',
  DELETE_EXPENSE: 'DELETE_EXPENSE',
  GET_BUDGET: 'GET_BUDGET',
  GET_DEBTS: 'GET_DEBTS',
  ADD_DEBT: 'ADD_DEBT',
  MARK_DEBT_PAID: 'MARK_DEBT_PAID',
  GET_EMAILS: 'GET_EMAILS',
  SUMMARIZE_EMAIL: 'SUMMARIZE_EMAIL',
  CREATE_CALENDAR_EVENT: 'CREATE_CALENDAR_EVENT',
  GET_CALENDAR: 'GET_CALENDAR',
  GET_EXAMS: 'GET_EXAMS',
  GET_ASSIGNMENTS: 'GET_ASSIGNMENTS',
} as const;

export type RouterIntentType = (typeof RouterIntent)[keyof typeof RouterIntent];

export const ActionRisk = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type ActionRiskType = (typeof ActionRisk)[keyof typeof ActionRisk];

export const ChatMessageSchema = z.object({
  id: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  toolCalls: z.array(z.any()).optional(),
  toolResults: z.array(z.any()).optional(),
  timestamp: z.string().datetime().optional(),
  requiresConfirmation: z.boolean().default(false),
  confirmed: z.boolean().default(false),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export interface AIChatResponse {
  message: string;
  intent: RouterIntentType;
  toolExecuted?: string;
  data?: any;
  requiresConfirmation?: boolean;
  confirmationPayload?: any;
}
