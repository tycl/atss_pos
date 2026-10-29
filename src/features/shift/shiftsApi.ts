import { db } from '../../lib/db'
import type { Shift } from '../../lib/types'
import { enqueueChange } from '../sync/syncQueue'

export async function getOpenShift(deviceId: string): Promise<Shift | undefined> {
  return db.shifts
    .where('deviceId')
    .equals(deviceId)
    .filter((shift) => shift.closedAt === null)
    .first()
}

export type OpenShiftParams = {
  merchantId: string
  outletId: string
  deviceId: string
  openedBy: string
  openingFloatSen: number
}

export async function openShift(params: OpenShiftParams): Promise<Shift> {
  const shift: Shift = {
    id: crypto.randomUUID(),
    merchantId: params.merchantId,
    outletId: params.outletId,
    deviceId: params.deviceId,
    openedBy: params.openedBy,
    openedAt: new Date().toISOString(),
    openingFloatSen: params.openingFloatSen,
    closedBy: null,
    closedAt: null,
    countedCashSen: null,
    expectedCashSen: null,
    varianceSen: null,
    createdAt: new Date().toISOString(),
  }

  await db.shifts.put(shift)
  await enqueueChange('shifts', 'insert', shift.id, shift)
  return shift
}

/** Opening float + cash collected on this device since the shift opened,
 * excluding voided orders (voiding is the refund -- that cash was handed
 * back, so it shouldn't count as collected). */
export async function computeExpectedCashSen(shift: Shift): Promise<number> {
  const deviceOrders = await db.orders
    .where('deviceId')
    .equals(shift.deviceId)
    .filter((order) => order.status !== 'void')
    .toArray()

  const orderIds = deviceOrders.map((order) => order.id)
  if (orderIds.length === 0) return shift.openingFloatSen

  const payments = await db.payments.where('orderId').anyOf(orderIds).toArray()
  const openedAt = new Date(shift.openedAt).getTime()

  const cashCollectedSen = payments
    .filter(
      (payment) => payment.method === 'cash' && new Date(payment.createdAt).getTime() >= openedAt,
    )
    .reduce((sum, payment) => sum + payment.amountSen, 0)

  return shift.openingFloatSen + cashCollectedSen
}

export type CloseShiftParams = {
  shiftId: string
  closedBy: string
  countedCashSen: number
}

export async function closeShift(params: CloseShiftParams): Promise<Shift> {
  const existing = await db.shifts.get(params.shiftId)
  if (!existing) throw new Error('Shift not found')
  if (existing.closedAt) throw new Error('Shift is already closed')

  const expectedCashSen = await computeExpectedCashSen(existing)

  const shift: Shift = {
    ...existing,
    closedBy: params.closedBy,
    closedAt: new Date().toISOString(),
    countedCashSen: params.countedCashSen,
    expectedCashSen,
    varianceSen: params.countedCashSen - expectedCashSen,
  }

  await db.shifts.put(shift)
  await enqueueChange('shifts', 'update', shift.id, shift)
  return shift
}
