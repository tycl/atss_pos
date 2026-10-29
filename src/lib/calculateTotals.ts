export type CalculateTotalsInput = {
  subtotalSen: number
  serviceChargeEnabled: boolean
  serviceChargeRateBp: number
  sstEnabled: boolean
  sstRateBp: number
  /** Cash rounding only applies to cash payments, never DuitNow QR. */
  applyCashRounding: boolean
}

export type CalculateTotalsResult = {
  subtotalSen: number
  serviceChargeSen: number
  sstSen: number
  roundingSen: number
  totalSen: number
}

function applyRateBp(amountSen: number, rateBp: number): number {
  return Math.round((amountSen * rateBp) / 10_000)
}

/** Rounds to the nearest 5 sen: x.01-x.02 down, x.03-x.04 up. */
function roundToNearest5Sen(amountSen: number): number {
  return Math.round(amountSen / 5) * 5
}

/** subtotal -> service charge (if enabled) -> SST (if enabled, on top of
 * subtotal + service charge) -> cash rounding (cash only) -> total. */
export function calculateTotals(input: CalculateTotalsInput): CalculateTotalsResult {
  const { subtotalSen } = input

  const serviceChargeSen = input.serviceChargeEnabled
    ? applyRateBp(subtotalSen, input.serviceChargeRateBp)
    : 0

  const sstSen = input.sstEnabled ? applyRateBp(subtotalSen + serviceChargeSen, input.sstRateBp) : 0

  const preRoundingTotalSen = subtotalSen + serviceChargeSen + sstSen
  const totalSen = input.applyCashRounding
    ? roundToNearest5Sen(preRoundingTotalSen)
    : preRoundingTotalSen
  const roundingSen = totalSen - preRoundingTotalSen

  return { subtotalSen, serviceChargeSen, sstSen, roundingSen, totalSen }
}
