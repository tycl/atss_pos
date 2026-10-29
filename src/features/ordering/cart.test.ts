import { describe, expect, it } from 'vitest'
import { cartSubtotalSen, computeLineTotalSen, type CartLine } from './cart'

describe('computeLineTotalSen', () => {
  it('multiplies (unit price + modifiers) by quantity', () => {
    expect(computeLineTotalSen(350, [], 1)).toBe(350)
    expect(computeLineTotalSen(350, [{ id: 'm1', name: 'Extra shot', priceSen: 150 }], 2)).toBe(
      1000,
    )
  })

  it('sums multiple modifiers', () => {
    const modifiers = [
      { id: 'm1', name: 'Extra shot', priceSen: 150 },
      { id: 'm2', name: 'Oat milk', priceSen: 200 },
    ]
    expect(computeLineTotalSen(1000, modifiers, 1)).toBe(1350)
  })
})

describe('cartSubtotalSen', () => {
  it('sums line totals', () => {
    const lines: CartLine[] = [
      {
        id: '1',
        itemId: 'i1',
        nameSnapshot: 'Kopi',
        unitPriceSen: 350,
        qty: 1,
        modifiers: [],
        note: '',
        lineTotalSen: 350,
      },
      {
        id: '2',
        itemId: 'i2',
        nameSnapshot: 'Tea',
        unitPriceSen: 300,
        qty: 2,
        modifiers: [],
        note: '',
        lineTotalSen: 600,
      },
    ]
    expect(cartSubtotalSen(lines)).toBe(950)
  })

  it('returns 0 for an empty cart', () => {
    expect(cartSubtotalSen([])).toBe(0)
  })
})
