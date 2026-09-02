import { inMemoryStore } from '../../repositories/inMemoryStore.js';
import type { SyncBatchRequest, SyncBatchResponse } from '@glitchers/shared';

export class SyncService {
  public async processSyncBatch(userId: string, batch: SyncBatchRequest): Promise<SyncBatchResponse> {
    const processedRecordIds: string[] = [];
    const failedRecordIds: { id: string; error: string }[] = [];

    for (const record of batch.pendingRecords) {
      try {
        switch (record.entityType) {
          case 'expenses': {
            const expenses = inMemoryStore.expenses.get(userId) || [];
            if (record.operation === 'INSERT') {
              expenses.unshift(record.payload);
            } else if (record.operation === 'DELETE') {
              const idx = expenses.findIndex((e) => e.id === record.payload.id);
              if (idx >= 0) expenses.splice(idx, 1);
            }
            inMemoryStore.expenses.set(userId, expenses);
            break;
          }
          case 'tasks': {
            const tasks = inMemoryStore.tasks.get(userId) || [];
            if (record.operation === 'INSERT') {
              tasks.unshift(record.payload);
            } else if (record.operation === 'UPDATE') {
              const idx = tasks.findIndex((t) => t.id === record.payload.id);
              if (idx >= 0) tasks[idx] = { ...tasks[idx], ...record.payload };
            }
            inMemoryStore.tasks.set(userId, tasks);
            break;
          }
          case 'debts': {
            const debts = inMemoryStore.debts.get(userId) || [];
            if (record.operation === 'INSERT') {
              debts.unshift(record.payload);
            }
            inMemoryStore.debts.set(userId, debts);
            break;
          }
        }
        processedRecordIds.push(record.id);
      } catch (err: any) {
        failedRecordIds.push({ id: record.id, error: err.message || 'Failed to process sync' });
      }
    }

    return {
      serverTimestamp: new Date().toISOString(),
      processedRecordIds,
      failedRecordIds,
      serverChanges: {
        tasks: inMemoryStore.tasks.get(userId) || [],
        expenses: inMemoryStore.expenses.get(userId) || [],
        debts: inMemoryStore.debts.get(userId) || [],
        classes: inMemoryStore.classes.get(userId) || [],
      },
    };
  }
}

export const syncService = new SyncService();
