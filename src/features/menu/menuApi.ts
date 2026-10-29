import { supabase } from '../../lib/supabaseClient'
import type { Category, Item, Modifier, ModifierGroup } from '../../lib/types'

export type CategoryRow = {
  id: string
  merchant_id: string
  name: string
  sort_order: number
  created_at: string
}

export type ItemRow = {
  id: string
  merchant_id: string
  category_id: string | null
  name: string
  price_sen: number
  active: boolean
  sort_order: number
  created_at: string
}

export type ModifierGroupRow = {
  id: string
  merchant_id: string
  name: string
  required: boolean
  max_select: number
  created_at: string
}

export type ModifierRow = {
  id: string
  merchant_id: string
  group_id: string
  name: string
  price_sen: number
  created_at: string
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

export function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    categoryId: row.category_id,
    name: row.name,
    priceSen: row.price_sen,
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

export function mapModifierGroup(row: ModifierGroupRow): ModifierGroup {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    required: row.required,
    maxSelect: row.max_select,
    createdAt: row.created_at,
  }
}

export function mapModifier(row: ModifierRow): Modifier {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    groupId: row.group_id,
    name: row.name,
    priceSen: row.price_sen,
    createdAt: row.created_at,
  }
}

export async function listCategories(merchantId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('sort_order')
  if (error) throw error
  return data.map(mapCategory)
}

export async function createCategory(merchantId: string, name: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ merchant_id: merchantId, name })
    .select()
    .single()
  if (error) throw error
  return mapCategory(data)
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId)
  if (error) throw error
}

export async function listItems(merchantId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('sort_order')
  if (error) throw error
  return data.map(mapItem)
}

export async function createItem(
  merchantId: string,
  categoryId: string | null,
  name: string,
  priceSen: number,
): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert({ merchant_id: merchantId, category_id: categoryId, name, price_sen: priceSen })
    .select()
    .single()
  if (error) throw error
  return mapItem(data)
}

export async function setItemActive(itemId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('items').update({ active }).eq('id', itemId)
  if (error) throw error
}

export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', itemId)
  if (error) throw error
}

export async function listModifierGroups(merchantId: string): Promise<ModifierGroup[]> {
  const { data, error } = await supabase
    .from('modifier_groups')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at')
  if (error) throw error
  return data.map(mapModifierGroup)
}

export async function createModifierGroup(
  merchantId: string,
  name: string,
  required: boolean,
  maxSelect: number,
): Promise<ModifierGroup> {
  const { data, error } = await supabase
    .from('modifier_groups')
    .insert({ merchant_id: merchantId, name, required, max_select: maxSelect })
    .select()
    .single()
  if (error) throw error
  return mapModifierGroup(data)
}

export async function deleteModifierGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('modifier_groups').delete().eq('id', groupId)
  if (error) throw error
}

export async function listModifiers(merchantId: string): Promise<Modifier[]> {
  const { data, error } = await supabase
    .from('modifiers')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at')
  if (error) throw error
  return data.map(mapModifier)
}

export async function createModifier(
  merchantId: string,
  groupId: string,
  name: string,
  priceSen: number,
): Promise<Modifier> {
  const { data, error } = await supabase
    .from('modifiers')
    .insert({ merchant_id: merchantId, group_id: groupId, name, price_sen: priceSen })
    .select()
    .single()
  if (error) throw error
  return mapModifier(data)
}

export async function deleteModifier(modifierId: string): Promise<void> {
  const { error } = await supabase.from('modifiers').delete().eq('id', modifierId)
  if (error) throw error
}

export async function getItemModifierGroupIds(itemId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('item_modifier_groups')
    .select('group_id')
    .eq('item_id', itemId)
  if (error) throw error
  return data.map((row) => row.group_id)
}

export async function setItemModifierGroups(
  merchantId: string,
  itemId: string,
  groupIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('item_modifier_groups')
    .delete()
    .eq('item_id', itemId)
  if (deleteError) throw deleteError

  if (groupIds.length === 0) return

  const { error: insertError } = await supabase
    .from('item_modifier_groups')
    .insert(
      groupIds.map((groupId) => ({ merchant_id: merchantId, item_id: itemId, group_id: groupId })),
    )
  if (insertError) throw insertError
}
