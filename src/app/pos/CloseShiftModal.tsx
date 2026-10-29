import { useEffect, useState } from 'react'
import { closeShift, computeExpectedCashSen } from '../../features/shift/shiftsApi'
import { isValidRmAmount, senToRm, toSen } from '../../lib/money'
import type { Shift, Staff } from '../../lib/types'

export function CloseShiftModal({
  shift,
  staff,
  onClose,
  onClosed,
}: {
  shift: Shift
  staff: Staff
  onClose: () => void
  onClosed: (shift: Shift) => void
}) {
  const [expectedSen, setExpectedSen] = useState<number | null>(null)
  const [countedCash, setCountedCash] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    computeExpectedCashSen(shift).then(setExpectedSen)
  }, [shift])

  const countedSen = isValidRmAmount(countedCash) ? toSen(countedCash) : null
  const varianceSen = countedSen !== null && expectedSen !== null ? countedSen - expectedSen : null

  async function handleSubmit() {
    if (countedSen === null) {
      setError('Enter the counted cash amount')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const closed = await closeShift({
        shiftId: shift.id,
        closedBy: staff.id,
        countedCashSen: countedSen,
      })
      onClosed(closed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close shift')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white p-5">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Close shift</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center text-xl text-slate-500"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 space-y-1 text-sm text-slate-600">
          <p>Opening float: RM {senToRm(shift.openingFloatSen)}</p>
          <p>
            Expected cash: {expectedSen === null ? 'Calculating…' : `RM ${senToRm(expectedSen)}`}
          </p>
        </div>

        <div className="mt-3">
          <label htmlFor="countedCash" className="block text-sm font-medium text-slate-700">
            Counted cash (RM)
          </label>
          <input
            id="countedCash"
            value={countedCash}
            onChange={(event) => setCountedCash(event.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        {varianceSen !== null && (
          <p
            className={`mt-2 text-sm font-medium ${
              varianceSen < 0
                ? 'text-red-600'
                : varianceSen > 0
                  ? 'text-amber-600'
                  : 'text-green-700'
            }`}
          >
            Variance: {varianceSen > 0 ? '+' : ''}
            RM {senToRm(varianceSen)}
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || countedSen === null || expectedSen === null}
          className="mt-4 min-h-11 w-full rounded bg-slate-800 px-4 py-3 text-white disabled:opacity-50"
        >
          {submitting ? 'Closing…' : 'Confirm close'}
        </button>
      </div>
    </div>
  )
}
