import { supabase } from '../../lib/supabaseClient'
import type { Merchant, Outlet, StaffRole } from '../../lib/types'

export type MerchantRow = {
  id: string
  name: string
  ssm_no: string | null
  sst_no: string | null
  address: string | null
  phone: string | null
  logo_url: string | null
  duitnow_qr_url: string | null
  plan: string
  status: Merchant['status']
  created_at: string
}

export type OutletRow = {
  id: string
  merchant_id: string
  name: string
  address: string | null
  receipt_footer: string | null
  created_at: string
}

export function mapMerchant(row: MerchantRow): Merchant {
  return {
    id: row.id,
    name: row.name,
    ssmNo: row.ssm_no,
    sstNo: row.sst_no,
    address: row.address,
    phone: row.phone,
    logoUrl: row.logo_url,
    duitnowQrUrl: row.duitnow_qr_url,
    plan: row.plan,
    status: row.status,
    createdAt: row.created_at,
  }
}

export function mapOutlet(row: OutletRow): Outlet {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    address: row.address,
    receiptFooter: row.receipt_footer,
    createdAt: row.created_at,
  }
}

export type Membership = { merchantId: string; role: Extract<StaffRole, 'owner' | 'manager'> }

/** The merchant(s) the signed-in user belongs to. A device/owner account is
 * expected to belong to exactly one merchant for the MVP, so we take the first. */
export async function getMyMembership(): Promise<Membership | null> {
  const { data, error } = await supabase.from('merchant_users').select('merchant_id, role').limit(1)
  if (error) throw error
  const row = data[0]
  if (!row) return null
  return { merchantId: row.merchant_id, role: row.role }
}

export async function getMerchant(merchantId: string): Promise<Merchant> {
  const { data, error } = await supabase.from('merchants').select('*').eq('id', merchantId).single()
  if (error) throw error
  return mapMerchant(data)
}

export async function getOutlets(merchantId: string): Promise<Outlet[]> {
  const { data, error } = await supabase
    .from('outlets')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at')
  if (error) throw error
  return data.map(mapOutlet)
}

/** Bootstraps a brand-new tenant: creates the merchant, claims ownership for
 * the current user, then creates the first outlet. Relies on the RLS policy
 * that only allows claiming 'owner' on a merchant that has no members yet. */
export async function createMerchantAndOutlet(
  merchantName: string,
  outletName: string,
): Promise<{ merchant: Merchant; outlet: Outlet }> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('Not signed in')

  const { data: merchantRow, error: merchantError } = await supabase
    .from('merchants')
    .insert({ name: merchantName })
    .select()
    .single()
  if (merchantError) throw merchantError

  const { error: membershipError } = await supabase
    .from('merchant_users')
    .insert({ merchant_id: merchantRow.id, user_id: userId, role: 'owner' })
  if (membershipError) throw membershipError

  const { data: outletRow, error: outletError } = await supabase
    .from('outlets')
    .insert({ merchant_id: merchantRow.id, name: outletName })
    .select()
    .single()
  if (outletError) throw outletError

  return { merchant: mapMerchant(merchantRow), outlet: mapOutlet(outletRow) }
}

export async function updateDuitnowQrUrl(merchantId: string, url: string | null): Promise<void> {
  const { error } = await supabase
    .from('merchants')
    .update({ duitnow_qr_url: url })
    .eq('id', merchantId)
  if (error) throw error
}
