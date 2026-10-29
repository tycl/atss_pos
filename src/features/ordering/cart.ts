export type CartLineModifier = { id: string; name: string; priceSen: number }

export type CartLine = {
  id: string
  itemId: string
  nameSnapshot: string
  unitPriceSen: number
  qty: number
  modifiers: CartLineModifier[]
  note: string
  lineTotalSen: number
}

export function computeLineTotalSen(
  unitPriceSen: number,
  modifiers: CartLineModifier[],
  qty: number,
): number {
  const modifiersSen = modifiers.reduce((sum, modifier) => sum + modifier.priceSen, 0)
  return (unitPriceSen + modifiersSen) * qty
}

export function cartSubtotalSen(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.lineTotalSen, 0)
}
