import { describe, expect, it } from 'vitest'
import { hashPin, isValidPin, verifyPin } from './pin'

describe('isValidPin', () => {
  it('accepts 4 to 6 digit numeric PINs', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123456')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('1234567')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
    expect(isValidPin('')).toBe(false)
  })
})

describe('hashPin / verifyPin', () => {
  it('verifies the correct PIN', async () => {
    const hash = await hashPin('135790')
    await expect(verifyPin('135790', hash)).resolves.toBe(true)
  })

  it('rejects an incorrect PIN', async () => {
    const hash = await hashPin('135790')
    await expect(verifyPin('000000', hash)).resolves.toBe(false)
  })

  it('produces a different hash each time (random salt)', async () => {
    const a = await hashPin('135790')
    const b = await hashPin('135790')
    expect(a).not.toBe(b)
  })

  it('rejects a malformed stored hash instead of throwing', async () => {
    await expect(verifyPin('135790', 'not-a-real-hash')).resolves.toBe(false)
  })
})
