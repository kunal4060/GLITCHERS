import { inMemoryStore } from '../../repositories/inMemoryStore.js';
import { supabaseStore } from '../../repositories/supabaseStore.js';
import type { SyncBatchRequest, SyncBatchResponse, SyncRecord } from '@glitchers/shared';

// ponytail: in-memory per-user lock for the timetable read-modify-write in sync.
// Ceiling: single process only — lost on restart and not shared across instances.
// Upgrade path: Redis/distributed lock if the backend ever runs multi-instance.
const timetableLocks = new Set<string>();

async function withTimetableLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  while (timetableLocks.has(userId)) {
    await new Promise((r) => setTimeout(r, 25));
  }
  timetableLocks.add(userId);
  try {
    return await fn();
  } finally {
    timetableLocks.delete(userId);
  }
}

/** Explicit last-write-wins: skip the write when the server copy is newer. */
function isServerNewer(serverUpdatedAt: unknown, clientTimestamp: string): boolean {
  if (typeof serverUpdatedAt !== 'string' || !serverUpdatedAt) return false;
  const serverTime = new Date(serverUpdatedAt).getTime();
  const clientTime = new Date(clientTimestamp).getTime();
  return Number.isFinite(serverTime) && Number.isFinite(clientTime) && serverTime > clientTime;
}

export class SyncService {
  public async processSyncBatch(userId: string, batch: SyncBatchRequest): Promise<SyncBatchResponse> {
    const processedRecordIds: string[] = [];
    const failedRecordIds: { id: string; error: string }[] = [];

    // M1: cap batch size and null-guard records so one bad record can't 500 the batch
    const records = Array.isArray(batch?.pendingRecords) ? batch.pendingRecords.slice(0, 500) : [];

    for (const record of records) {
      if (!record || typeof record !== 'object' || typeof record.id !== 'string') {
        continue; // skip malformed records instead of crashing the batch
      }
      try {
        // M2: calendar/notifications are not supported by the sync protocol —
        // return a NON_RETRYABLE error so clients stop retrying forever.
        if (record.entityType === 'calendar' || record.entityType === 'notifications') {
          throw new Error(`NON_RETRYABLE: entityType '${record.entityType}' is not supported by server sync`);
        }
        switch (record.entityType) {
          case 'expenses': {
            if (record.operation === 'INSERT') {
              await supabaseStore.createExpense(userId, record.payload);
            } else if (record.operation === 'DELETE') {
              await supabaseStore.deleteExpense(userId, record.payload?.id);
            } else {
              // H1: unhandled op must NOT be marked processed — throw so it
              // lands in failedRecordIds and the client retries instead of
              // silently losing the edit.
              throw new Error(`Unsupported operation '${String(record.operation)}' for entityType 'expenses'`);
            }
            break;
          }
          case 'tasks': {
            if (record.operation === 'INSERT') {
              await supabaseStore.createTask(userId, record.payload);
            } else if (record.operation === 'UPDATE') {
              // M3: explicit last-write-wins — skip when the server copy is newer
              const existing = (await supabaseStore.getTasks(userId).catch(() => []))
                .find((t: any) => t.id === record.payload?.id);
              if (!existing || !isServerNewer((existing as any).updatedAt, record.clientTimestamp)) {
                await supabaseStore.updateTask(userId, record.payload?.id, record.payload);
              }
              // server copy newer → skipped; client receives it in serverChanges
            } else if (record.operation === 'DELETE') {
              await supabaseStore.deleteTask(userId, record.payload?.id);
            } else {
              throw new Error(`Unsupported operation '${String(record.operation)}' for entityType 'tasks'`);
            }
            break;
          }
          case 'debts': {
            if (record.operation === 'INSERT') {
              await supabaseStore.createDebt(userId, record.payload);
            } else if (record.operation === 'UPDATE') {
              // M3: explicit last-write-wins — skip when the server copy is newer
              const existing = (await supabaseStore.getDebts(userId).catch(() => []))
                .find((d: any) => d.id === record.payload?.id);
              if (!existing || !isServerNewer((existing as any).updatedAt, record.clientTimestamp)) {
                await supabaseStore.updateDebt(userId, record.payload?.id, record.payload);
              }
            } else if (record.operation === 'DELETE') {
              // No deleteDebt exists yet — surface as failed so it retries
              // instead of being silently marked processed.
              throw new Error(`Unsupported operation 'DELETE' for entityType 'debts'`);
            } else {
              throw new Error(`Unsupported operation '${String(record.operation)}' for entityType 'debts'`);
            }
            break;
          }
          case 'timetable': {
            // M4: serialize read-modify-write per user so concurrent batches can't lose classes
            await withTimetableLock(userId, async () => {
              if (record.operation === 'INSERT' || record.operation === 'UPDATE') {
                const existing = await supabaseStore.getClasses(userId);
                const updated = [record.payload, ...existing.filter((c) => c.id !== record.payload?.id)];
                await supabaseStore.saveClasses(userId, updated);
              } else if (record.operation === 'DELETE') {
                await supabaseStore.deleteClass(userId, record.payload?.id);
              }
            });
            break;
          }
          default: {
            // Unknown entity types must NOT be silently marked processed —
            // surface them as failed so the client can retry or investigate.
            throw new Error(`Unknown entityType: ${String(record.entityType)}`);
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
