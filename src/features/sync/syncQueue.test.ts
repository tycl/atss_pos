import { describe, expect, it } from 'vitest'
import { nextRetryDelayMs } from './syncQueue'

describe('nextRetryDelayMs', () => {
  it('doubles with each attempt', () => {
    expect(nextRetryDelayMs(0)).toBe(2_000)
    expect(nextRetryDelayMs(1)).toBe(4_000)
    expect(nextRetryDelayMs(2)).toBe(8_000)
  })

  it('caps at 5 minutes', () => {
    expect(nextRetryDelayMs(20)).toBe(5 * 60_000)
  })
})
