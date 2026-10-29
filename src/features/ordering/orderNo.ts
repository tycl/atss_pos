import { db } from '../../lib/db'

function todayYyyymmdd(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/** `<device prefix>-<YYYYMMDD>-<running no>`, derived from orders already in
 * the local Dexie cache so it stays unique even while fully offline. */
export async function generateOrderNo(deviceId: string, receiptPrefix: string): Promise<string> {
  const prefix = `${receiptPrefix}-${todayYyyymmdd()}-`
  const existing = await db.orders.where('deviceId').equals(deviceId).toArray()
  const todayCount = existing.filter((order) => order.orderNo.startsWith(prefix)).length
  const runningNo = String(todayCount + 1).padStart(3, '0')
  return `${prefix}${runningNo}`
}
