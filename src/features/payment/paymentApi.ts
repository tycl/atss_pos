import { db } from '../../lib/db'
import type { Order, Payment, PaymentMethod } from '../../lib/types'
import { saveOrder, type OrderParams } from '../ordering/ordersApi'
import { enqueueChange } from '../sync/syncQueue'

export type RecordPaymentParams = OrderParams & {
  method: PaymentMethod
  /** Required for cash; ignored for QR. */
  cashReceivedSen?: number
  /** Required for QR (the cashier-entered confirmation reference); ignored for cash. */
  reference?: string
}

export type RecordPaymentResult = {
  order: Order
  payment: Payment
}

/** Finalizes an order: cash rounding applies only for cash (never QR), the
 * order is marked 'paid', and a payment row is recorded -- all through Dexie
 * + the sync queue, same offline-first path as holdOrder. */
export async function recordPayment(params: RecordPaymentParams): Promise<RecordPaymentResult> {
  const order = await saveOrder(params, 'paid', params.method === 'cash', new Date().toISOString())

  const cashReceivedSen =
    params.method === 'cash' ? (params.cashReceivedSen ?? order.totalSen) : null

  const payment: Payment = {
    id: crypto.randomUUID(),
    merchantId: params.merchantId,
    orderId: order.id,
    method: params.method,
    amountSen: order.totalSen,
    cashReceivedSen,
    changeSen: cashReceivedSen !== null ? cashReceivedSen - order.totalSen : null,
    reference: params.method === 'duitnow_qr' ? (params.reference ?? null) : null,
    createdAt: new Date().toISOString(),
  }

  await db.payments.put(payment)
  await enqueueChange('payments', 'insert', payment.id, payment)

  return { order, payment }
}

export async function getPayment(orderId: string): Promise<Payment | undefined> {
  return db.payments.where('orderId').equals(orderId).first()
}
