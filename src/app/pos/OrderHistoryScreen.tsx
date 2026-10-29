import { useState } from 'react'
import { getOrderLines, orderLineToCartLine, voidOrder } from '../../features/ordering/ordersApi'
import { getPayment } from '../../features/payment/paymentApi'
import { buildReceiptText } from '../../features/printing/buildTickets'
import { printText } from '../../features/printing/printService'
import { usePullCatalog } from '../../features/sync/usePullCatalog'
import { db } from '../../lib/db'
import { senToRm } from '../../lib/money'
import type { Order, Staff } from '../../lib/types'
import { useLiveQuery } from '../../lib/useLiveQuery'
import { useMerchantDevice } from '../../lib/useMerchantDevice'
import { VoidAuthModal } from './VoidAuthModal'

export function OrderHistoryScreen({ staff, onBack }: { staff: Staff; onBack: () => void }) {
  const { merchantId, device, error: deviceError } = useMerchantDevice()
  usePullCatalog(merchantId, device?.outletId ?? null)

  const [reprintingId, setReprintingId] = useState<string | null>(null)
  const [voidTarget, setVoidTarget] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)

  const orders = useLiveQuery(
    () =>
      device
        ? db.orders
            .where('outletId')
            .equals(device.outletId)
            .filter((order) => order.status === 'paid' || order.status === 'void')
            .reverse()
            .sortBy('createdAt')
        : Promise.resolve([]),
    [device],
    [] as Order[],
  )

  const merchant = useLiveQuery(
    () => (merchantId ? db.merchants.get(merchantId) : Promise.resolve(undefined)),
    [merchantId],
    undefined,
  )
  const outlet = useLiveQuery(
    () => (device ? db.outlets.get(device.outletId) : Promise.resolve(undefined)),
    [device],
    undefined,
  )
  const settings = useLiveQuery(
    () => (device ? db.settings.get(device.outletId) : Promise.resolve(undefined)),
    [device],
    undefined,
  )

  async function handleReprint(order: Order) {
    if (!merchant) return
    setReprintingId(order.id)
    setError(null)
    try {
      const [orderLines, payment] = await Promise.all([
        getOrderLines(order.id),
        getPayment(order.id),
      ])
      if (!payment) throw new Error('No payment record found for this order')

      const text = buildReceiptText({
        result: { order, payment },
        merchant,
        receiptFooter: outlet?.receiptFooter ?? null,
        cashierName: staff.name,
        sstEnabled: settings?.sstEnabled ?? false,
        lines: orderLines.map(orderLineToCartLine),
      })
      await printText(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reprint receipt')
    } finally {
      setReprintingId(null)
    }
  }

  async function handleVoidAuthorized(reason: string, authorizedBy: Staff) {
    if (!voidTarget || !merchantId) return
    try {
      await voidOrder({
        orderId: voidTarget.id,
        merchantId,
        reason,
        requestedByStaffId: staff.id,
        authorizedByStaffId: authorizedBy.id,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void order')
    } finally {
      setVoidTarget(null)
    }
  }

  if (deviceError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <p className="text-slate-700">{deviceError}</p>
        <button
          onClick={() => window.location.reload()}
          className="min-h-11 rounded bg-slate-800 px-4 py-3 text-white"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={onBack} className="text-sm text-slate-600 underline">
              ← Back
            </button>
            <h1 className="text-xl font-semibold text-slate-800">Order history</h1>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-slate-800">
                  {order.orderNo}
                  {order.status === 'void' && (
                    <span className="ml-2 text-xs font-normal text-red-600">VOIDED</span>
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  {order.type === 'dine_in' ? 'Dine-in' : 'Takeaway'} · RM {senToRm(order.totalSen)}
                </p>
              </div>
              {order.status === 'paid' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleReprint(order)}
                    disabled={reprintingId === order.id}
                    className="text-sm font-medium text-slate-700 underline disabled:opacity-50"
                  >
                    {reprintingId === order.id ? 'Printing…' : 'Reprint'}
                  </button>
                  <button
                    onClick={() => setVoidTarget(order)}
                    className="text-sm font-medium text-red-600 underline"
                  >
                    Void
                  </button>
                </div>
              )}
            </li>
          ))}
          {orders.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">No orders yet.</li>
          )}
        </ul>
      </div>

      {voidTarget && merchantId && (
        <VoidAuthModal
          merchantId={merchantId}
          title={`Void ${voidTarget.orderNo}`}
          onClose={() => setVoidTarget(null)}
          onAuthorized={handleVoidAuthorized}
        />
      )}
    </div>
  )
}
