import { useState, type FormEvent } from 'react'
import { isValidRmAmount, senToRm, toSen } from '../../lib/money'
import type { Category, Item, ModifierGroup } from '../../lib/types'

export function ItemsSection({
  items,
  categories,
  modifierGroups,
  onAdd,
  onToggleActive,
  onDelete,
}: {
  items: Item[]
  categories: Category[]
  modifierGroups: ModifierGroup[]
  onAdd: (
    name: string,
    categoryId: string | null,
    priceSen: number,
    modifierGroupIds: string[],
  ) => Promise<void>
  onToggleActive: (item: Item) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('')
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!isValidRmAmount(price)) {
      setError('Enter a valid price, e.g. 3.50')
      return
    }

    setSubmitting(true)
    try {
      await onAdd(name, categoryId || null, toSen(price), selectedGroupIds)
      setName('')
      setCategoryId('')
      setPrice('')
      setSelectedGroupIds([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function categoryName(categoryId: string | null) {
    return categories.find((category) => category.id === categoryId)?.name ?? 'Uncategorized'
  }

  async function handleToggleActive(item: Item) {
    setError(null)
    try {
      await onToggleActive(item)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item')
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    try {
      await onDelete(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item')
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-wrap gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-700">Name</label>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Category</label>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-1 rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Price (RM)</label>
            <input
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="3.50"
              inputMode="decimal"
              className="mt-1 w-24 rounded border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        {modifierGroups.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-700">Modifier groups</p>
            <div className="mt-1 flex flex-wrap gap-3">
              {modifierGroups.map((group) => (
                <label key={group.id} className="flex items-center gap-1 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(group.id)}
                    onChange={() => toggleGroup(group.id)}
                  />
                  {group.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Add item'}
        </button>
      </form>

      <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-slate-800">{item.name}</p>
              <p className="text-sm text-slate-500">
                {categoryName(item.categoryId)} · RM {senToRm(item.priceSen)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleActive(item)}
                className="px-2 py-2 text-sm font-medium text-slate-600 underline"
              >
                {item.active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="px-2 py-2 text-sm font-medium text-red-600 underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No items yet.</li>}
      </ul>
    </div>
  )
}
