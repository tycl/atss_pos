import { calculateTotals } from '../../lib/calculateTotals'
import { db } from '../../lib/db'
import type { AuditLogEntry, Order, OrderLine, OrderStatus, OrderType } from '../../lib/types'
import { enqueueChange } from '../sync/syncQueue'
import { cartSubtotalSen, type CartLine } from './cart'
import { generateOrderNo } from './orderNo'

export type OutletTaxSettings = {
  sstEnabled: boolean
  sstRateBp: number
  serviceChargeEnabled: boolean
  serviceChargeRateBp: number
}

export type OrderParams = {
  orderId: string | null
  merchantId: string
  outletId: string
  deviceId: string
  receiptPrefix: string
  type: OrderType
  tableId: string | null
  createdBy: string
  lines: CartLine[]
  settings: OutletTaxSettings | null
}

/** Saves the cart as an order (Dexie first, then the sync queue picks it up
 * when online -- device's own version always wins for orders, per the
 * offline-first conflict rule). Shared by holdOrder (status 'open', no cash
 * rounding -- payment method isn't chosen yet) and the payment flow (status
 * 'paid', cash rounding applied only for cash). */
export async function saveOrder(
  params: OrderParams,
  status: OrderStatus,
  applyCashRounding: boolean,
  paidAt: string | null,
): Promise<Order> {
  const existing = params.orderId ? await db.orders.get(params.orderId) : undefined
  const orderId = existing?.id ?? crypto.randomUUID()
  const orderNo =
    existing?.orderNo ?? (await generateOrderNo(params.deviceId, params.receiptPrefix))
  const createdAt = existing?.createdAt ?? new Date().toISOString()

  const totals = calculateTotals({
    subtotalSen: cartSubtotalSen(params.lines),
    serviceChargeEnabled: params.settings?.serviceChargeEnabled ?? false,
    serviceChargeRateBp: params.settings?.serviceChargeRateBp ?? 0,
    sstEnabled: params.settings?.sstEnabled ?? false,
    sstRateBp: params.settings?.sstRateBp ?? 0,
    applyCashRounding,
  })

  const order: Order = {
    id: orderId,
    merchantId: params.merchantId,
    outletId: params.outletId,
    deviceId: params.deviceId,
    orderNo,
    type: params.type,
    tableId: params.tableId,
    status,
    subtotalSen: totals.subtotalSen,
    serviceChargeSen: totals.serviceChargeSen,
    sstSen: totals.sstSen,
    roundingSen: totals.roundingSen,
    totalSen: totals.totalSen,
    createdBy: params.createdBy,
    createdAt,
    paidAt,
    syncedAt: null,
  }

  const previousLines = existing
    ? await db.orderLines.where('orderId').equals(orderId).toArray()
    : []
  const previousLineIds = new Set(previousLines.map((line) => line.id))
  const currentLineIds = new Set(params.lines.map((line) => line.id))
  const removedLineIds = [...previousLineIds].filter((id) => !currentLineIds.has(id))

  const orderLines: OrderLine[] = params.lines.map((line) => ({
    id: line.id,
    merchantId: params.merchantId,
    orderId,
    itemId: line.itemId || null,
    nameSnapshot: line.nameSnapshot,
    unitPriceSen: line.unitPriceSen,
    qty: line.qty,
    modifiersSnapshot: line.modifiers,
    lineTotalSen: line.lineTotalSen,
    note: line.note || null,
    status: 'active',
    voidReason: null,
    createdAt: new Date().toISOString(),
  }))

  await db.transaction('rw', [db.orders, db.orderLines], async () => {
    await db.orders.put(order)
    await db.orderLines.bulkPut(orderLines)
    if (removedLineIds.length > 0) {
      await db.orderLines.bulkDelete(removedLineIds)
    }
  })

  await enqueueChange('orders', existing ? 'update' : 'insert', orderId, order)
  for (const line of orderLines) {
    await enqueueChange(
      'order_lines',
      previousLineIds.has(line.id) ? 'update' : 'insert',
      line.id,
      line,
    )
  }
  for (const removedId of removedLineIds) {
    await enqueueChange('order_lines', 'delete', removedId, null)
  }

  return order
}

export async function holdOrder(params: OrderParams): Promise<Order> {
  return saveOrder(params, 'open', false, null)
}

export async function getOrderLines(orderId: string): Promise<OrderLine[]> {
  return db.orderLines.where('orderId').equals(orderId).toArray()
}

export function orderLineToCartLine(line: OrderLine): CartLine {
  return {
    id: line.id,
    itemId: line.itemId ?? '',
    nameSnapshot: line.nameSnapshot,
    unitPriceSen: line.unitPriceSen,
    qty: line.qty,
    modifiers: line.modifiersSnapshot,
    note: line.note ?? '',
    lineTotalSen: line.lineTotalSen,
  }
}

export type VoidOrderParams = {
  orderId: string
  merchantId: string
  reason: string
  /** Whoever is operating the device when the void happens. */
  requestedByStaffId: string
  /** The owner/manager whose PIN authorized it. */
  authorizedByStaffId: string
}

/** Voids a whole order (open or paid) -- orders can't be edited once paid,
 * only voided, per the business rules. Always logged to audit_log, which
 * doubles as the "refund record": there's no separate ledger entry, since
 * the actual cash/QR refund is a manual action the audit entry documents. */
export async function voidOrder(params: VoidOrderParams): Promise<void> {
  const order = await db.orders.get(params.orderId)
  if (!order) throw new Error('Order not found')
  if (order.status === 'void') throw new Error('Order is already voided')

  const voidedOrder: Order = { ...order, status: 'void' }

  const auditEntry: AuditLogEntry = {
    id: crypto.randomUUID(),
    merchantId: params.merchantId,
    staffId: params.authorizedByStaffId,
    action: 'void_order',
    details: {
      orderId: order.id,
      orderNo: order.orderNo,
      previousStatus: order.status,
      totalSen: order.totalSen,
      reason: params.reason,
      requestedByStaffId: params.requestedByStaffId,
    },
    createdAt: new Date().toISOString(),
  }

  await db.transaction('rw', [db.orders, db.auditLog], async () => {
    await db.orders.put(voidedOrder)
    await db.auditLog.put(auditEntry)
  })

  await enqueueChange('orders', 'update', voidedOrder.id, voidedOrder)
  await enqueueChange('audit_log', 'insert', auditEntry.id, auditEntry)
}
