import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('builds a header row plus data rows, CRLF-joined', () => {
    const csv = toCsv(
      ['Date', 'Total'],
      [
        ['2026-10-25', 1500],
        ['2026-10-26', 2000],
      ],
    )
    expect(csv).toBe('Date,Total\r\n2026-10-25,1500\r\n2026-10-26,2000')
  })

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = toCsv(['Name'], [['Kopi, O'], ['Te"h O'], ['Line\nbreak']])
    expect(csv).toBe('Name\r\n"Kopi, O"\r\n"Te""h O"\r\n"Line\nbreak"')
  })

  it('leaves plain fields unquoted', () => {
    expect(toCsv(['A'], [['plain']])).toBe('A\r\nplain')
  })

  it('handles an empty row set', () => {
    expect(toCsv(['A', 'B'], [])).toBe('A,B')
  })
})
