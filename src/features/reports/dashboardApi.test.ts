import { describe, expect, it } from 'vitest'
import { aggregateSalesByDay, aggregateTopItems } from './dashboardApi'

describe('aggregateSalesByDay', () => {
  it('groups orders by local calendar date and sums totals', () => {
    const result = aggregateSalesByDay([
      { createdAt: '2026-10-25T03:00:00.000Z', totalSen: 1000 },
      { createdAt: '2026-10-25T10:00:00.000Z', totalSen: 500 },
      { createdAt: '2026-10-26T03:00:00.000Z', totalSen: 2000 },
    ])
    // Timezone-independent: group by whatever the local date resolves to,
    // just verify grouping/summing behavior, not specific date strings.
    expect(result).toHaveLength(2)
    const totalAcrossDays = result.reduce((sum, day) => sum + day.totalSen, 0)
    const ordersAcrossDays = result.reduce((sum, day) => sum + day.orderCount, 0)
    expect(totalAcrossDays).toBe(3500)
    expect(ordersAcrossDays).toBe(3)
  })

  it('sorts by date ascending', () => {
    const result = aggregateSalesByDay([
      { createdAt: '2026-10-27T12:00:00.000Z', totalSen: 100 },
      { createdAt: '2026-10-25T12:00:00.000Z', totalSen: 100 },
      { createdAt: '2026-10-26T12:00:00.000Z', totalSen: 100 },
    ])
    const dates = result.map((day) => day.date)
    expect(dates).toEqual([...dates].sort())
  })

  it('returns an empty array for no orders', () => {
    expect(aggregateSalesByDay([])).toEqual([])
  })

  it('counts multiple orders on the same day correctly', () => {
    const result = aggregateSalesByDay([
      { createdAt: '2026-10-25T01:00:00.000Z', totalSen: 100 },
      { createdAt: '2026-10-25T02:00:00.000Z', totalSen: 200 },
      { createdAt: '2026-10-25T03:00:00.000Z', totalSen: 300 },
    ])
    expect(result).toHaveLength(1)
    expect(result[0]!.orderCount).toBe(3)
    expect(result[0]!.totalSen).toBe(600)
  })
})

describe('aggregateTopItems', () => {
  const lines = [
    { itemId: 'i1', nameSnapshot: 'Kopi O', qty: 2, lineTotalSen: 560 },
    { itemId: 'i1', nameSnapshot: 'Kopi O', qty: 1, lineTotalSen: 280 },
    { itemId: 'i2', nameSnapshot: 'Nasi Lemak', qty: 1, lineTotalSen: 650 },
    { itemId: null, nameSnapshot: 'Custom item', qty: 1, lineTotalSen: 100 },
  ]

  it('sums qty and revenue per item across multiple lines', () => {
    const result = aggregateTopItems(lines)
    const kopiO = result.find((item) => item.itemId === 'i1')
    expect(kopiO).toMatchObject({ name: 'Kopi O', qty: 3, totalSen: 840 })
  })

  it('sorts by revenue descending', () => {
    const result = aggregateTopItems(lines)
    const totals = result.map((item) => item.totalSen)
    expect(totals).toEqual([...totals].sort((a, b) => b - a))
    expect(result[0]!.itemId).toBe('i1') // Kopi O: 560+280=840, the highest aggregate total
  })

  it('groups items with a null itemId by name snapshot', () => {
    const result = aggregateTopItems(lines)
    const custom = result.find((item) => item.itemId === null)
    expect(custom).toMatchObject({ name: 'Custom item', qty: 1, totalSen: 100 })
  })

  it('respects the limit', () => {
    const manyLines = Array.from({ length: 15 }, (_, i) => ({
      itemId: `i${i}`,
      nameSnapshot: `Item ${i}`,
      qty: 1,
      lineTotalSen: 100 + i,
    }))
    expect(aggregateTopItems(manyLines, 5)).toHaveLength(5)
  })

  it('returns an empty array for no lines', () => {
    expect(aggregateTopItems([])).toEqual([])
  })
})
