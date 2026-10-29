import { camelToSnake } from '../../lib/caseConvert'
import { db, type SyncOperation, type SyncQueueEntry } from '../../lib/db'
import { supabase } from '../../lib/supabaseClient'

const BASE_RETRY_DELAY_MS = 2_000
const MAX_RETRY_DELAY_MS = 5 * 60_000

/** Exponential backoff, capped, so a device left offline overnight doesn't
 * hammer Supabase the moment it reconnects. */
export function nextRetryDelayMs(attemptsSoFar: number): number {
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** attemptsSoFar, MAX_RETRY_DELAY_MS)
}

/** Supabase/PostgREST errors are plain objects with a `message` field, not
 * Error instances, so `err.message` alone misses them. */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return String(err)
}

export async function enqueueChange(
  tableName: string,
  op: SyncOperation,
  recordId: string,
  payload: Record<string, unknown> | null,
): Promise<void> {
  const entry: SyncQueueEntry = {
    id: crypto.randomUUID(),
    tableName,
    op,
    recordId,
    payload,
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: Date.now(),
    lastError: null,
  }
  await db.syncQueue.add(entry)
}

async function pushEntry(entry: SyncQueueEntry): Promise<void> {
  if (entry.op === 'delete') {
    const { error } = await supabase.from(entry.tableName).delete().eq('id', entry.recordId)
    if (error) throw error
    return
  }

  const row = camelToSnake(entry.payload ?? {})
  const { error } = await supabase.from(entry.tableName).upsert(row)
  if (error) throw error
}

let processing = false

/** Device/order/payment rows win on conflict (they're only ever created on
 * one device), so a plain upsert is correct here -- no merge logic needed. */
export async function processSyncQueue(): Promise<void> {
  if (processing) return
  processing = true

  try {
    const due = await db.syncQueue
      .where('nextAttemptAt')
      .belowOrEqual(Date.now())
      .sortBy('createdAt')

    for (const entry of due) {
      try {
        await pushEntry(entry)
        await db.syncQueue.delete(entry.id)
      } catch (err) {
        const attempts = entry.attempts + 1
        await db.syncQueue.update(entry.id, {
          attempts,
          nextAttemptAt: Date.now() + nextRetryDelayMs(attempts),
          lastError: errorMessage(err),
        })
      }
    }
  } finally {
    processing = false
  }
}
