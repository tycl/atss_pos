import { hashPin } from '../../lib/pin'
import { supabase } from '../../lib/supabaseClient'
import type { Staff, StaffRole } from '../../lib/types'

export type StaffRow = {
  id: string
  merchant_id: string
  name: string
  role: StaffRole
  pin_hash: string
  active: boolean
  created_at: string
}

export function mapStaff(row: StaffRow): Staff {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    role: row.role,
    pinHash: row.pin_hash,
    active: row.active,
    createdAt: row.created_at,
  }
}

export async function listStaff(merchantId: string): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at')
  if (error) throw error
  return data.map(mapStaff)
}

export async function createStaff(
  merchantId: string,
  name: string,
  role: StaffRole,
  pin: string,
): Promise<Staff> {
  const pinHash = await hashPin(pin)
  const { data, error } = await supabase
    .from('staff')
    .insert({ merchant_id: merchantId, name, role, pin_hash: pinHash })
    .select()
    .single()
  if (error) throw error
  return mapStaff(data)
}

export async function setStaffActive(staffId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('staff').update({ active }).eq('id', staffId)
  if (error) throw error
}
