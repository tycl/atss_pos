import { useState, type FormEvent } from 'react'
import { openShift } from '../../features/shift/shiftsApi'
import { isValidRmAmount, toSen } from '../../lib/money'
import type { Shift, Staff } from '../../lib/types'

export function OpenShiftScreen({
  staff,
  merchantId,
  outletId,
  deviceId,
  onOpened,
}: {
  staff: Staff
  merchantId: string
  outletId: string
  deviceId: string
  onOpened: (shift: Shift) => void
}) {
  const [floatAmount, setFloatAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!isValidRmAmount(floatAmount)) {
      setError('Enter a valid amount, e.g. 100 or 100.50')
      return
    }
    setSubmitting(true)
    try {
      const shift = await openShift({
        merchantId,
        outletId,
        deviceId,
        openedBy: staff.id,
        openingFloatSen: toSen(floatAmount),
      })
      onOpened(shift)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open shift')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-slate-800">Open shift</h1>
        <p className="text-sm text-slate-600">
          {staff.name}, enter the starting cash float to begin taking orders.
        </p>

        <div>
          <label htmlFor="floatAmount" className="block text-sm font-medium text-slate-700">
            Opening float (RM)
          </label>
          <input
            id="floatAmount"
            value={floatAmount}
            onChange={(event) => setFloatAmount(event.target.value)}
            inputMode="decimal"
            placeholder="100.00"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Opening…' : 'Open shift'}
        </button>
      </form>
    </div>
  )
}
