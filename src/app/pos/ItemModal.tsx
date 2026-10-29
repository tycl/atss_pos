import { useState } from 'react'
import { senToRm } from '../../lib/money'
import type { Item, Modifier, ModifierGroup } from '../../lib/types'
import {
  computeLineTotalSen,
  type CartLine,
  type CartLineModifier,
} from '../../features/ordering/cart'

export function ItemModal({
  item,
  groups,
  modifiersByGroup,
  onAdd,
  onClose,
}: {
  item: Item
  groups: ModifierGroup[]
  modifiersByGroup: Map<string, Modifier[]>
  onAdd: (line: Omit<CartLine, 'id'>) => void
  onClose: () => void
}) {
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({})
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  function toggleModifier(group: ModifierGroup, modifierId: string) {
    setSelectedByGroup((current) => {
      const selected = current[group.id] ?? []
      const isSelected = selected.includes(modifierId)

      if (group.maxSelect === 1) {
        if (isSelected && !group.required) return { ...current, [group.id]: [] }
        return { ...current, [group.id]: [modifierId] }
      }

      if (isSelected) {
        return { ...current, [group.id]: selected.filter((id) => id !== modifierId) }
      }
      if (selected.length >= group.maxSelect) return current
      return { ...current, [group.id]: [...selected, modifierId] }
    })
  }

  const missingRequired = groups.some(
    (group) => group.required && (selectedByGroup[group.id]?.length ?? 0) === 0,
  )

  const selectedModifiers: CartLineModifier[] = groups.flatMap((group) => {
    const modifiers = modifiersByGroup.get(group.id) ?? []
    const selectedIds = selectedByGroup[group.id] ?? []
    return modifiers
      .filter((modifier) => selectedIds.includes(modifier.id))
      .map((modifier) => ({ id: modifier.id, name: modifier.name, priceSen: modifier.priceSen }))
  })

  const lineTotalSen = computeLineTotalSen(item.priceSen, selectedModifiers, qty)

  function handleAdd() {
    onAdd({
      itemId: item.id,
      nameSnapshot: item.name,
      unitPriceSen: item.priceSen,
      qty,
      modifiers: selectedModifiers,
      note: note.trim(),
      lineTotalSen,
    })
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-lg bg-white p-4 sm:rounded-lg">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{item.name}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center text-xl text-slate-500"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-slate-600">RM {senToRm(item.priceSen)}</p>

        {groups.map((group) => (
          <div key={group.id} className="mt-4">
            <p className="text-sm font-medium text-slate-700">
              {group.name}
              {group.required && <span className="text-red-600"> *</span>}
              <span className="ml-1 text-xs text-slate-400">(max {group.maxSelect})</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(modifiersByGroup.get(group.id) ?? []).map((modifier) => {
                const isSelected = (selectedByGroup[group.id] ?? []).includes(modifier.id)
                return (
                  <button
                    key={modifier.id}
                    onClick={() => toggleModifier(group, modifier.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      isSelected
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {modifier.name}
                    {modifier.priceSen > 0 && ` (+${senToRm(modifier.priceSen)})`}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="mt-4">
          <label htmlFor="itemNote" className="block text-sm font-medium text-slate-700">
            Note
          </label>
          <input
            id="itemNote"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. less ice"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty((current) => Math.max(1, current - 1))}
              className="h-11 w-11 rounded border border-slate-300"
            >
              −
            </button>
            <span className="w-6 text-center">{qty}</span>
            <button
              onClick={() => setQty((current) => current + 1)}
              className="h-11 w-11 rounded border border-slate-300"
            >
              +
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={missingRequired}
            className="min-h-11 rounded bg-slate-800 px-4 py-3 text-white disabled:opacity-50"
          >
            Add · RM {senToRm(lineTotalSen)}
          </button>
        </div>
        {missingRequired && (
          <p className="mt-2 text-right text-xs text-red-600">Select a required option above</p>
        )}
      </div>
    </div>
  )
}
