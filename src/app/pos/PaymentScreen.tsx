import { useState } from 'react'
import { calculateTotals } from '../../lib/calculateTotals'
import { isValidRmAmount, senToRm, toSen } from '../../lib/money'
import type { OrderType, PaymentMethod, Staff } from '../../lib/types'
import type { CartLine } from '../../features/ordering/cart'
import { cartSubtotalSen } from '../../features/ordering/cart'
import type { OutletTaxSettings } from '../../features/ordering/ordersApi'
import { recordPayment, type RecordPaymentResult } from '../../features/payment/paymentApi'

export function PaymentScreen({
  staff,
  merchantId,
  outletId,
  deviceId,
  receiptPrefix,
  orderId,
  type,
  tableId,
  lines,
  settings,
  cashRoundingEnabled,
  duitnowQrUrl,
  onClose,
  onPaid,
}: {
  staff: Staff
  merchantId: string
  outletId: string
  deviceId: string
  receiptPrefix: string
  orderId: string | null
  type: OrderType
  tableId: string | null
  lines: CartLine[]
  settings: OutletTaxSettings | null
  cashRoundingEnabled: boolean
  duitnowQrUrl: string | null
  onClose: () => void
  onPaid: (result: RecordPaymentResult) => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyCashRounding = method === 'cash' && cashRoundingEnabled
  const totals = calculateTotals({
    subtotalSen: cartSubtotalSen(lines),
    serviceChargeEnabled: settings?.serviceChargeEnabled ?? false,
    serviceChargeRateBp: settings?.serviceChargeRateBp ?? 0,
    sstEnabled: settings?.sstEnabled ?? false,
    sstRateBp: settings?.sstRateBp ?? 0,
    applyCashRounding,
  })

  const amountReceivedSen = isValidRmAmount(amountReceived) ? toSen(amountReceived) : null
  const changeSen = amountReceivedSen !== null ? amountReceivedSen - totals.totalSen : null
  const canConfirmCash = amountReceivedSen !== null && amountReceivedSen >= totals.totalSen
  const canConfirmQr = reference.trim().length > 0

  async function handleConfirm() {
    setError(null)
    setSubmitting(true)
    try {
      const result = await recordPayment({
        orderId,
        merchantId,
        outletId,
        deviceId,
        receiptPrefix,
        type,
        tableId,
        createdBy: staff.id,
        lines,
        settings,
        method,
        cashReceivedSen: method === 'cash' ? (amountReceivedSen ?? undefined) : undefined,
        reference: method === 'duitnow_qr' ? reference.trim() : undefined,
      })
      onPaid(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Payment</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center text-xl text-slate-500"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>RM {senToRm(totals.subtotalSen)}</span>
          </div>
          {totals.serviceChargeSen > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Service charge</span>
              <span>RM {senToRm(totals.serviceChargeSen)}</span>
            </div>
          )}
          {totals.sstSen > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>SST</span>
              <span>RM {senToRm(totals.sstSen)}</span>
            </div>
          )}
          {totals.roundingSen !== 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Rounding</span>
              <span>
                {totals.roundingSen > 0 ? '+' : ''}
                RM {senToRm(totals.roundingSen)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-slate-800">
            <span>Total</span>
            <span>RM {senToRm(totals.totalSen)}</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setMethod('cash')}
            className={`min-h-11 flex-1 rounded border px-3 py-2.5 text-sm font-medium ${
              method === 'cash'
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-300 text-slate-700'
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setMethod('duitnow_qr')}
            className={`min-h-11 flex-1 rounded border px-3 py-2.5 text-sm font-medium ${
              method === 'duitnow_qr'
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-300 text-slate-700'
            }`}
          >
            DuitNow QR
          </button>
        </div>

        {method === 'cash' ? (
          <div className="mt-4 space-y-2">
            <label htmlFor="amountReceived" className="block text-sm font-medium text-slate-700">
              Amount received (RM)
            </label>
            <input
              id="amountReceived"
              value={amountReceived}
              onChange={(event) => setAmountReceived(event.target.value)}
              inputMode="decimal"
              placeholder={senToRm(totals.totalSen)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
            {changeSen !== null && (
              <p className={`text-sm ${changeSen < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                {changeSen < 0 ? 'Insufficient' : 'Change'}: RM {senToRm(Math.abs(changeSen))}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {duitnowQrUrl ? (
              <img
                src={duitnowQrUrl}
                alt="DuitNow QR"
                className="mx-auto h-48 w-48 object-contain"
              />
            ) : (
              <p className="text-sm text-amber-700">
                No DuitNow QR set up yet. Ask the owner to add it in Settings.
              </p>
            )}
            <div>
              <label htmlFor="reference" className="block text-sm font-medium text-slate-700">
                Reference (from customer's payment confirmation)
              </label>
              <input
                id="reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={submitting || (method === 'cash' ? !canConfirmCash : !canConfirmQr)}
          className="mt-4 min-h-11 w-full rounded bg-slate-800 px-4 py-3 text-white disabled:opacity-50"
        >
          {submitting ? 'Processing…' : 'Confirm payment'}
        </button>
      </div>
    </div>
  )
}
