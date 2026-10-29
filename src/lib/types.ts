export type StaffRole = 'owner' | 'manager' | 'cashier'

export type Merchant = {
  id: string
  name: string
  ssmNo: string | null
  sstNo: string | null
  address: string | null
  phone: string | null
  logoUrl: string | null
  duitnowQrUrl: string | null
  plan: string
  status: 'active' | 'suspended' | 'cancelled'
  createdAt: string
}

export type Outlet = {
  id: string
  merchantId: string
  name: string
  address: string | null
  receiptFooter: string | null
  createdAt: string
}

export type Staff = {
  id: string
  merchantId: string
  name: string
  role: StaffRole
  pinHash: string
  active: boolean
  createdAt: string
}

export type Device = {
  id: string
  merchantId: string
  outletId: string
  label: string
  receiptPrefix: string
  createdAt: string
}

export type Settings = {
  outletId: string
  merchantId: string
  sstEnabled: boolean
  sstRateBp: number
  serviceChargeEnabled: boolean
  serviceChargeRateBp: number
  cashRoundingEnabled: boolean
  createdAt: string
}

export type Category = {
  id: string
  merchantId: string
  name: string
  sortOrder: number
  createdAt: string
}

export type Item = {
  id: string
  merchantId: string
  categoryId: string | null
  name: string
  priceSen: number
  active: boolean
  sortOrder: number
  createdAt: string
}

export type ModifierGroup = {
  id: string
  merchantId: string
  name: string
  required: boolean
  maxSelect: number
  createdAt: string
}

export type Modifier = {
  id: string
  merchantId: string
  groupId: string
  name: string
  priceSen: number
  createdAt: string
}

export type ItemModifierGroup = {
  merchantId: string
  itemId: string
  groupId: string
}

export type DiningTable = {
  id: string
  merchantId: string
  outletId: string
  name: string
  sortOrder: number
  createdAt: string
}

export type OrderType = 'dine_in' | 'takeaway'
export type OrderStatus = 'open' | 'paid' | 'void'

export type Order = {
  id: string
  merchantId: string
  outletId: string
  deviceId: string
  orderNo: string
  type: OrderType
  tableId: string | null
  status: OrderStatus
  subtotalSen: number
  serviceChargeSen: number
  sstSen: number
  roundingSen: number
  totalSen: number
  createdBy: string | null
  createdAt: string
  paidAt: string | null
  syncedAt: string | null
}

export type OrderLineModifierSnapshot = {
  id: string
  name: string
  priceSen: number
}

export type OrderLineStatus = 'active' | 'void'

export type OrderLine = {
  id: string
  merchantId: string
  orderId: string
  itemId: string | null
  nameSnapshot: string
  unitPriceSen: number
  qty: number
  modifiersSnapshot: OrderLineModifierSnapshot[]
  lineTotalSen: number
  note: string | null
  status: OrderLineStatus
  voidReason: string | null
  createdAt: string
}

export type PaymentMethod = 'cash' | 'duitnow_qr'

export type Payment = {
  id: string
  merchantId: string
  orderId: string
  method: PaymentMethod
  amountSen: number
  cashReceivedSen: number | null
  changeSen: number | null
  reference: string | null
  createdAt: string
}

export type Shift = {
  id: string
  merchantId: string
  outletId: string
  deviceId: string
  openedBy: string | null
  openedAt: string
  openingFloatSen: number
  closedBy: string | null
  closedAt: string | null
  countedCashSen: number | null
  expectedCashSen: number | null
  varianceSen: number | null
  createdAt: string
}

export type AuditLogEntry = {
  id: string
  merchantId: string
  staffId: string | null
  action: string
  details: Record<string, unknown>
  createdAt: string
}
