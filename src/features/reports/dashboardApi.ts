import { toLocalDateString } from '../../lib/localDate'
import { supabase } from '../../lib/supabaseClient'

export type DailySales = { date: string; orderCount: number; totalSen: number }
export type TopItem = { itemId: string | null; name: string; qty: number; totalSen: number }

type OrderRow = { id: string; created_at: string; total_sen: number }
type OrderLineRow = {
  order_id: string
  item_id: string | null
  name_snapshot: string
  qty: number
  line_total_sen: number
}

/** Days are bucketed by local calendar date, matching the Z report, so a
 * late-night sale isn't attributed to the wrong day. */
export function aggregateSalesByDay(
  orders: { createdAt: string; totalSen: number }[],
): DailySales[] {
  const byDay = new Map<string, DailySales>()
  for (const order of orders) {
    const date = toLocalDateString(new Date(order.createdAt))
    const entry = byDay.get(date) ?? { date, orderCount: 0, totalSen: 0 }
    entry.orderCount += 1
    entry.totalSen += order.totalSen
    byDay.set(date, entry)
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function aggregateTopItems(
  lines: { itemId: string | null; nameSnapshot: string; qty: number; lineTotalSen: number }[],
  limit = 10,
): TopItem[] {
  const byItem = new Map<string, TopItem>()
  for (const line of lines) {
    const key = line.itemId ?? `name:${line.nameSnapshot}`
    const entry = byItem.get(key) ?? {
      itemId: line.itemId,
      name: line.nameSnapshot,
      qty: 0,
      totalSen: 0,
    }
    entry.qty += line.qty
    entry.totalSen += line.lineTotalSen
    byItem.set(key, entry)
  }
  return [...byItem.values()].sort((a, b) => b.totalSen - a.totalSen).slice(0, limit)
}

/** The owner's back-office dashboard reads straight from Supabase (not the
 * local Dexie cache) since the owner may view it from any browser, not just
 * the outlet's tablet. */
export async function getSalesByDay(
  outletId: string,
  fromDate: string,
  toDate: string,
): Promise<DailySales[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, total_sen')
    .eq('outlet_id', outletId)
    .eq('status', 'paid')
    .gte('created_at', `${fromDate}T00:00:00`)
    .lte('created_at', `${toDate}T23:59:59.999`)
  if (error) throw error

  return aggregateSalesByDay(
    (data as OrderRow[]).map((order) => ({
      createdAt: order.created_at,
      totalSen: order.total_sen,
    })),
  )
}

export async function getTopItems(
  outletId: string,
  fromDate: string,
  toDate: string,
  limit = 10,
): Promise<TopItem[]> {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('outlet_id', outletId)
    .eq('status', 'paid')
    .gte('created_at', `${fromDate}T00:00:00`)
    .lte('created_at', `${toDate}T23:59:59.999`)
  if (ordersError) throw ordersError

  const orderIds = (orders as { id: string }[]).map((order) => order.id)
  if (orderIds.length === 0) return []

  const { data: lines, error: linesError } = await supabase
    .from('order_lines')
    .select('order_id, item_id, name_snapshot, qty, line_total_sen')
    .in('order_id', orderIds)
    .eq('status', 'active')
  if (linesError) throw linesError

  return aggregateTopItems(
    (lines as OrderLineRow[]).map((line) => ({
      itemId: line.item_id,
      nameSnapshot: line.name_snapshot,
      qty: line.qty,
      lineTotalSen: line.line_total_sen,
    })),
    limit,
  )
}
