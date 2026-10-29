import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CartLine } from '../ordering/cart'

type PushCall = { table: string; op: 'upsert' | 'delete'; id: string }

const pushCalls: PushCall[] = []
const network = { online: false, failEveryNth: 0 }
let callIndex = 0

function shouldFail(): boolean {
  if (!network.online) return true
  callIndex++
  return network.failEveryNth > 0 && callIndex % network.failEveryNth === 0
}

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => ({
      upsert: (row: { id: string }) => {
        pushCalls.push({ table, op: 'upsert', id: row.id })
        return Promise.resolve({
          error: shouldFail() ? { message: 'network unreachable' } : null,
        })
      },
      delete: () => ({
        eq: (_column: string, id: string) => {
          pushCalls.push({ table, op: 'delete', id })
          return Promise.resolve({
            error: shouldFail() ? { message: 'network unreachable' } : null,
          })
        },
      }),
    }),
  },
}))

// Imported after the mock so syncQueue picks up the fake supabase client above.
const { db } = await import('../../lib/db')
const { processSyncQueue } = await import('./syncQueue')
const { recordPayment } = await import('../payment/paymentApi')

const MERCHANT_ID = 'merchant-1'
const OUTLET_ID = 'outlet-1'
const DEVICE_ID = 'device-1'
const STAFF_ID = 'staff-1'

function orderLines(orderIndex: number): CartLine[] {
  return [
    {
      id: crypto.randomUUID(),
      itemId: 'item-coffee',
      nameSnapshot: 'Kopi O',
      unitPriceSen: 280,
      qty: 1,
      modifiers: [],
      note: '',
      lineTotalSen: 280,
    },
    {
      id: crypto.randomUUID(),
      itemId: 'item-toast',
      nameSnapshot: 'Kaya Toast',
      unitPriceSen: 350,
      qty: orderIndex % 3 === 0 ? 2 : 1,
      modifiers: [],
      note: '',
      lineTotalSen: orderIndex % 3 === 0 ? 700 : 350,
    },
  ]
}

/** Simulates "enough time has passed for the backoff to clear" without
 * depending on fake timers, which fake-indexeddb's internal scheduling
 * doesn't play well with. */
async function releaseBackoff() {
  await db.syncQueue.toCollection().modify({ nextAttemptAt: Date.now() })
}

async function placeOrder(orderIndex: number) {
  return recordPayment({
    orderId: null,
    merchantId: MERCHANT_ID,
    outletId: OUTLET_ID,
    deviceId: DEVICE_ID,
    receiptPrefix: 'T1',
    type: orderIndex % 2 === 0 ? 'dine_in' : 'takeaway',
    tableId: orderIndex % 2 === 0 ? `table-${orderIndex}` : null,
    createdBy: STAFF_ID,
    lines: orderLines(orderIndex),
    settings: null,
    method: orderIndex % 2 === 0 ? 'cash' : 'duitnow_qr',
    cashReceivedSen: orderIndex % 2 === 0 ? 2000 : undefined,
    reference: orderIndex % 2 === 0 ? undefined : `REF-${orderIndex}`,
  })
}

describe('offline-first sync: 50 orders created offline, then reconnect', () => {
  beforeEach(async () => {
    network.online = false
    network.failEveryNth = 0
    callIndex = 0
    pushCalls.length = 0
    await Promise.all([
      db.orders.clear(),
      db.orderLines.clear(),
      db.payments.clear(),
      db.syncQueue.clear(),
    ])
  })

  it('queues every write locally while offline and loses nothing', async () => {
    for (let i = 0; i < 50; i++) {
      await placeOrder(i)
    }

    expect(await db.orders.count()).toBe(50)
    expect(await db.orderLines.count()).toBe(100)
    expect(await db.payments.count()).toBe(50)

    // Each order enqueues: 1 order upsert + 2 order_line upserts + 1 payment upsert.
    const pending = await db.syncQueue.toArray()
    expect(pending).toHaveLength(200)
    expect(pending.every((entry) => entry.attempts === 0)).toBe(true)
  })

  it('fails safely offline (retries scheduled, no data dropped) then drains fully once reconnected', async () => {
    for (let i = 0; i < 50; i++) {
      await placeOrder(i)
    }

    await processSyncQueue()

    // Still offline: nothing pushed successfully, everything stays queued with a logged error.
    let pending = await db.syncQueue.toArray()
    expect(pending).toHaveLength(200)
    expect(pending.every((entry) => entry.attempts === 1)).toBe(true)
    expect(pending.every((entry) => entry.lastError === 'network unreachable')).toBe(true)
    expect(pending.every((entry) => entry.nextAttemptAt > Date.now())).toBe(true)

    // Reconnect: advance past the backoff window and drain.
    network.online = true
    pushCalls.length = 0
    await releaseBackoff()
    await processSyncQueue()

    pending = await db.syncQueue.toArray()
    expect(pending).toHaveLength(0)

    // Local data survives the sync untouched.
    expect(await db.orders.count()).toBe(50)
    expect(await db.orderLines.count()).toBe(100)
    expect(await db.payments.count()).toBe(50)

    const upserts = pushCalls.filter((call) => call.op === 'upsert')
    expect(upserts.filter((call) => call.table === 'orders')).toHaveLength(50)
    expect(upserts.filter((call) => call.table === 'order_lines')).toHaveLength(100)
    expect(upserts.filter((call) => call.table === 'payments')).toHaveLength(50)
  })

  it('recovers individually-failing entries without blocking or losing the rest', async () => {
    for (let i = 0; i < 50; i++) {
      await placeOrder(i)
    }

    // Online, but every 7th push still fails transiently (e.g. a dropped packet).
    network.online = true
    network.failEveryNth = 7

    await processSyncQueue()
    let pending = await db.syncQueue.toArray()
    expect(pending.length).toBeGreaterThan(0)
    expect(pending.length).toBeLessThan(200)

    // Later retries eventually get everything through.
    network.failEveryNth = 0
    await releaseBackoff()
    await processSyncQueue()
    pending = await db.syncQueue.toArray()
    expect(pending).toHaveLength(0)

    expect(await db.orders.count()).toBe(50)
    expect(await db.orderLines.count()).toBe(100)
    expect(await db.payments.count()).toBe(50)
  })

  it('does not double-process when called concurrently (no duplicate pushes)', async () => {
    for (let i = 0; i < 10; i++) {
      await placeOrder(i)
    }
    network.online = true

    await Promise.all([processSyncQueue(), processSyncQueue()])

    const pending = await db.syncQueue.toArray()
    expect(pending).toHaveLength(0)

    const ids = pushCalls.map((call) => `${call.table}:${call.id}`)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
