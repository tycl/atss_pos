import { useState, type FormEvent } from 'react'
import { isValidRmAmount, senToRm, toSen } from '../../lib/money'
import type { Modifier, ModifierGroup } from '../../lib/types'

function AddModifierForm({
  groupId,
  onAdd,
}: {
  groupId: string
  onAdd: (groupId: string, name: string, priceSen: number) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('0')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!isValidRmAmount(price)) {
      setError('Enter a valid price, e.g. 0 or 1.50')
      return
    }
    try {
      await onAdd(groupId, name, toSen(price))
      setName('')
      setPrice('0')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Extra shot"
        className="rounded border border-slate-300 px-2 py-1 text-sm"
      />
      <input
        required
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        placeholder="0.00"
        inputMode="decimal"
        className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
      />
      <button type="submit" className="rounded bg-slate-700 px-3 py-1 text-sm text-white">
        Add
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  )
}

export function ModifierGroupsSection({
  groups,
  modifiers,
  onAddGroup,
  onDeleteGroup,
  onAddModifier,
  onDeleteModifier,
}: {
  groups: ModifierGroup[]
  modifiers: Modifier[]
  onAddGroup: (name: string, required: boolean, maxSelect: number) => Promise<void>
  onDeleteGroup: (id: string) => Promise<void>
  onAddModifier: (groupId: string, name: string, priceSen: number) => Promise<void>
  onDeleteModifier: (id: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [required, setRequired] = useState(false)
  const [maxSelect, setMaxSelect] = useState('1')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await onAddGroup(name, required, Number(maxSelect))
      setName('')
      setRequired(false)
      setMaxSelect('1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  async function handleDeleteGroup(id: string) {
    setError(null)
    try {
      await onDeleteGroup(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group')
    }
  }

  async function handleDeleteModifier(id: string) {
    setError(null)
    try {
      await onDeleteModifier(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete modifier')
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded border border-slate-200 bg-white p-4"
      >
        <div>
          <label className="block text-xs font-medium text-slate-700">Group name</label>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Sugar level"
            className="mt-1 rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Max select</label>
          <input
            required
            type="number"
            min={1}
            value={maxSelect}
            onChange={(event) => setMaxSelect(event.target.value)}
            className="mt-1 w-20 rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          Required
        </label>
        <button type="submit" className="rounded bg-slate-800 px-4 py-2 text-white">
          Add group
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-3">
        {groups.map((group) => (
          <li key={group.id} className="rounded border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{group.name}</p>
                <p className="text-xs text-slate-500">
                  {group.required ? 'Required' : 'Optional'} · max {group.maxSelect}
                </p>
              </div>
              <button
                onClick={() => handleDeleteGroup(group.id)}
                className="px-2 py-2 text-sm font-medium text-red-600 underline"
              >
                Delete group
              </button>
            </div>

            <ul className="mt-3 space-y-1">
              {modifiers
                .filter((modifier) => modifier.groupId === group.id)
                .map((modifier) => (
                  <li key={modifier.id} className="flex items-center justify-between text-sm">
                    <span>
                      {modifier.name} ({senToRm(modifier.priceSen)})
                    </span>
                    <button
                      onClick={() => handleDeleteModifier(modifier.id)}
                      className="px-2 py-1.5 text-xs text-red-600 underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
            </ul>

            <div className="mt-3">
              <AddModifierForm groupId={group.id} onAdd={onAddModifier} />
            </div>
          </li>
        ))}
        {groups.length === 0 && (
          <li className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            No modifier groups yet.
          </li>
        )}
      </ul>
    </div>
  )
}
