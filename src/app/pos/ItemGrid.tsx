import { senToRm } from '../../lib/money'
import type { Item } from '../../lib/types'

export function ItemGrid({ items, onSelect }: { items: Item[]; onSelect: (item: Item) => void }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No items in this category.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className="flex h-24 flex-col items-start justify-between rounded border border-slate-200 bg-white p-3 text-left active:bg-slate-50"
        >
          <span className="font-medium text-slate-800">{item.name}</span>
          <span className="text-sm text-slate-600">RM {senToRm(item.priceSen)}</span>
        </button>
      ))}
    </div>
  )
}
