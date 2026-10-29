import type { Category } from '../../lib/types'

export const ALL_CATEGORIES = 'all'

export function CategoryTabs({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[]
  selected: string
  onSelect: (categoryId: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onSelect(ALL_CATEGORIES)}
        className={`min-h-11 shrink-0 rounded-full px-4 py-2.5 text-sm font-medium ${
          selected === ALL_CATEGORIES
            ? 'bg-slate-800 text-white'
            : 'border border-slate-300 bg-white text-slate-700'
        }`}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`min-h-11 shrink-0 rounded-full px-4 py-2.5 text-sm font-medium ${
            selected === category.id
              ? 'bg-slate-800 text-white'
              : 'border border-slate-300 bg-white text-slate-700'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
