import { senToRm } from '../../lib/money'
import type { PaymentMethod } from '../../lib/types'

const DIVIDER = '[C]--------------------------------\n'

/** DantSu's markup uses <, > for tags and treats \n as a line break, so
 * free-text fields (names, notes) could otherwise corrupt the layout. */
function sanitize(text: string): string {
  return text.replace(/[<>]/g, '').replace(/\n/g, ' ').trim()
}

function money(sen: number): string {
  return `RM ${senToRm(sen)}`
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function paymentMethodLabel(method: PaymentMethod): string {
  return method === 'cash' ? 'Cash' : 'DuitNow QR'
}

export type ReceiptLineModifier = { name: string; priceSen: number }

export type ReceiptLine = {
  nameSnapshot: string
  qty: number
  modifiers: ReceiptLineModifier[]
  note: string | null
  lineTotalSen: number
}

export type ReceiptInput = {
  merchantName: string
  ssmNo: string | null
  sstNo: string | null
  address: string | null
  receiptFooter: string | null
  orderNo: string
  createdAt: string
  cashierName: string
  sstEnabled: boolean
  lines: ReceiptLine[]
  subtotalSen: number
  serviceChargeSen: number
  sstSen: number
  roundingSen: number
  totalSen: number
  paymentMethod: PaymentMethod
  cashReceivedSen: number | null
  changeSen: number | null
}

/** Customer receipt per CLAUDE.md §7: shop name, SSM no., SST no. (if SST
 * enabled), address, receipt no., date/time, cashier, items with
 * modifiers, subtotal, service charge, SST, rounding, total, payment
 * method, change. */
export function formatReceipt(input: ReceiptInput): string {
  const parts: string[] = []

  parts.push(`[C]<b>${sanitize(input.merchantName)}</b>\n`)
  if (input.address) parts.push(`[C]${sanitize(input.address)}\n`)
  if (input.ssmNo) parts.push(`[C]SSM: ${sanitize(input.ssmNo)}\n`)
  if (input.sstEnabled && input.sstNo) parts.push(`[C]SST: ${sanitize(input.sstNo)}\n`)

  parts.push(DIVIDER)
  parts.push(`[L]Receipt: ${sanitize(input.orderNo)}\n`)
  parts.push(`[L]${formatDateTime(input.createdAt)}\n`)
  parts.push(`[L]Cashier: ${sanitize(input.cashierName)}\n`)
  parts.push(DIVIDER)

  for (const line of input.lines) {
    parts.push(
      `[L]<b>${line.qty} x ${sanitize(line.nameSnapshot)}</b>[R]${money(line.lineTotalSen)}\n`,
    )
    for (const modifier of line.modifiers) {
      parts.push(`[L]  + ${sanitize(modifier.name)}\n`)
    }
    if (line.note) {
      parts.push(`[L]  Note: ${sanitize(line.note)}\n`)
    }
  }

  parts.push(DIVIDER)
  parts.push(`[L]Subtotal[R]${money(input.subtotalSen)}\n`)
  if (input.serviceChargeSen > 0) {
    parts.push(`[L]Service charge[R]${money(input.serviceChargeSen)}\n`)
  }
  if (input.sstSen > 0) {
    parts.push(`[L]SST[R]${money(input.sstSen)}\n`)
  }
  if (input.roundingSen !== 0) {
    parts.push(`[L]Rounding[R]${input.roundingSen > 0 ? '+' : ''}${money(input.roundingSen)}\n`)
  }
  parts.push(`[L]<b>Total</b>[R]<b>${money(input.totalSen)}</b>\n`)

  parts.push(DIVIDER)
  parts.push(`[L]Payment: ${paymentMethodLabel(input.paymentMethod)}\n`)
  if (
    input.paymentMethod === 'cash' &&
    input.cashReceivedSen !== null &&
    input.changeSen !== null
  ) {
    parts.push(`[L]Received[R]${money(input.cashReceivedSen)}\n`)
    parts.push(`[L]Change[R]${money(input.changeSen)}\n`)
  }

  if (input.receiptFooter) {
    parts.push(`[C]\n`)
    parts.push(`[C]${sanitize(input.receiptFooter)}\n`)
  }

  return parts.join('')
}

export type KitchenTicketLine = {
  nameSnapshot: string
  qty: number
  modifiers: ReceiptLineModifier[]
  note: string | null
}

export type KitchenTicketInput = {
  orderNo: string
  createdAt: string
  /** e.g. "Dine-in - Table 5" or "Takeaway" */
  orderLabel: string
  lines: KitchenTicketLine[]
}

/** Kitchen tickets never show prices -- the kitchen needs what to make,
 * not what it costs. */
export function formatKitchenTicket(input: KitchenTicketInput): string {
  const parts: string[] = []

  parts.push(`[C]<font size='big'><b>KITCHEN</b></font>\n`)
  parts.push(`[C]${sanitize(input.orderNo)}\n`)
  parts.push(`[L]${sanitize(input.orderLabel)}\n`)
  parts.push(`[L]${formatDateTime(input.createdAt)}\n`)
  parts.push(DIVIDER)

  for (const line of input.lines) {
    parts.push(`[L]<font size='wide'><b>${line.qty} x ${sanitize(line.nameSnapshot)}</b></font>\n`)
    for (const modifier of line.modifiers) {
      parts.push(`[L]  + ${sanitize(modifier.name)}\n`)
    }
    if (line.note) {
      parts.push(`[L]  <b>Note: ${sanitize(line.note)}</b>\n`)
    }
  }

  parts.push(DIVIDER)
  return parts.join('')
}
