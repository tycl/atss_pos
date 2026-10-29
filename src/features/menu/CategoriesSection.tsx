import { useState, type FormEvent } from 'react'
import type { Category } from '../../lib/types'

export function CategoriesSection({
  categories,
  onAdd,
  onDelete,
}: {
  categories: Category[]
  onAdd: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onAdd(name)
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    try {
      await onDelete(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 rounded border border-slate-200 bg-white p-4"
      >
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Category name, e.g. Drinks"
          className="flex-1 rounded border border-slate-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-slate-800">{category.name}</span>
            <button
              onClick={() => handleDelete(category.id)}
              className="px-2 py-2 text-sm font-medium text-red-600 underline"
            >
              Delete
            </button>
          </li>
        ))}
        {categories.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500">No categories yet.</li>
        )}
      </ul>
    </div>
  )
}
