import { useState } from 'react'
import { DigitPad } from '../../components/DigitPad'
import { verifyPin } from '../../lib/pin'
import { db } from '../../lib/db'
import { useLiveQuery } from '../../lib/useLiveQuery'
import { useMerchantDevice } from '../../lib/useMerchantDevice'
import type { Staff } from '../../lib/types'
import { usePullCatalog } from '../sync/usePullCatalog'

export function PinLogin({ onLoggedIn }: { onLoggedIn: (staff: Staff) => void }) {
  const { merchantId, device, error: deviceError } = useMerchantDevice()
  usePullCatalog(merchantId, device?.outletId ?? null)

  const staffList = useLiveQuery(
    () =>
      merchantId
        ? db.staff
            .where('merchantId')
            .equals(merchantId)
            .filter((member) => member.active)
            .toArray()
        : Promise.resolve([]),
    [merchantId],
    [] as Staff[],
  )

  const [selected, setSelected] = useState<Staff | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  async function submit() {
    if (!selected) return
    setChecking(true)
    setError(null)
    const ok = await verifyPin(pin, selected.pinHash)
    setChecking(false)

    if (ok) {
      onLoggedIn(selected)
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
  }

  if (!selected) {
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <h1 className="text-xl font-semibold text-slate-800">Who's working?</h1>
        {staffList.length === 0 ? (
          <p className="text-sm text-slate-500">No active staff set up yet. Ask the owner.</p>
        ) : (
          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            {staffList.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelected(member)}
                className="min-h-11 rounded border border-slate-300 bg-white px-4 py-3 text-slate-800"
              >
                {member.name}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
      <h1 className="text-xl font-semibold text-slate-800">{selected.name}</h1>
      <div className="h-8 text-2xl tracking-widest">{'•'.repeat(pin.length)}</div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <DigitPad
        onDigit={(digit) => pin.length < 6 && setPin((current) => current + digit)}
        onBackspace={() => setPin((current) => current.slice(0, -1))}
        cornerLabel="Back"
        onCorner={() => {
          setSelected(null)
          setPin('')
          setError(null)
        }}
      />

      <button
        onClick={submit}
        disabled={checking || pin.length < 4}
        className="min-h-11 w-full max-w-sm rounded bg-slate-800 px-4 py-3 text-white disabled:opacity-50"
      >
        {checking ? 'Checking…' : 'Enter'}
      </button>
    </div>
  )
}
