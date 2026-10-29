import type { CartLine } from '../ordering/cart'
import type { RecordPaymentResult } from '../payment/paymentApi'
import type { Merchant, OrderType } from '../../lib/types'
import {
  formatKitchenTicket,
  formatReceipt,
  type KitchenTicketLine,
  type ReceiptLine,
} from './receiptFormat'

function cartLineModifiers(line: CartLine) {
  return line.modifiers.map((modifier) => ({ name: modifier.name, priceSen: modifier.priceSen }))
}

function orderLabel(type: OrderType, tableName: string | null): string {
  return type === 'dine_in' ? `Dine-in - ${tableName ?? 'Table'}` : 'Takeaway'
}

export function buildKitchenTicketText(
  orderNo: string,
  type: OrderType,
  tableName: string | null,
  lines: CartLine[],
): string {
  const ticketLines: KitchenTicketLine[] = lines.map((line) => ({
    nameSnapshot: line.nameSnapshot,
    qty: line.qty,
    modifiers: cartLineModifiers(line),
    note: line.note || null,
  }))

  return formatKitchenTicket({
    orderNo,
    createdAt: new Date().toISOString(),
    orderLabel: orderLabel(type, tableName),
    lines: ticketLines,
  })
}

export function buildReceiptText(params: {
  result: RecordPaymentResult
  merchant: Merchant
  receiptFooter: string | null
  cashierName: string
  sstEnabled: boolean
  lines: CartLine[]
}): string {
  const { order, payment } = params.result

  const receiptLines: ReceiptLine[] = params.lines.map((line) => ({
    nameSnapshot: line.nameSnapshot,
    qty: line.qty,
    modifiers: cartLineModifiers(line),
    note: line.note || null,
    lineTotalSen: line.lineTotalSen,
  }))

  return formatReceipt({
    merchantName: params.merchant.name,
    ssmNo: params.merchant.ssmNo,
    sstNo: params.merchant.sstNo,
    address: params.merchant.address,
    receiptFooter: params.receiptFooter,
    orderNo: order.orderNo,
    createdAt: order.paidAt ?? order.createdAt,
    cashierName: params.cashierName,
    sstEnabled: params.sstEnabled,
    lines: receiptLines,
    subtotalSen: order.subtotalSen,
    serviceChargeSen: order.serviceChargeSen,
    sstSen: order.sstSen,
    roundingSen: order.roundingSen,
    totalSen: order.totalSen,
    paymentMethod: payment.method,
    cashReceivedSen: payment.cashReceivedSen,
    changeSen: payment.changeSen,
  })
}
