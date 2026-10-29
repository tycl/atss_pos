import { useEffect, useState, type FormEvent } from 'react'
import { BackofficeLayout } from '../../app/backoffice/BackofficeLayout'
import { getMerchant, getMyMembership, getOutlets, updateDuitnowQrUrl } from '../auth/merchantApi'
import { bpToPercent, isValidRmAmount, percentToBp } from '../../lib/money'
import type { Merchant, Outlet } from '../../lib/types'
import { PrinterSettingsSection } from './PrinterSettingsSection'
import { getSettings, upsertSettings } from './settingsApi'

export function SettingsPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [outlet, setOutlet] = useState<Outlet | null>(null)
  const [merchant, setMerchant] = useState<Merchant | null>(null)

  const [sstEnabled, setSstEnabled] = useState(false)
  const [sstRate, setSstRate] = useState('6')
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false)
  const [serviceChargeRate, setServiceChargeRate] = useState('10')
  const [cashRoundingEnabled, setCashRoundingEnabled] = useState(true)
  const [duitnowQrUrl, setDuitnowQrUrl] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getMyMembership()
      .then(async (membership) => {
        if (!membership) return
        setMerchantId(membership.merchantId)

        const [outlets, merchantRow] = await Promise.all([
          getOutlets(membership.merchantId),
          getMerchant(membership.merchantId),
        ])

        const firstOutlet = outlets[0] ?? null
        const settings = firstOutlet ? await getSettings(firstOutlet.id) : null

        setOutlet(firstOutlet)
        setMerchant(merchantRow)
        setDuitnowQrUrl(merchantRow.duitnowQrUrl ?? '')

        if (settings) {
          setSstEnabled(settings.sstEnabled)
          setSstRate(bpToPercent(settings.sstRateBp))
          setServiceChargeEnabled(settings.serviceChargeEnabled)
          setServiceChargeRate(bpToPercent(settings.serviceChargeRateBp))
          setCashRoundingEnabled(settings.cashRoundingEnabled)
        }
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load settings'),
      )
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)

    if (!merchantId || !outlet) return
    if (!isValidRmAmount(sstRate) || !isValidRmAmount(serviceChargeRate)) {
      setError('Enter valid percentages, e.g. 6 or 10')
      return
    }

    setSaving(true)
    try {
      await upsertSettings(merchantId, outlet.id, {
        sstEnabled,
        sstRateBp: percentToBp(sstRate),
        serviceChargeEnabled,
        serviceChargeRateBp: percentToBp(serviceChargeRate),
        cashRoundingEnabled,
      })
      await updateDuitnowQrUrl(merchantId, duitnowQrUrl.trim() || null)
      if (merchant) setMerchant({ ...merchant, duitnowQrUrl: duitnowQrUrl.trim() || null })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (!outlet) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <p className="text-slate-600">{error ?? 'Loading…'}</p>
        {error && (
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-slate-800 px-4 py-2 text-white"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <BackofficeLayout title="Settings" maxWidthClassName="max-w-xl">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded border border-slate-200 bg-white p-4"
      >
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

        <div>
          <label htmlFor="qrUrl" className="block text-sm font-medium text-slate-700">
            DuitNow QR image URL
          </label>
          <input
            id="qrUrl"
            value={duitnowQrUrl}
            onChange={(event) => setDuitnowQrUrl(event.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-slate-500">
            A link to your bank's static DuitNow QR image, shown to customers at checkout.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-700">Saved.</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <PrinterSettingsSection />
    </BackofficeLayout>
  )
}
