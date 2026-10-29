import { supabase } from '../../lib/supabaseClient'
import type { DiningTable } from '../../lib/types'

export type DiningTableRow = {
  id: string
  merchant_id: string
  outlet_id: string
  name: string
  sort_order: number
  created_at: string
}

export function mapDiningTable(row: DiningTableRow): DiningTable {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    outletId: row.outlet_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

export async function listTables(merchantId: string, outletId: string): Promise<DiningTable[]> {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('outlet_id', outletId)
    .order('sort_order')
  if (error) throw error
  return data.map(mapDiningTable)
}

export async function createTable(
  merchantId: string,
  outletId: string,
  name: string,
): Promise<DiningTable> {
  const { data, error } = await supabase
    .from('tables')
    .insert({ merchant_id: merchantId, outlet_id: outletId, name })
    .select()
    .single()
  if (error) throw error
  return mapDiningTable(data)
}
