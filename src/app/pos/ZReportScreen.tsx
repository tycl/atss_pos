import { useEffect, useState } from 'react'
import { formatZReport } from '../../features/printing/formatZReport'
import { printText } from '../../features/printing/printService'
import { generateZReport, type ZReport } from '../../features/reports/zReportApi'
import { usePullCatalog } from '../../features/sync/usePullCatalog'
import { db } from '../../lib/db'
import { todayLocalDateString } from '../../lib/localDate'
import { senToRm } from '../../lib/money'
import { useLiveQuery } from '../../lib/useLiveQuery'
import { useMerchantDevice } from '../../lib/useMerchantDevice'

function paymentMethodLabel(method: string): string {
  return method === 'cash' ? 'Cash' : 'DuitNow QR'
}

export function ZReportScreen({ onBack }: { onBack: () => void }) {
  const { merchantId, device, error: deviceError } = useMerchantDevice()
  usePullCatalog(merchantId, device?.outletId ?? null)

  const outlet = useLiveQuery(
    () => (device ? db.outlets.get(device.outletId) : Promise.resolve(undefined)),
    [device],
    undefined,
  )

  const [date, setDate] = useState(todayLocalDateString())
  const [report, setReport] = useState<ZReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!device) return
    let cancelled = false

    generateZReport(device.outletId, date)
      .then((result) => {
        if (cancelled) return
        setReport(result)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to generate report')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [device, date])

  async function handlePrint() {
    if (!report || !outlet) return
    setPrinting(true)
    setError(null)
    try {
      await printText(formatZReport(report, outlet.name))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to print report')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <button onClick={onBack} className="text-sm text-slate-600 underline">
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-slate-800">Daily sales (Z) report</h1>
        </div>

        <div className="flex items-center gap-3 rounded border border-slate-200 bg-white p-4">
          <label htmlFor="reportDate" className="text-sm font-medium text-slate-700">
            Date
          </label>
          <input
            id="reportDate"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
          <button
            onClick={handlePrint}
            disabled={printing || !report || !outlet}
            className="ml-auto rounded bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {printing ? 'Printing…' : 'Print'}
          </button>
        </div>

        {(error ?? deviceError) && <p className="text-sm text-red-600">{error ?? deviceError}</p>}

        {loading && <p className="text-sm text-slate-500">Loading…</p>}

        {report && !loading && (
          <div className="space-y-4">
            <div className="rounded border border-slate-200 bg-white p-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Orders</span>
                <span>{report.orderCount}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>RM {senToRm(report.subtotalSen)}</span>
              </div>
              {report.serviceChargeSen > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Service charge</span>
                  <span>RM {senToRm(report.serviceChargeSen)}</span>
                </div>
              )}
              {report.sstSen > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>SST</span>
                  <span>RM {senToRm(report.sstSen)}</span>
                </div>
              )}
              {report.roundingSen !== 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Rounding</span>
                  <span>
                    {report.roundingSen > 0 ? '+' : ''}
                    RM {senToRm(report.roundingSen)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-slate-800">
                <span>Total</span>
                <span>RM {senToRm(report.totalSen)}</span>
              </div>
            </div>

            <div className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">By payment method</h2>
              {report.byPaymentMethod.length === 0 && (
                <p className="text-sm text-slate-500">No sales</p>
              )}
              {report.byPaymentMethod.map((entry) => (
                <div key={entry.method} className="flex justify-between text-sm text-slate-600">
                  <span>
                    {paymentMethodLabel(entry.method)} ({entry.count})
                  </span>
                  <span>RM {senToRm(entry.totalSen)}</span>
                </div>
              ))}
            </div>

            <div className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">By item</h2>
              {report.byItem.length === 0 && (
                <p className="text-sm text-slate-500">No items sold</p>
              )}
              {report.byItem.map((entry) => (
                <div
                  key={entry.itemId ?? entry.name}
                  className="flex justify-between text-sm text-slate-600"
                >
                  <span>
                    {entry.qty} x {entry.name}
                  </span>
                  <span>RM {senToRm(entry.totalSen)}</span>
                </div>
              ))}
            </div>

            <div className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">By category</h2>
              {report.byCategory.length === 0 && (
                <p className="text-sm text-slate-500">No items sold</p>
              )}
              {report.byCategory.map((entry) => (
                <div
                  key={entry.categoryId ?? 'uncategorized'}
                  className="flex justify-between text-sm text-slate-600"
                >
                  <span>{entry.name}</span>
                  <span>RM {senToRm(entry.totalSen)}</span>
                </div>
              ))}
            </div>

            <div className="rounded border border-slate-200 bg-white p-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Voids ({report.voidCount})</span>
                <span>RM {senToRm(report.voidTotalSen)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
