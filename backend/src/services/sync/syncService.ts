import { inMemoryStore } from '../../repositories/inMemoryStore.js';
import { supabaseStore } from '../../repositories/supabaseStore.js';
import type { SyncBatchRequest, SyncBatchResponse } from '@glitchers/shared';

export class SyncService {
  public async processSyncBatch(userId: string, batch: SyncBatchRequest): Promise<SyncBatchResponse> {
    const processedRecordIds: string[] = [];
    const failedRecordIds: { id: string; error: string }[] = [];

    for (const record of batch.pendingRecords) {
      try {
        switch (record.entityType) {
          case 'expenses': {
            if (record.operation === 'INSERT') {
              await supabaseStore.createExpense(userId, record.payload);
            } else if (record.operation === 'DELETE') {
              await supabaseStore.deleteExpense(userId, record.payload.id);
            }
            break;
          }
          case 'tasks': {
            if (record.operation === 'INSERT') {
              await supabaseStore.createTask(userId, record.payload);
            } else if (record.operation === 'UPDATE') {
              await supabaseStore.updateTask(userId, record.payload.id, record.payload);
            } else if (record.operation === 'DELETE') {
              await supabaseStore.deleteTask(userId, record.payload.id);
            }
            break;
          }
          case 'debts': {
            if (record.operation === 'INSERT') {
              await supabaseStore.createDebt(userId, record.payload);
            } else if (record.operation === 'UPDATE') {
              await supabaseStore.updateDebt(userId, record.payload.id, record.payload);
            }
            break;
          }
          case 'timetable': {
            if (record.operation === 'INSERT' || record.operation === 'UPDATE') {
              const existing = await supabaseStore.getClasses(userId);
              const updated = [record.payload, ...existing.filter((c) => c.id !== record.payload.id)];
              await supabaseStore.saveClasses(userId, updated);
            } else if (record.operation === 'DELETE') {
              await supabaseStore.deleteClass(userId, record.payload.id);
            }
            break;
          }
        }
        processedRecordIds.push(record.id);
      } catch (err: any) {
        failedRecordIds.push({ id: record.id, error: err.message || 'Failed to process sync' });
      }
    }

    const [tasks, expenses, debts, classes] = await Promise.all([
      supabaseStore.getTasks(userId),
      supabaseStore.getExpenses(userId),
      supabaseStore.getDebts(userId),
      supabaseStore.getClasses(userId),
    ]);

    return {
      serverTimestamp: new Date().toISOString(),
      processedRecordIds,
      failedRecordIds,
      serverChanges: {
        tasks,
        expenses,
        debts,
        classes,
      },
    };
  }
}

export const syncService = new SyncService();
