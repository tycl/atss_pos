import { useEffect, useState } from 'react'
import { BackofficeLayout } from '../../app/backoffice/BackofficeLayout'
import { getMyMembership } from '../auth/merchantApi'
import type { Category, Item, Modifier, ModifierGroup } from '../../lib/types'
import { CategoriesSection } from './CategoriesSection'
import { ItemsSection } from './ItemsSection'
import {
  createCategory,
  createItem,
  createModifier,
  createModifierGroup,
  deleteCategory,
  deleteItem,
  deleteModifier,
  deleteModifierGroup,
  listCategories,
  listItems,
  listModifierGroups,
  listModifiers,
  setItemActive,
  setItemModifierGroups,
} from './menuApi'
import { ModifierGroupsSection } from './ModifierGroupsSection'

type Tab = 'categories' | 'items' | 'modifiers'

const TABS: { id: Tab; label: string }[] = [
  { id: 'categories', label: 'Categories' },
  { id: 'items', label: 'Items' },
  { id: 'modifiers', label: 'Modifier groups' },
]

export function MenuPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('categories')
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([])
  const [modifiers, setModifiers] = useState<Modifier[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    getMyMembership()
      .then(async (membership) => {
        if (!membership) return
        setMerchantId(membership.merchantId)
        const [categoryList, itemList, groupList, modifierList] = await Promise.all([
          listCategories(membership.merchantId),
          listItems(membership.merchantId),
          listModifierGroups(membership.merchantId),
          listModifiers(membership.merchantId),
        ])
        setCategories(categoryList)
        setItems(itemList)
        setModifierGroups(groupList)
        setModifiers(modifierList)
      })
      .catch((err: unknown) =>
        setLoadError(err instanceof Error ? err.message : 'Failed to load menu'),
      )
  }, [])

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <p className="text-slate-700">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded bg-slate-800 px-4 py-2 text-white"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!merchantId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    )
  }

  return (
    <BackofficeLayout title="Menu">
      <div className="flex gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              tab === item.id
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'categories' && (
        <CategoriesSection
          categories={categories}
          onAdd={async (name) => {
            const created = await createCategory(merchantId, name)
            setCategories((current) => [...current, created])
          }}
          onDelete={async (id) => {
            await deleteCategory(id)
            setCategories((current) => current.filter((category) => category.id !== id))
          }}
        />
      )}

      {tab === 'items' && (
        <ItemsSection
          items={items}
          categories={categories}
          modifierGroups={modifierGroups}
          onAdd={async (name, categoryId, priceSen, modifierGroupIds) => {
            const created = await createItem(merchantId, categoryId, name, priceSen)
            if (modifierGroupIds.length > 0) {
              await setItemModifierGroups(merchantId, created.id, modifierGroupIds)
            }
            setItems((current) => [...current, created])
          }}
          onToggleActive={async (item) => {
            await setItemActive(item.id, !item.active)
            setItems((current) =>
              current.map((existing) =>
                existing.id === item.id ? { ...existing, active: !existing.active } : existing,
              ),
            )
          }}
          onDelete={async (id) => {
            await deleteItem(id)
            setItems((current) => current.filter((item) => item.id !== id))
          }}
        />
      )}

      {tab === 'modifiers' && (
        <ModifierGroupsSection
          groups={modifierGroups}
          modifiers={modifiers}
          onAddGroup={async (name, required, maxSelect) => {
            const created = await createModifierGroup(merchantId, name, required, maxSelect)
            setModifierGroups((current) => [...current, created])
          }}
          onDeleteGroup={async (id) => {
            await deleteModifierGroup(id)
            setModifierGroups((current) => current.filter((group) => group.id !== id))
          }}
          onAddModifier={async (groupId, name, priceSen) => {
            const created = await createModifier(merchantId, groupId, name, priceSen)
            setModifiers((current) => [...current, created])
          }}
          onDeleteModifier={async (id) => {
            await deleteModifier(id)
            setModifiers((current) => current.filter((modifier) => modifier.id !== id))
          }}
        />
      )}
    </BackofficeLayout>
  )
}
