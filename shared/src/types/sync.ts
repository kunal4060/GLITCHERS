import { z } from 'zod';

export const SyncOperationType = {
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;

export type SyncOperationTypeValue = (typeof SyncOperationType)[keyof typeof SyncOperationType];

export const SyncRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  entityType: z.enum(['tasks', 'expenses', 'debts', 'timetable', 'calendar', 'notifications']),
  operation: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  clientTimestamp: z.string().datetime(),
  payload: z.any(),
  status: z.enum(['PENDING', 'SYNCED', 'FAILED']).default('PENDING'),
  retryCount: z.number().int().default(0),
  error: z.string().nullable().optional(),
});

export type SyncRecord = z.infer<typeof SyncRecordSchema>;

export interface SyncBatchRequest {
  clientLastSyncedAt: string | null;
  pendingRecords: SyncRecord[];
}

export interface SyncBatchResponse {
  serverTimestamp: string;
  processedRecordIds: string[];
  failedRecordIds: { id: string; error: string }[];
  serverChanges: {
    tasks?: any[];
    expenses?: any[];
    debts?: any[];
    classes?: any[];
  };
}
