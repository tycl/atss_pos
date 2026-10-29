import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createTable } from '../../features/ordering/tablesApi'
import { voidOrder } from '../../features/ordering/ordersApi'
import { pullCatalog } from '../../features/sync/pullCatalog'
import { usePullCatalog } from '../../features/sync/usePullCatalog'
import { db } from '../../lib/db'
import { senToRm } from '../../lib/money'
import type { Order, Shift, Staff } from '../../lib/types'
import { useLiveQuery } from '../../lib/useLiveQuery'
import { useMerchantDevice } from '../../lib/useMerchantDevice'
import { CloseShiftModal } from './CloseShiftModal'
import { OpenShiftScreen } from './OpenShiftScreen'
import type { OrderContext } from './PosHome'
import { VoidAuthModal } from './VoidAuthModal'

export function OpenOrdersScreen({
  staff,
  onOpenOrder,
  onOpenHistory,
  onOpenZReport,
}: {
  staff: Staff
  onOpenOrder: (context: OrderContext) => void
  onOpenHistory: () => void
  onOpenZReport: () => void
}) {
  const { merchantId, device, error: deviceError } = useMerchantDevice()
  const [newTableName, setNewTableName] = useState('')
  const [addingTable, setAddingTable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voidTarget, setVoidTarget] = useState<Order | null>(null)
  const [closingShift, setClosingShift] = useState(false)

  usePullCatalog(merchantId, device?.outletId ?? null)

  const openShift = useLiveQuery(
    () =>
      device
        ? db.shifts
            .where('deviceId')
            .equals(device.deviceId)
            .filter((shift) => shift.closedAt === null)
            .first()
        : Promise.resolve(undefined),
    [device],
    undefined as Shift | undefined,
  )

  const tables = useLiveQuery(
    () =>
      device
        ? db.diningTables.where('outletId').equals(device.outletId).sortBy('sortOrder')
        : Promise.resolve([]),
    [device],
    [],
  )

  const openOrders = useLiveQuery(
    () =>
      device
        ? db.orders
            .where('outletId')
            .equals(device.outletId)
            .filter((order) => order.status === 'open')
            .toArray()
        : Promise.resolve([]),
    [device],
    [] as Order[],
  )

  function orderForTable(tableId: string) {
    return openOrders.find((order) => order.type === 'dine_in' && order.tableId === tableId)
  }

  const takeawayOrders = openOrders.filter((order) => order.type === 'takeaway')

  async function handleAddTable(event: FormEvent) {
    event.preventDefault()
    if (!merchantId || !device) return
    setAddingTable(true)
    setError(null)
    try {
      await createTable(merchantId, device.outletId, newTableName)
      await pullCatalog(merchantId, device.outletId)
      setNewTableName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add table')
    } finally {
      setAddingTable(false)
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

  if (merchantId && device && !openShift) {
    return (
      <OpenShiftScreen
        staff={staff}
        merchantId={merchantId}
        outletId={device.outletId}
        deviceId={device.deviceId}
        onOpened={() => {}}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">ATSS POS</h1>
          <div className="flex items-center gap-3">
            <button onClick={onOpenHistory} className="text-sm text-slate-600 underline">
              Order history
            </button>
            <button onClick={onOpenZReport} className="text-sm text-slate-600 underline">
              Z report
            </button>
            {openShift && (
              <button
                onClick={() => setClosingShift(true)}
                className="text-sm text-slate-600 underline"
              >
                Close shift
              </button>
            )}
            {(staff.role === 'owner' || staff.role === 'manager') && (
              <Link to="/backoffice/dashboard" className="text-sm text-slate-600 underline">
                Back office
              </Link>
            )}
            <span className="text-sm text-slate-600">
              {staff.name} · {staff.role}
            </span>
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-medium text-slate-800">Tables</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {tables.map((table) => {
              const order = orderForTable(table.id)
              return (
                <div
                  key={table.id}
                  className={`relative flex h-20 flex-col items-center justify-center rounded border p-3 text-center ${
                    order
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  <button
                    onClick={() =>
                      onOpenOrder({
                        orderId: order?.id ?? null,
                        type: 'dine_in',
                        tableId: table.id,
                      })
                    }
                    className="flex h-full w-full flex-col items-center justify-center"
                  >
                    <span className="font-medium">{table.name}</span>
                    {order ? (
                      <span className="text-xs">RM {senToRm(order.totalSen)}</span>
                    ) : (
                      <span className="text-xs text-slate-400">Empty</span>
                    )}
                  </button>
                  {order && (
                    <button
                      onClick={() => setVoidTarget(order)}
                      className="absolute top-0 right-0 px-2.5 py-2.5 text-xs text-red-600 underline"
                    >
                      Void
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <form onSubmit={handleAddTable} className="mt-3 flex gap-2">
            <input
              required
              value={newTableName}
              onChange={(event) => setNewTableName(event.target.value)}
              placeholder="New table name, e.g. T5"
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={addingTable || !device}
              className="rounded bg-slate-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Add table
            </button>
          </form>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-800">Takeaway</h2>
            <button
              onClick={() => onOpenOrder({ orderId: null, type: 'takeaway', tableId: null })}
              className="min-h-11 rounded bg-slate-800 px-3 py-2.5 text-sm text-white"
            >
              + New takeaway
            </button>
          </div>

          <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
            {takeawayOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() =>
                    onOpenOrder({ orderId: order.id, type: 'takeaway', tableId: null })
                  }
                  className="flex flex-1 items-center justify-between text-left"
                >
                  <span className="text-slate-800">{order.orderNo}</span>
                  <span className="text-sm text-slate-600">RM {senToRm(order.totalSen)}</span>
                </button>
                <button
                  onClick={() => setVoidTarget(order)}
                  className="ml-3 px-2 py-2 text-sm text-red-600 underline"
                >
                  Void
                </button>
              </li>
            ))}
            {takeawayOrders.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500">No held takeaway orders.</li>
            )}
          </ul>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {voidTarget && merchantId && (
        <VoidAuthModal
          merchantId={merchantId}
          title={`Void ${voidTarget.orderNo}`}
          onClose={() => setVoidTarget(null)}
          onAuthorized={handleVoidAuthorized}
        />
      )}

      {closingShift && openShift && (
        <CloseShiftModal
          shift={openShift}
          staff={staff}
          onClose={() => setClosingShift(false)}
          onClosed={() => setClosingShift(false)}
        />
      )}
    </div>
  )
}
