const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/

/** Parses a 2-decimal-place string into an integer scaled by 100.
 * String-based parsing avoids float imprecision (12.50 * 100 can land on
 * 1249.999999999998 in JS). Shared by the money (sen) and basis-point
 * helpers below, since both are "decimal string <-> integer x100". */
function parseScaledBy100(value: string): number {
  const trimmed = value.trim()
  if (!DECIMAL_PATTERN.test(trimmed)) {
    throw new Error(`Invalid decimal amount: "${value}"`)
  }

  const [whole, fraction = ''] = trimmed.split('.')
  const hundredths = (fraction + '00').slice(0, 2)
  return Number(whole) * 100 + Number(hundredths)
}

function formatScaledBy100(value: number): string {
  const negative = value < 0
  const abs = Math.abs(Math.trunc(value))
  const whole = Math.floor(abs / 100)
  const remainder = abs % 100
  return `${negative ? '-' : ''}${whole}.${remainder.toString().padStart(2, '0')}`
}

export function isValidRmAmount(amount: string): boolean {
  return DECIMAL_PATTERN.test(amount.trim())
}

/** Converts a decimal RM string ("12.5", "12.50", "12") to integer sen. */
export function toSen(amount: string): number {
  return parseScaledBy100(amount)
}

/** Formats integer sen as a decimal RM string ("1250" sen -> "12.50"). */
export function senToRm(sen: number): string {
  return formatScaledBy100(sen)
}

/** Converts a decimal percent string ("6", "6.5") to integer basis points
 * (6% -> 600bp). Settings store tax/service-charge rates as basis points. */
export function percentToBp(percent: string): number {
  return parseScaledBy100(percent)
}

/** Formats integer basis points as a decimal percent string (600bp -> "6"). */
export function bpToPercent(bp: number): string {
  return formatScaledBy100(bp).replace(/\.00$/, '')
}

