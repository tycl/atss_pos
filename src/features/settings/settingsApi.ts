import { supabase } from '../../lib/supabaseClient'
import type { Settings } from '../../lib/types'

type SettingsRow = {
  outlet_id: string
  merchant_id: string
  sst_enabled: boolean
  sst_rate_bp: number
  service_charge_enabled: boolean
  service_charge_rate_bp: number
  cash_rounding_enabled: boolean
  created_at: string
}

function mapSettings(row: SettingsRow): Settings {
  return {
    outletId: row.outlet_id,
    merchantId: row.merchant_id,
    sstEnabled: row.sst_enabled,
    sstRateBp: row.sst_rate_bp,
    serviceChargeEnabled: row.service_charge_enabled,
    serviceChargeRateBp: row.service_charge_rate_bp,
    cashRoundingEnabled: row.cash_rounding_enabled,
    createdAt: row.created_at,
  }
}

export async function getSettings(outletId: string): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('outlet_id', outletId)
    .maybeSingle()
  if (error) throw error
  return data ? mapSettings(data) : null
}

export async function upsertSettings(
  merchantId: string,
  outletId: string,
  values: {
    sstEnabled: boolean
    sstRateBp: number
    serviceChargeEnabled: boolean
    serviceChargeRateBp: number
    cashRoundingEnabled: boolean
  },
): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .upsert({
      outlet_id: outletId,
      merchant_id: merchantId,
      sst_enabled: values.sstEnabled,
      sst_rate_bp: values.sstRateBp,
      service_charge_enabled: values.serviceChargeEnabled,
      service_charge_rate_bp: values.serviceChargeRateBp,
      cash_rounding_enabled: values.cashRoundingEnabled,
    })
    .select()
    .single()
  if (error) throw error
  return mapSettings(data)
}
