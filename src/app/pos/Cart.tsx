import { senToRm } from '../../lib/money'
import { cartSubtotalSen, computeLineTotalSen, type CartLine } from '../../features/ordering/cart'

export function Cart({
  lines,
  onChangeQty,
  onRemove,
}: {
  lines: CartLine[]
  onChangeQty: (lineId: string, qty: number) => void
  onRemove: (lineId: string) => void
}) {
  const subtotalSen = cartSubtotalSen(lines)

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-lg font-semibold text-slate-800">Cart</h2>

      <div className="mt-3 flex-1 space-y-3 overflow-y-auto">
        {lines.length === 0 && <p className="text-sm text-slate-500">No items added yet.</p>}

        {lines.map((line) => (
          <div key={line.id} className="rounded border border-slate-200 p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-800">{line.nameSnapshot}</p>
                {line.modifiers.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {line.modifiers.map((modifier) => modifier.name).join(', ')}
                  </p>
                )}
                {line.note && <p className="text-xs text-slate-500">Note: {line.note}</p>}
              </div>
              <button
                onClick={() => onRemove(line.id)}
                className="-mr-2 -mt-2 px-2 py-2 text-xs text-red-600 underline"
              >
                Remove
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChangeQty(line.id, Math.max(1, line.qty - 1))}
                  className="h-11 w-11 rounded border border-slate-300 text-base"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm">{line.qty}</span>
                <button
                  onClick={() => onChangeQty(line.id, line.qty + 1)}
                  className="h-11 w-11 rounded border border-slate-300 text-base"
                >
                  +
                </button>
              </div>
              <span className="text-sm font-medium text-slate-800">
                RM {senToRm(computeLineTotalSen(line.unitPriceSen, line.modifiers, line.qty))}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-slate-200 pt-3">
        <div className="flex items-center justify-between font-medium text-slate-800">
          <span>Subtotal</span>
          <span>RM {senToRm(subtotalSen)}</span>
        </div>
      </div>
    </div>
  )
}
