import { useEffect, useState } from 'react'
import { calculateTotals } from '../../lib/calculateTotals'
import { db } from '../../lib/db'
import { senToRm } from '../../lib/money'
import type { Item, Modifier, Staff } from '../../lib/types'
import { useLiveQuery } from '../../lib/useLiveQuery'
import { useMerchantDevice } from '../../lib/useMerchantDevice'
import { computeLineTotalSen, type CartLine } from '../../features/ordering/cart'
import { getOrderLines, holdOrder, orderLineToCartLine } from '../../features/ordering/ordersApi'
import type { RecordPaymentResult } from '../../features/payment/paymentApi'
import { buildKitchenTicketText, buildReceiptText } from '../../features/printing/buildTickets'
import { printText } from '../../features/printing/printService'
import { usePullCatalog } from '../../features/sync/usePullCatalog'
import { Cart } from './Cart'
import { ALL_CATEGORIES, CategoryTabs } from './CategoryTabs'
import { ItemGrid } from './ItemGrid'
import { ItemModal } from './ItemModal'
import { PaymentScreen } from './PaymentScreen'
import type { OrderContext } from './PosHome'

export function PosScreen({
  staff,
  orderContext,
  onDone,
}: {
  staff: Staff
  orderContext: OrderContext
  onDone: () => void
}) {
  const { merchantId, device, error: deviceError } = useMerchantDevice()
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const [cart, setCart] = useState<CartLine[]>([])
  const [activeItem, setActiveItem] = useState<Item | null>(null)
  const [holding, setHolding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [paidResult, setPaidResult] = useState<RecordPaymentResult | null>(null)

  useEffect(() => {
    if (!orderContext.orderId) return
    getOrderLines(orderContext.orderId).then((lines) => setCart(lines.map(orderLineToCartLine)))
  }, [orderContext.orderId])

  usePullCatalog(merchantId, device?.outletId ?? null)

  const categories = useLiveQuery(
    () =>
      merchantId
        ? db.categories.where('merchantId').equals(merchantId).sortBy('sortOrder')
        : Promise.resolve([]),
    [merchantId],
    [],
  )
  const items = useLiveQuery(
    () =>
      merchantId
        ? db.items.where('merchantId').equals(merchantId).sortBy('sortOrder')
        : Promise.resolve([]),
    [merchantId],
    [],
  )
  const modifierGroups = useLiveQuery(
    () =>
      merchantId
        ? db.modifierGroups.where('merchantId').equals(merchantId).toArray()
        : Promise.resolve([]),
    [merchantId],
    [],
  )
  const modifiers = useLiveQuery(
    () =>
      merchantId
        ? db.modifiers.where('merchantId').equals(merchantId).toArray()
        : Promise.resolve([]),
    [merchantId],
    [],
  )
  const itemModifierGroups = useLiveQuery(
    () =>
      merchantId
        ? db.itemModifierGroups.where('merchantId').equals(merchantId).toArray()
        : Promise.resolve([]),
    [merchantId],
    [],
  )
  const settings = useLiveQuery(
    () => (device ? db.settings.get(device.outletId) : Promise.resolve(undefined)),
    [device],
    undefined,
  )
  const table = useLiveQuery(
    () =>
      orderContext.tableId ? db.diningTables.get(orderContext.tableId) : Promise.resolve(undefined),
    [orderContext.tableId],
    undefined,
  )
  const merchant = useLiveQuery(
    () => (merchantId ? db.merchants.get(merchantId) : Promise.resolve(undefined)),
    [merchantId],
    undefined,
  )
  const outlet = useLiveQuery(
    () => (device ? db.outlets.get(device.outletId) : Promise.resolve(undefined)),
    [device],
    undefined,
  )

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

  const visibleItems = items.filter(
    (item) =>
      item.active && (selectedCategory === ALL_CATEGORIES || item.categoryId === selectedCategory),
  )

  const modifiersByGroup = new Map<string, Modifier[]>()
  for (const modifier of modifiers) {
    const list = modifiersByGroup.get(modifier.groupId) ?? []
    list.push(modifier)
    modifiersByGroup.set(modifier.groupId, list)
  }

  function groupsForItem(itemId: string) {
    const groupIds = itemModifierGroups
      .filter((link) => link.itemId === itemId)
      .map((link) => link.groupId)
    return modifierGroups.filter((group) => groupIds.includes(group.id))
  }

  function addToCart(line: Omit<CartLine, 'id'>) {
    setCart((current) => [...current, { ...line, id: crypto.randomUUID() }])
    setActiveItem(null)
  }

  function changeQty(lineId: string, qty: number) {
    setCart((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              qty,
              lineTotalSen: computeLineTotalSen(line.unitPriceSen, line.modifiers, qty),
            }
          : line,
      ),
    )
  }

  function removeLine(lineId: string) {
    setCart((current) => current.filter((line) => line.id !== lineId))
  }

  const totals = calculateTotals({
    subtotalSen: cart.reduce((sum, line) => sum + line.lineTotalSen, 0),
    serviceChargeEnabled: settings?.serviceChargeEnabled ?? false,
    serviceChargeRateBp: settings?.serviceChargeRateBp ?? 0,
    sstEnabled: settings?.sstEnabled ?? false,
    sstRateBp: settings?.sstRateBp ?? 0,
    applyCashRounding: false,
  })

  async function printKitchenTicket(orderNo: string) {
    try {
      const text = buildKitchenTicketText(orderNo, orderContext.type, table?.name ?? null, cart)
      await printText(text)
    } catch (err) {
      console.error('Kitchen ticket print failed', err)
    }
  }

  async function handleHold() {
    if (!merchantId || !device) return
    setHolding(true)
    setError(null)
    try {
      const order = await holdOrder({
        orderId: orderContext.orderId,
        merchantId,
        outletId: device.outletId,
        deviceId: device.deviceId,
        receiptPrefix: device.receiptPrefix,
        type: orderContext.type,
        tableId: orderContext.tableId,
        createdBy: staff.id,
        lines: cart,
        settings: settings ?? null,
      })
      await printKitchenTicket(order.orderNo)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hold order')
    } finally {
      setHolding(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <button onClick={onDone} className="text-sm text-slate-600 underline">
              ← Back
            </button>
            <h1 className="text-xl font-semibold text-slate-800">
              {orderContext.type === 'dine_in' ? (table?.name ?? 'Table') : 'Takeaway'}
            </h1>
          </div>
          <span className="text-sm text-slate-600">
            {staff.name} · {staff.role}
          </span>
        </div>
        <CategoryTabs
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <div className="mt-4">
          <ItemGrid items={visibleItems} onSelect={setActiveItem} />
        </div>
      </div>

      <div className="flex w-80 flex-col border-l border-slate-200 bg-white p-4">
        <div className="flex-1 overflow-y-auto">
          <Cart lines={cart} onChangeQty={changeQty} onRemove={removeLine} />
        </div>

        <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
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
          <div className="flex justify-between text-base font-semibold text-slate-800">
            <span>Total</span>
            <span>RM {senToRm(totals.totalSen)}</span>
          </div>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleHold}
            disabled={holding || cart.length === 0 || !device}
            className="min-h-11 flex-1 rounded border border-slate-300 px-4 py-3 text-slate-700 disabled:opacity-50"
          >
            {holding ? 'Holding…' : 'Hold'}
          </button>
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0 || !device}
            className="min-h-11 flex-1 rounded bg-slate-800 px-4 py-3 text-white disabled:opacity-50"
          >
            Pay
          </button>
        </div>
      </div>

      {activeItem && (
        <ItemModal
          item={activeItem}
          groups={groupsForItem(activeItem.id)}
          modifiersByGroup={modifiersByGroup}
          onAdd={addToCart}
          onClose={() => setActiveItem(null)}
        />
      )}

      {showPayment && device && merchantId && (
        <PaymentScreen
          staff={staff}
          merchantId={merchantId}
          outletId={device.outletId}
          deviceId={device.deviceId}
          receiptPrefix={device.receiptPrefix}
          orderId={orderContext.orderId}
          type={orderContext.type}
          tableId={orderContext.tableId}
          lines={cart}
          settings={settings ?? null}
          cashRoundingEnabled={settings?.cashRoundingEnabled ?? true}
          duitnowQrUrl={merchant?.duitnowQrUrl ?? null}
          onClose={() => setShowPayment(false)}
          onPaid={async (result) => {
            setShowPayment(false)
            setPaidResult(result)
            await printKitchenTicket(result.order.orderNo)
            if (merchant) {
              try {
                const text = buildReceiptText({
                  result,
                  merchant,
                  receiptFooter: outlet?.receiptFooter ?? null,
                  cashierName: staff.name,
                  sstEnabled: settings?.sstEnabled ?? false,
                  lines: cart,
                })
                await printText(text, result.payment.method === 'cash')
              } catch (err) {
                console.error('Receipt print failed', err)
              }
            }
          }}
        />
      )}

      {paidResult && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 text-center">
            <h2 className="text-lg font-semibold text-slate-800">Payment received</h2>
            <p className="mt-1 text-sm text-slate-600">{paidResult.order.orderNo}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-800">
              RM {senToRm(paidResult.order.totalSen)}
            </p>
            {paidResult.payment.method === 'cash' && paidResult.payment.changeSen !== null && (
              <p className="mt-1 text-sm text-slate-600">
                Change: RM {senToRm(paidResult.payment.changeSen)}
              </p>
            )}
            <button
              onClick={onDone}
              className="mt-4 min-h-11 w-full rounded bg-slate-800 px-4 py-3 text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
