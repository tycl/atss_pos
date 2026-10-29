import { describe, expect, it } from 'vitest'
import { camelToSnake } from './caseConvert'

describe('camelToSnake', () => {
  it('converts camelCase keys to snake_case', () => {
    expect(camelToSnake({ merchantId: 'm1', priceSen: 350 })).toEqual({
      merchant_id: 'm1',
      price_sen: 350,
    })
  })

  it('leaves already-lowercase keys untouched', () => {
    expect(camelToSnake({ id: 'x', name: 'Kopi' })).toEqual({ id: 'x', name: 'Kopi' })
  })

  it('preserves nested values as-is', () => {
    const nested = [{ id: 'mod1', name: 'Less sugar', priceSen: 0 }]
    expect(camelToSnake({ modifiersSnapshot: nested })).toEqual({ modifiers_snapshot: nested })
  })

  it('preserves null values', () => {
    expect(camelToSnake({ categoryId: null })).toEqual({ category_id: null })
  })
})
