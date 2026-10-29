import { useState } from 'react'
import { DigitPad } from '../../components/DigitPad'
import { authorizeManagerPin } from '../../features/staff/managerAuth'
import type { Staff } from '../../lib/types'

export function VoidAuthModal({
  merchantId,
  title,
  onClose,
  onAuthorized,
}: {
  merchantId: string
  title: string
  onClose: () => void
  onAuthorized: (reason: string, authorizedBy: Staff) => void
}) {
  const [reason, setReason] = useState('')
  const [pin, setPin] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Enter a reason')
      return
    }
    setChecking(true)
    setError(null)
    const authorizedBy = await authorizeManagerPin(merchantId, pin)
    setChecking(false)

    if (!authorizedBy) {
      setError('Incorrect manager/owner PIN')
      setPin('')
      return
    }
    onAuthorized(reason.trim(), authorizedBy)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white p-5">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center text-xl text-slate-500"
          >
            ✕
          </button>
        </div>

        <div className="mt-3">
          <label htmlFor="voidReason" className="block text-sm font-medium text-slate-700">
            Reason
          </label>
          <input
            id="voidReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Customer changed order"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        <p className="mt-4 text-sm font-medium text-slate-700">Manager/owner PIN</p>
        <div className="mt-2 h-8 text-2xl tracking-widest">{'•'.repeat(pin.length)}</div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2">
          <DigitPad
            onDigit={(digit) => pin.length < 6 && setPin((current) => current + digit)}
            onBackspace={() => setPin((current) => current.slice(0, -1))}
            cornerLabel="Clear"
            onCorner={() => setPin('')}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={checking || pin.length < 4}
          className="mt-4 min-h-11 w-full rounded bg-red-700 px-4 py-3 text-white disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'Confirm void'}
        </button>
      </div>
    </div>
  )
}
