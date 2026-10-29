import { describe, expect, it } from 'vitest'
import { formatZReport } from './formatZReport'
import type { ZReport } from '../reports/zReportApi'

const baseReport: ZReport = {
  date: '2026-10-25',
  outletId: 'outlet-1',
  orderCount: 3,
  subtotalSen: 3000,
  serviceChargeSen: 300,
  sstSen: 198,
  roundingSen: 2,
  totalSen: 3500,
  byPaymentMethod: [
    { method: 'cash', count: 2, totalSen: 2000 },
    { method: 'duitnow_qr', count: 1, totalSen: 1500 },
  ],
  byItem: [
    { itemId: 'i1', name: 'Kopi O', qty: 5, totalSen: 1400 },
    { itemId: 'i2', name: 'Nasi Lemak', qty: 3, totalSen: 1950 },
  ],
  byCategory: [
    { categoryId: 'c1', name: 'Drinks', totalSen: 1400 },
    { categoryId: null, name: 'Uncategorized', totalSen: 1950 },
  ],
  voidCount: 1,
  voidTotalSen: 650,
}

describe('formatZReport', () => {
  it('includes the outlet name, label, and date', () => {
    const text = formatZReport(baseReport, 'Kopitiam Aisyah')
    expect(text).toContain('Kopitiam Aisyah')
    expect(text).toContain('Z REPORT')
    expect(text).toContain('2026-10-25')
  })

  it('includes order count and the subtotal/service charge/SST/rounding/total breakdown', () => {
    const text = formatZReport(baseReport, 'Kopitiam Aisyah')
    expect(text).toContain('Orders[R]3')
    expect(text).toContain('Subtotal[R]RM 30.00')
    expect(text).toContain('Service charge[R]RM 3.00')
    expect(text).toContain('SST[R]RM 1.98')
    expect(text).toContain('Rounding[R]+RM 0.02')
    expect(text).toContain('Total</b>[R]<b>RM 35.00')
  })

  it('omits service charge, SST, and rounding lines when zero', () => {
    const text = formatZReport(
      { ...baseReport, serviceChargeSen: 0, sstSen: 0, roundingSen: 0 },
      'Kopitiam Aisyah',
    )
    expect(text).not.toContain('Service charge')
    expect(text).not.toContain('SST[R]')
    expect(text).not.toContain('Rounding')
  })

  it('lists totals by payment method', () => {
    const text = formatZReport(baseReport, 'Kopitiam Aisyah')
    expect(text).toContain('Cash (2)[R]RM 20.00')
    expect(text).toContain('DuitNow QR (1)[R]RM 15.00')
  })

  it('lists totals by item', () => {
    const text = formatZReport(baseReport, 'Kopitiam Aisyah')
    expect(text).toContain('5 x Kopi O[R]RM 14.00')
    expect(text).toContain('3 x Nasi Lemak[R]RM 19.50')
  })

  it('lists totals by category, including uncategorized', () => {
    const text = formatZReport(baseReport, 'Kopitiam Aisyah')
    expect(text).toContain('Drinks[R]RM 14.00')
    expect(text).toContain('Uncategorized[R]RM 19.50')
  })

  it('shows void count and total', () => {
    const text = formatZReport(baseReport, 'Kopitiam Aisyah')
    expect(text).toContain('Voids (1)[R]RM 6.50')
  })

  it('shows placeholders for an empty day', () => {
    const empty: ZReport = {
      date: '2026-10-25',
      outletId: 'outlet-1',
      orderCount: 0,
      subtotalSen: 0,
      serviceChargeSen: 0,
      sstSen: 0,
      roundingSen: 0,
      totalSen: 0,
      byPaymentMethod: [],
      byItem: [],
      byCategory: [],
      voidCount: 0,
      voidTotalSen: 0,
    }
    const text = formatZReport(empty, 'Kopitiam Aisyah')
    expect(text).toContain('No sales')
    expect(text).toContain('No items sold')
    expect(text).toContain('Voids (0)[R]RM 0.00')
  })

  it('strips markup-breaking characters from free-text fields', () => {
    const text = formatZReport(
      {
        ...baseReport,
        byItem: [{ itemId: 'i1', name: 'Te<h> O', qty: 1, totalSen: 300 }],
        byCategory: [{ categoryId: 'c1', name: '<Drinks>', totalSen: 300 }],
      },
      'Kopi <Tiam>',
    )
    expect(text).not.toContain('Kopi <Tiam>')
    expect(text).not.toContain('Te<h> O')
    expect(text).not.toContain('<Drinks>')
    expect(text).toContain('Kopi Tiam')
    expect(text).toContain('Teh O')
    expect(text).toContain('Drinks')
  })
})
