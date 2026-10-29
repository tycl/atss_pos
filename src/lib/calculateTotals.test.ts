import { describe, expect, it } from 'vitest'
import { calculateTotals } from './calculateTotals'

const base = {
  serviceChargeEnabled: false,
  serviceChargeRateBp: 0,
  sstEnabled: false,
  sstRateBp: 0,
  applyCashRounding: false,
}

describe('calculateTotals', () => {
  it('passes subtotal straight through when everything is disabled', () => {
    const result = calculateTotals({ ...base, subtotalSen: 1250 })
    expect(result).toEqual({
      subtotalSen: 1250,
      serviceChargeSen: 0,
      sstSen: 0,
      roundingSen: 0,
      totalSen: 1250,
    })
  })

  it('applies service charge as a percentage of subtotal', () => {
    const result = calculateTotals({
      ...base,
      subtotalSen: 1250,
      serviceChargeEnabled: true,
      serviceChargeRateBp: 1000, // 10%
    })
    expect(result.serviceChargeSen).toBe(125)
    expect(result.totalSen).toBe(1375)
  })

  it('applies SST as a percentage of subtotal when service charge is off', () => {
    const result = calculateTotals({
      ...base,
      subtotalSen: 1250,
      sstEnabled: true,
      sstRateBp: 600, // 6%
    })
    expect(result.sstSen).toBe(75)
    expect(result.totalSen).toBe(1325)
  })

  it('computes SST on (subtotal + service charge), not on subtotal alone', () => {
    const result = calculateTotals({
      ...base,
      subtotalSen: 1250,
      serviceChargeEnabled: true,
      serviceChargeRateBp: 1000, // 10% -> 125
      sstEnabled: true,
      sstRateBp: 600, // 6% of 1375 = 82.5 -> rounds to 83
    })
    expect(result.serviceChargeSen).toBe(125)
    expect(result.sstSen).toBe(83)
    expect(result.totalSen).toBe(1458)
  })

  it('rounds the half-sen case up (Math.round half-up behavior)', () => {
    const result = calculateTotals({
      ...base,
      subtotalSen: 100,
      sstEnabled: true,
      sstRateBp: 50, // 0.5% of 100 = 0.5 -> rounds to 1
    })
    expect(result.sstSen).toBe(1)
  })

  it('does not round cash totals when applyCashRounding is false', () => {
    const result = calculateTotals({ ...base, subtotalSen: 1203, applyCashRounding: false })
    expect(result.totalSen).toBe(1203)
    expect(result.roundingSen).toBe(0)
  })

  it('rounds x.01 and x.02 down to the nearest 5 sen', () => {
    expect(calculateTotals({ ...base, subtotalSen: 1201, applyCashRounding: true })).toMatchObject({
      totalSen: 1200,
      roundingSen: -1,
    })
    expect(calculateTotals({ ...base, subtotalSen: 1202, applyCashRounding: true })).toMatchObject({
      totalSen: 1200,
      roundingSen: -2,
    })
  })

  it('rounds x.03 and x.04 up to the nearest 5 sen', () => {
    expect(calculateTotals({ ...base, subtotalSen: 1203, applyCashRounding: true })).toMatchObject({
      totalSen: 1205,
      roundingSen: 2,
    })
    expect(calculateTotals({ ...base, subtotalSen: 1204, applyCashRounding: true })).toMatchObject({
      totalSen: 1205,
      roundingSen: 1,
    })
  })

  it('leaves an amount already ending in 0 or 5 unrounded', () => {
    expect(
      calculateTotals({ ...base, subtotalSen: 1200, applyCashRounding: true }).roundingSen,
    ).toBe(0)
    expect(
      calculateTotals({ ...base, subtotalSen: 1205, applyCashRounding: true }).roundingSen,
    ).toBe(0)
  })

  it('applies cash rounding after service charge and SST', () => {
    const result = calculateTotals({
      subtotalSen: 1250,
      serviceChargeEnabled: true,
      serviceChargeRateBp: 1000, // 125
      sstEnabled: true,
      sstRateBp: 600, // 6% of 1375 = 83
      applyCashRounding: true, // pre-rounding total 1458 -> remainder 3 -> rounds up to 1460
    })
    expect(result.totalSen).toBe(1460)
    expect(result.roundingSen).toBe(2)
  })

  it('handles a zero subtotal', () => {
    const result = calculateTotals({ ...base, subtotalSen: 0, applyCashRounding: true })
    expect(result).toEqual({
      subtotalSen: 0,
      serviceChargeSen: 0,
      sstSen: 0,
      roundingSen: 0,
      totalSen: 0,
    })
  })
})
