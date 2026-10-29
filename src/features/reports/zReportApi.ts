import { db } from '../../lib/db'
import type { PaymentMethod } from '../../lib/types'

export type PaymentMethodTotal = { method: PaymentMethod; count: number; totalSen: number }
export type ItemSalesTotal = { itemId: string | null; name: string; qty: number; totalSen: number }
export type CategorySalesTotal = { categoryId: string | null; name: string; totalSen: number }

export type ZReport = {
  date: string
  outletId: string
  orderCount: number
  subtotalSen: number
  serviceChargeSen: number
  sstSen: number
  roundingSen: number
  totalSen: number
  byPaymentMethod: PaymentMethodTotal[]
  byItem: ItemSalesTotal[]
  byCategory: CategorySalesTotal[]
  voidCount: number
  voidTotalSen: number
}

/** All sales for one calendar day at an outlet, read entirely from the
 * local Dexie cache so the Z report works offline -- orders are keyed by
 * the day they were created, in the device's own local time. */
export async function generateZReport(outletId: string, dateStr: string): Promise<ZReport> {
  const dayStartMs = new Date(`${dateStr}T00:00:00`).getTime()
  const dayEndMs = new Date(`${dateStr}T23:59:59.999`).getTime()

  const allOrders = await db.orders.where('outletId').equals(outletId).toArray()
  const ordersInRange = allOrders.filter((order) => {
    const createdMs = new Date(order.createdAt).getTime()
    return createdMs >= dayStartMs && createdMs <= dayEndMs
  })

  const paidOrders = ordersInRange.filter((order) => order.status === 'paid')
  const voidOrders = ordersInRange.filter((order) => order.status === 'void')
  const paidOrderIds = paidOrders.map((order) => order.id)

  const [payments, lines] = await Promise.all([
    paidOrderIds.length ? db.payments.where('orderId').anyOf(paidOrderIds).toArray() : [],
    paidOrderIds.length
      ? db.orderLines
          .where('orderId')
          .anyOf(paidOrderIds)
          .filter((line) => line.status === 'active')
          .toArray()
      : [],
  ])

  const byPaymentMethodMap = new Map<PaymentMethod, { count: number; totalSen: number }>()
  for (const payment of payments) {
    const entry = byPaymentMethodMap.get(payment.method) ?? { count: 0, totalSen: 0 }
    entry.count += 1
    entry.totalSen += payment.amountSen
    byPaymentMethodMap.set(payment.method, entry)
  }
  const byPaymentMethod: PaymentMethodTotal[] = [...byPaymentMethodMap.entries()].map(
    ([method, totals]) => ({ method, ...totals }),
  )

  const byItemMap = new Map<string, ItemSalesTotal>()
  for (const line of lines) {
    const key = line.itemId ?? `name:${line.nameSnapshot}`
    const entry = byItemMap.get(key) ?? {
      itemId: line.itemId,
      name: line.nameSnapshot,
      qty: 0,
      totalSen: 0,
    }
    entry.qty += line.qty
    entry.totalSen += line.lineTotalSen
    byItemMap.set(key, entry)
  }
  const byItem = [...byItemMap.values()].sort((a, b) => b.totalSen - a.totalSen)

  const itemIds = [...new Set(lines.map((line) => line.itemId).filter((id): id is string => !!id))]
  const items = itemIds.length ? await db.items.bulkGet(itemIds) : []
  const itemCategoryId = new Map(
    items.filter((item) => item).map((item) => [item!.id, item!.categoryId]),
  )

  const categoryIds = [...new Set([...itemCategoryId.values()].filter((id): id is string => !!id))]
  const categories = categoryIds.length ? await db.categories.bulkGet(categoryIds) : []
  const categoryName = new Map(categories.filter((c) => c).map((c) => [c!.id, c!.name]))

  const byCategoryMap = new Map<string, CategorySalesTotal>()
  for (const line of lines) {
    const categoryId = line.itemId ? (itemCategoryId.get(line.itemId) ?? null) : null
    const key = categoryId ?? 'uncategorized'
    const entry = byCategoryMap.get(key) ?? {
      categoryId,
      name: categoryId ? (categoryName.get(categoryId) ?? 'Unknown') : 'Uncategorized',
      totalSen: 0,
    }
    entry.totalSen += line.lineTotalSen
    byCategoryMap.set(key, entry)
  }
  const byCategory = [...byCategoryMap.values()].sort((a, b) => b.totalSen - a.totalSen)

  return {
    date: dateStr,
    outletId,
    orderCount: paidOrders.length,
    subtotalSen: paidOrders.reduce((sum, order) => sum + order.subtotalSen, 0),
    serviceChargeSen: paidOrders.reduce((sum, order) => sum + order.serviceChargeSen, 0),
    sstSen: paidOrders.reduce((sum, order) => sum + order.sstSen, 0),
    roundingSen: paidOrders.reduce((sum, order) => sum + order.roundingSen, 0),
    totalSen: paidOrders.reduce((sum, order) => sum + order.totalSen, 0),
    byPaymentMethod,
    byItem,
    byCategory,
    voidCount: voidOrders.length,
    voidTotalSen: voidOrders.reduce((sum, order) => sum + order.totalSen, 0),
  }
}
