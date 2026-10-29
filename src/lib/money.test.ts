import { describe, expect, it } from 'vitest'
import { bpToPercent, isValidRmAmount, percentToBp, senToRm, toSen } from './money'

describe('toSen', () => {
  it('converts whole and decimal amounts', () => {
    expect(toSen('12')).toBe(1200)
    expect(toSen('12.5')).toBe(1250)
    expect(toSen('12.50')).toBe(1250)
    expect(toSen('0.05')).toBe(5)
    expect(toSen('999.99')).toBe(99999)
  })

  it('avoids float imprecision for tricky values', () => {
    expect(toSen('0.1')).toBe(10)
    expect(toSen('1.01')).toBe(101)
  })

  it('rejects invalid input', () => {
    expect(() => toSen('abc')).toThrow()
    expect(() => toSen('12.555')).toThrow()
    expect(() => toSen('-5')).toThrow()
    expect(() => toSen('')).toThrow()
  })
})

describe('senToRm', () => {
  it('formats sen back to a decimal string', () => {
    expect(senToRm(1200)).toBe('12.00')
    expect(senToRm(1250)).toBe('12.50')
    expect(senToRm(5)).toBe('0.05')
    expect(senToRm(0)).toBe('0.00')
  })

  it('round-trips through toSen', () => {
    expect(senToRm(toSen('3.50'))).toBe('3.50')
  })
})

describe('percentToBp', () => {
  it('converts percent strings to basis points', () => {
    expect(percentToBp('6')).toBe(600)
    expect(percentToBp('6.5')).toBe(650)
    expect(percentToBp('10')).toBe(1000)
    expect(percentToBp('0')).toBe(0)
  })
})

describe('bpToPercent', () => {
  it('formats basis points back to a percent string, dropping trailing .00', () => {
    expect(bpToPercent(600)).toBe('6')
    expect(bpToPercent(650)).toBe('6.50')
    expect(bpToPercent(1000)).toBe('10')
  })

  it('round-trips through percentToBp for whole percentages', () => {
    expect(bpToPercent(percentToBp('6'))).toBe('6')
  })
})

describe('isValidRmAmount', () => {
  it('accepts valid amounts', () => {
    expect(isValidRmAmount('12')).toBe(true)
    expect(isValidRmAmount('12.5')).toBe(true)
    expect(isValidRmAmount('12.50')).toBe(true)
  })

  it('rejects invalid amounts', () => {
    expect(isValidRmAmount('12.555')).toBe(false)
    expect(isValidRmAmount('-5')).toBe(false)
    expect(isValidRmAmount('abc')).toBe(false)
  })
})
