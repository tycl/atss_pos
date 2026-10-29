import { useState, type FormEvent } from 'react'
import { isValidRmAmount, percentToBp } from '../../lib/money'
import { isValidPin } from '../../lib/pin'
import { upsertSettings } from '../settings/settingsApi'
import { createStaff } from '../staff/staffApi'
import { createMerchantAndOutlet } from './merchantApi'

type Step = 'business' | 'settings' | 'pin' | 'done'

const STEP_NUMBER: Record<Step, number> = { business: 1, settings: 2, pin: 3, done: 3 }

function StepHeading({ step, title }: { step: Step; title: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
        Step {STEP_NUMBER[step]} of 3
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-800">{title}</h1>
    </div>
  )
}

/** First-run setup for a brand-new merchant: creates the tenant + outlet,
 * lets the owner set tax/service-charge defaults, then has them create their
 * own PIN so they can walk straight into the POS afterward. */
export function OnboardingWizard({ onComplete }: { onComplete: () => Promise<void> | void }) {
  const [step, setStep] = useState<Step>('business')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [merchantName, setMerchantName] = useState('')
  const [outletName, setOutletName] = useState('')

  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [outletId, setOutletId] = useState<string | null>(null)

  const [sstEnabled, setSstEnabled] = useState(false)
  const [sstRate, setSstRate] = useState('6')
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false)
  const [serviceChargeRate, setServiceChargeRate] = useState('10')
  const [cashRoundingEnabled, setCashRoundingEnabled] = useState(true)

  const [ownerName, setOwnerName] = useState('')
  const [pin, setPin] = useState('')

  async function handleBusinessSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { merchant, outlet } = await createMerchantAndOutlet(merchantName, outletName)
      setMerchantId(merchant.id)
      setOutletId(outlet.id)
      setStep('settings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSettingsSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!merchantId || !outletId) return
    if (!isValidRmAmount(sstRate) || !isValidRmAmount(serviceChargeRate)) {
      setError('Enter valid percentages, e.g. 6 or 10')
      return
    }

    setSubmitting(true)
    try {
      await upsertSettings(merchantId, outletId, {
        sstEnabled,
        sstRateBp: percentToBp(sstRate),
        serviceChargeEnabled,
        serviceChargeRateBp: percentToBp(serviceChargeRate),
        cashRoundingEnabled,
      })
      setStep('pin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePinSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!merchantId) return
    if (!isValidPin(pin)) {
      setError('PIN must be 4 to 6 digits')
      return
    }

    setSubmitting(true)
    try {
      await createStaff(merchantId, ownerName.trim() || 'Owner', 'owner', pin)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create your PIN')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'business') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <form onSubmit={handleBusinessSubmit} className="w-full max-w-sm space-y-4">
          <StepHeading step={step} title="Set up your business" />

          <div>
            <label htmlFor="merchantName" className="block text-sm font-medium text-slate-700">
              Business name
            </label>
            <input
              id="merchantName"
              required
              value={merchantName}
              onChange={(event) => setMerchantName(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="outletName" className="block text-sm font-medium text-slate-700">
              First outlet name
            </label>
            <input
              id="outletName"
              required
              value={outletName}
              onChange={(event) => setOutletName(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              placeholder="e.g. Main branch"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded bg-slate-800 px-4 py-3 text-white disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Continue'}
          </button>
        </form>
      </div>
    )
  }

  if (step === 'settings') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <form onSubmit={handleSettingsSubmit} className="w-full max-w-sm space-y-6">
          <StepHeading step={step} title="Tax & service charge" />
          <p className="text-sm text-slate-600">
            You can change these later in Settings. Most kopitiams and cafés leave both off.
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={sstEnabled}
                onChange={(event) => setSstEnabled(event.target.checked)}
              />
              SST
            </label>
            <div className="flex items-center gap-2">
              <input
                value={sstRate}
                onChange={(event) => setSstRate(event.target.value)}
                disabled={!sstEnabled}
                inputMode="decimal"
                className="w-24 rounded border border-slate-300 px-3 py-2 disabled:opacity-50"
              />
              <span className="text-sm text-slate-600">%</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={serviceChargeEnabled}
                onChange={(event) => setServiceChargeEnabled(event.target.checked)}
              />
              Service charge
            </label>
            <div className="flex items-center gap-2">
              <input
                value={serviceChargeRate}
                onChange={(event) => setServiceChargeRate(event.target.value)}
                disabled={!serviceChargeEnabled}
                inputMode="decimal"
                className="w-24 rounded border border-slate-300 px-3 py-2 disabled:opacity-50"
              />
              <span className="text-sm text-slate-600">%</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={cashRoundingEnabled}
              onChange={(event) => setCashRoundingEnabled(event.target.checked)}
            />
            Round cash payments to nearest 5 sen
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded bg-slate-800 px-4 py-3 text-white disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    )
  }

  if (step === 'pin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <form onSubmit={handlePinSubmit} className="w-full max-w-sm space-y-4">
          <StepHeading step={step} title="Create your PIN" />
          <p className="text-sm text-slate-600">
            You'll use this to log into the till. You can add other staff later.
          </p>

          <div>
            <label htmlFor="ownerName" className="block text-sm font-medium text-slate-700">
              Your name
            </label>
            <input
              id="ownerName"
              required
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="ownerPin" className="block text-sm font-medium text-slate-700">
              PIN (4–6 digits)
            </label>
            <input
              id="ownerPin"
              inputMode="numeric"
              pattern="\d{4,6}"
              required
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded bg-slate-800 px-4 py-3 text-white disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create my PIN'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <h1 className="text-2xl font-semibold text-slate-800">You're all set</h1>
      <p className="max-w-sm text-sm text-slate-600">
        Your business is ready. Add your menu and the rest of your team from the back office
        whenever you're ready -- for now, let's get you to the till.
      </p>
      <button
        onClick={() => void onComplete()}
        className="min-h-11 w-full max-w-sm rounded bg-slate-800 px-4 py-3 text-white"
      >
        Go to POS
      </button>
    </div>
  )
}
