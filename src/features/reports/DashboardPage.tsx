import { useEffect, useState } from 'react'
import { BackofficeLayout } from '../../app/backoffice/BackofficeLayout'
import { getMyMembership, getOutlets } from '../auth/merchantApi'
import { downloadCsv, toCsv } from '../../lib/csv'
import { daysAgoLocalDateString, todayLocalDateString } from '../../lib/localDate'
import { senToRm } from '../../lib/money'
import type { Outlet } from '../../lib/types'
import { getSalesByDay, getTopItems, type DailySales, type TopItem } from './dashboardApi'

export function DashboardPage() {
  const [outlet, setOutlet] = useState<Outlet | null>(null)
  const [fromDate, setFromDate] = useState(daysAgoLocalDateString(29))
  const [toDate, setToDate] = useState(todayLocalDateString())
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMyMembership()
      .then(async (membership) => {
        if (!membership) return
        const outlets = await getOutlets(membership.merchantId)
        setOutlet(outlets[0] ?? null)
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load dashboard'),
      )
  }, [])

  useEffect(() => {
    if (!outlet) return
    let cancelled = false

    Promise.all([
      getSalesByDay(outlet.id, fromDate, toDate),
      getTopItems(outlet.id, fromDate, toDate),
    ])
      .then(([sales, items]) => {
        if (cancelled) return
        setDailySales(sales)
        setTopItems(items)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [outlet, fromDate, toDate])

  function exportDailySalesCsv() {
    const csv = toCsv(
      ['Date', 'Orders', 'Total (RM)'],
      dailySales.map((day) => [day.date, day.orderCount, senToRm(day.totalSen)]),
    )
    downloadCsv(`sales-by-day-${fromDate}-to-${toDate}.csv`, csv)
  }

  function exportTopItemsCsv() {
    const csv = toCsv(
      ['Item', 'Qty sold', 'Total (RM)'],
      topItems.map((item) => [item.name, item.qty, senToRm(item.totalSen)]),
    )
    downloadCsv(`top-items-${fromDate}-to-${toDate}.csv`, csv)
  }

  const maxDailyTotal = Math.max(1, ...dailySales.map((day) => day.totalSen))
  const grandTotalSen = dailySales.reduce((sum, day) => sum + day.totalSen, 0)
  const grandOrderCount = dailySales.reduce((sum, day) => sum + day.orderCount, 0)

  if (!outlet) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <p className="text-slate-600">{error ?? 'Loading…'}</p>
      </div>
    )
  }

  return (
    <BackofficeLayout title="Dashboard" maxWidthClassName="max-w-3xl">
      <div className="flex flex-wrap items-end gap-3 rounded border border-slate-200 bg-white p-4">
        <div>
          <label htmlFor="fromDate" className="block text-xs font-medium text-slate-700">
            From
          </label>
          <input
            id="fromDate"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="mt-1 rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="toDate" className="block text-xs font-medium text-slate-700">
            To
          </label>
          <input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="mt-1 rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-500">Total sales</p>
          <p className="text-lg font-semibold text-slate-800">RM {senToRm(grandTotalSen)}</p>
          <p className="text-xs text-slate-500">{grandOrderCount} orders</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      <section className="rounded border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Sales by day</h2>
          <button
            onClick={exportDailySalesCsv}
            disabled={dailySales.length === 0}
            className="text-sm text-slate-600 underline disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        {dailySales.length === 0 ? (
          <p className="text-sm text-slate-500">No sales in this range.</p>
        ) : (
          <>
            <div className="flex h-32 items-end gap-1">
              {dailySales.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t bg-slate-700"
                    style={{ height: `${Math.max(2, (day.totalSen / maxDailyTotal) * 100)}%` }}
                    title={`${day.date}: RM ${senToRm(day.totalSen)}`}
                  />
                </div>
              ))}
            </div>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-1 font-normal">Date</th>
                  <th className="pb-1 font-normal">Orders</th>
                  <th className="pb-1 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody>
                {dailySales.map((day) => (
                  <tr key={day.date} className="border-t border-slate-100">
                    <td className="py-1">{day.date}</td>
                    <td>{day.orderCount}</td>
                    <td className="text-right">RM {senToRm(day.totalSen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="rounded border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Top items</h2>
          <button
            onClick={exportTopItemsCsv}
            disabled={topItems.length === 0}
            className="text-sm text-slate-600 underline disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        {topItems.length === 0 ? (
          <p className="text-sm text-slate-500">No items sold in this range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-1 font-normal">#</th>
                <th className="pb-1 font-normal">Item</th>
                <th className="pb-1 text-right font-normal">Qty</th>
                <th className="pb-1 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((item, index) => (
                <tr key={item.itemId ?? item.name} className="border-t border-slate-100">
                  <td className="py-1">{index + 1}</td>
                  <td>{item.name}</td>
                  <td className="text-right">{item.qty}</td>
                  <td className="text-right">RM {senToRm(item.totalSen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </BackofficeLayout>
  )
}
