import { describe, expect, it } from 'vitest'
import { formatKitchenTicket, formatReceipt, type ReceiptInput } from './receiptFormat'

const baseReceipt: ReceiptInput = {
  merchantName: 'Kopitiam Aisyah',
  ssmNo: '123456-X',
  sstNo: 'SST-001',
  address: '12 Jalan Besar',
  receiptFooter: 'Thank you, come again!',
  orderNo: 'T1-20261024-001',
  createdAt: '2026-10-24T05:30:00.000Z',
  cashierName: 'Aisyah',
  sstEnabled: true,
  lines: [
    {
      nameSnapshot: 'Kopi O',
      qty: 2,
      modifiers: [],
      note: null,
      lineTotalSen: 560,
    },
    {
      nameSnapshot: 'Nasi Lemak',
      qty: 1,
      modifiers: [{ name: 'Extra egg', priceSen: 100 }],
      note: 'spicy',
      lineTotalSen: 750,
    },
  ],
  subtotalSen: 1310,
  serviceChargeSen: 131,
  sstSen: 86,
  roundingSen: -1,
  totalSen: 1526,
  paymentMethod: 'cash',
  cashReceivedSen: 2000,
  changeSen: 474,
}

describe('formatReceipt', () => {
  it('includes shop identity and tax info when SST is enabled', () => {
    const text = formatReceipt(baseReceipt)
    expect(text).toContain('Kopitiam Aisyah')
    expect(text).toContain('12 Jalan Besar')
    expect(text).toContain('SSM: 123456-X')
    expect(text).toContain('SST: SST-001')
  })

  it('omits the SST line when SST is disabled, even if the number is set', () => {
    const text = formatReceipt({ ...baseReceipt, sstEnabled: false })
    expect(text).not.toContain('SST: SST-001')
  })

  it('includes receipt number, cashier, and items with modifiers and notes', () => {
    const text = formatReceipt(baseReceipt)
    expect(text).toContain('Receipt: T1-20261024-001')
    expect(text).toContain('Cashier: Aisyah')
    expect(text).toContain('2 x Kopi O')
    expect(text).toContain('1 x Nasi Lemak')
    expect(text).toContain('+ Extra egg')
    expect(text).toContain('Note: spicy')
  })

  it('includes subtotal, service charge, SST, rounding, and total', () => {
    const text = formatReceipt(baseReceipt)
    expect(text).toContain('Subtotal[R]RM 13.10')
    expect(text).toContain('Service charge[R]RM 1.31')
    expect(text).toContain('SST[R]RM 0.86')
    expect(text).toContain('Rounding[R]RM -0.01')
    expect(text).toContain('Total</b>[R]<b>RM 15.26')
  })

  it('omits service charge, SST, and rounding lines when they are zero', () => {
    const text = formatReceipt({
      ...baseReceipt,
      serviceChargeSen: 0,
      sstSen: 0,
      roundingSen: 0,
    })
    expect(text).not.toContain('Service charge')
    expect(text).not.toContain('SST[R]')
    expect(text).not.toContain('Rounding')
  })

  it('shows payment method and change for cash', () => {
    const text = formatReceipt(baseReceipt)
    expect(text).toContain('Payment: Cash')
    expect(text).toContain('Received[R]RM 20.00')
    expect(text).toContain('Change[R]RM 4.74')
  })

  it('shows DuitNow QR without a change line', () => {
    const text = formatReceipt({
      ...baseReceipt,
      paymentMethod: 'duitnow_qr',
      cashReceivedSen: null,
      changeSen: null,
    })
    expect(text).toContain('Payment: DuitNow QR')
    expect(text).not.toContain('Received')
    expect(text).not.toContain('Change')
  })

  it('strips markup-breaking characters from free-text fields', () => {
    const text = formatReceipt({
      ...baseReceipt,
      merchantName: 'Kopi <Tiam>',
      lines: [
        {
          nameSnapshot: 'Te<h> O',
          qty: 1,
          modifiers: [],
          note: 'no <sugar>',
          lineTotalSen: 300,
        },
      ],
    })
    expect(text).not.toContain('Kopi <Tiam>')
    expect(text).not.toContain('Te<h> O')
    expect(text).not.toContain('no <sugar>')
    expect(text).toContain('Kopi Tiam')
    expect(text).toContain('Teh O')
    expect(text).toContain('no sugar')
  })

  it('includes the outlet receipt footer when set', () => {
    const text = formatReceipt(baseReceipt)
    expect(text).toContain('Thank you, come again!')
  })
})

describe('formatKitchenTicket', () => {
  it('never shows prices, only items/modifiers/notes', () => {
    const text = formatKitchenTicket({
      orderNo: 'T1-20261024-001',
      createdAt: '2026-10-24T05:30:00.000Z',
      orderLabel: 'Dine-in - Table 5',
      lines: [
        { nameSnapshot: 'Kopi O', qty: 2, modifiers: [], note: null },
        {
          nameSnapshot: 'Nasi Lemak',
          qty: 1,
          modifiers: [{ name: 'Extra egg', priceSen: 100 }],
          note: 'spicy',
        },
      ],
    })
    expect(text).toContain('T1-20261024-001')
    expect(text).toContain('Dine-in - Table 5')
    expect(text).toContain('2 x Kopi O')
    expect(text).toContain('1 x Nasi Lemak')
    expect(text).toContain('+ Extra egg')
    expect(text).toContain('Note: spicy')
    expect(text).not.toMatch(/RM/)
  })
})
