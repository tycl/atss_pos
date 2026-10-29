import { senToRm } from '../../lib/money'
import type { ZReport } from '../reports/zReportApi'

const DIVIDER = '[C]--------------------------------\n'

function sanitize(text: string): string {
  return text.replace(/[<>]/g, '').replace(/\n/g, ' ').trim()
}

function money(sen: number): string {
  return `RM ${senToRm(sen)}`
}

function paymentMethodLabel(method: string): string {
  return method === 'cash' ? 'Cash' : 'DuitNow QR'
}

/** Printable end-of-day (Z) report: totals by payment method, by item, by
 * category, voids, and SST/service charge collected. */
export function formatZReport(report: ZReport, outletName: string): string {
  const parts: string[] = []

  parts.push(`[C]<b>${sanitize(outletName)}</b>\n`)
  parts.push(`[C]<font size='big'><b>Z REPORT</b></font>\n`)
  parts.push(`[C]${report.date}\n`)
  parts.push(DIVIDER)

  parts.push(`[L]Orders[R]${report.orderCount}\n`)
  parts.push(`[L]Subtotal[R]${money(report.subtotalSen)}\n`)
  if (report.serviceChargeSen > 0) {
    parts.push(`[L]Service charge[R]${money(report.serviceChargeSen)}\n`)
  }
  if (report.sstSen > 0) {
    parts.push(`[L]SST[R]${money(report.sstSen)}\n`)
  }
  if (report.roundingSen !== 0) {
    parts.push(`[L]Rounding[R]${report.roundingSen > 0 ? '+' : ''}${money(report.roundingSen)}\n`)
  }
  parts.push(`[L]<b>Total</b>[R]<b>${money(report.totalSen)}</b>\n`)

  parts.push(DIVIDER)
  parts.push(`[C]<b>By payment method</b>\n`)
  for (const entry of report.byPaymentMethod) {
    parts.push(
      `[L]${paymentMethodLabel(entry.method)} (${entry.count})[R]${money(entry.totalSen)}\n`,
    )
  }
  if (report.byPaymentMethod.length === 0) {
    parts.push(`[L]No sales\n`)
  }

  parts.push(DIVIDER)
  parts.push(`[C]<b>By item</b>\n`)
  for (const entry of report.byItem) {
    parts.push(`[L]${entry.qty} x ${sanitize(entry.name)}[R]${money(entry.totalSen)}\n`)
  }
  if (report.byItem.length === 0) {
    parts.push(`[L]No items sold\n`)
  }

  parts.push(DIVIDER)
  parts.push(`[C]<b>By category</b>\n`)
  for (const entry of report.byCategory) {
    parts.push(`[L]${sanitize(entry.name)}[R]${money(entry.totalSen)}\n`)
  }
  if (report.byCategory.length === 0) {
    parts.push(`[L]No items sold\n`)
  }

  parts.push(DIVIDER)
  parts.push(`[L]Voids (${report.voidCount})[R]${money(report.voidTotalSen)}\n`)

  return parts.join('')
}
