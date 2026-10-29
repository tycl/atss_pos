import { getOutlets } from '../features/auth/merchantApi'
import { supabase } from './supabaseClient'

const DEVICE_STORAGE_KEY = 'atss_device'

export type DeviceInfo = { deviceId: string; outletId: string; receiptPrefix: string }

function readCachedDevice(): DeviceInfo | null {
  try {
    const raw = localStorage.getItem(DEVICE_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as DeviceInfo) : null
  } catch {
    return null
  }
}

function cacheDevice(info: DeviceInfo): void {
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(info))
  } catch {
    // best-effort cache; device still works for this session
  }
}

/** Registers this browser/tablet as a device for the merchant's (first)
 * outlet on first use, then remembers it in localStorage. There is no
 * device-management UI yet (not a Phase 2 deliverable), so this is the only
 * place `devices` rows get created. */
export async function getOrCreateDevice(merchantId: string): Promise<DeviceInfo> {
  const cached = readCachedDevice()
  if (cached) return cached

  const outlets = await getOutlets(merchantId)
  const outlet = outlets[0]
  if (!outlet) throw new Error('No outlet found for this merchant')

  const { count, error: countError } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .eq('outlet_id', outlet.id)
  if (countError) throw countError

  const receiptPrefix = `T${(count ?? 0) + 1}`

  const { data, error } = await supabase
    .from('devices')
    .insert({
      merchant_id: merchantId,
      outlet_id: outlet.id,
      label: receiptPrefix,
      receipt_prefix: receiptPrefix,
    })
    .select()
    .single()
  if (error) throw error

  const info: DeviceInfo = {
    deviceId: data.id,
    outletId: outlet.id,
    receiptPrefix: data.receipt_prefix,
  }
  cacheDevice(info)
  return info
}
