import Dexie, { type Table } from 'dexie'
import type {
  AuditLogEntry,
  Category,
  Device,
  DiningTable,
  Item,
  ItemModifierGroup,
  Merchant,
  Modifier,
  ModifierGroup,
  Order,
  OrderLine,
  Outlet,
  Payment,
  Settings,
  Shift,
  Staff,
} from './types'

export type SyncOperation = 'insert' | 'update' | 'delete'

/** A pending write waiting to reach Supabase. `payload` is the full
 * camelCase record for insert/update, and null for delete (only the id
 * is needed to delete a row). */
export type SyncQueueEntry = {
  id: string
  tableName: string
  op: SyncOperation
  recordId: string
  payload: Record<string, unknown> | null
  createdAt: number
  attempts: number
  nextAttemptAt: number
  lastError: string | null
}

class AtssDb extends Dexie {
  merchants!: Table<Merchant, string>
  outlets!: Table<Outlet, string>
  devices!: Table<Device, string>
  staff!: Table<Staff, string>
  settings!: Table<Settings, string>
  categories!: Table<Category, string>
  items!: Table<Item, string>
  modifierGroups!: Table<ModifierGroup, string>
  modifiers!: Table<Modifier, string>
  itemModifierGroups!: Table<ItemModifierGroup, [string, string]>
  diningTables!: Table<DiningTable, string>
  orders!: Table<Order, string>
  orderLines!: Table<OrderLine, string>
  payments!: Table<Payment, string>
  shifts!: Table<Shift, string>
  auditLog!: Table<AuditLogEntry, string>
  syncQueue!: Table<SyncQueueEntry, string>

  constructor() {
    super('atss-pos')
    this.version(1).stores({
      merchants: 'id',
      outlets: 'id, merchantId',
      devices: 'id, merchantId, outletId',
      staff: 'id, merchantId',
      settings: 'outletId, merchantId',
      categories: 'id, merchantId',
      items: 'id, merchantId, categoryId',
      modifierGroups: 'id, merchantId',
      modifiers: 'id, merchantId, groupId',
      itemModifierGroups: '[itemId+groupId], merchantId',
      diningTables: 'id, merchantId, outletId',
      orders: 'id, merchantId, outletId, deviceId, status',
      orderLines: 'id, merchantId, orderId',
      payments: 'id, merchantId, orderId',
      shifts: 'id, merchantId, outletId, deviceId',
      auditLog: 'id, merchantId',
      syncQueue: 'id, nextAttemptAt',
    })
  }
}

export const db = new AtssDb()
