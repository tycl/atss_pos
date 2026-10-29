import { mapMerchant, mapOutlet } from '../auth/merchantApi'
import type { MerchantRow, OutletRow } from '../auth/merchantApi'
import { mapCategory, mapItem, mapModifier, mapModifierGroup } from '../menu/menuApi'
import type { CategoryRow, ItemRow, ModifierGroupRow, ModifierRow } from '../menu/menuApi'
import { mapDiningTable } from '../ordering/tablesApi'
import type { DiningTableRow } from '../ordering/tablesApi'
import { mapStaff } from '../staff/staffApi'
import type { StaffRow } from '../staff/staffApi'
import { db } from '../../lib/db'
import { supabase } from '../../lib/supabaseClient'
import type { Settings } from '../../lib/types'

type ItemModifierGroupRow = { merchant_id: string; item_id: string; group_id: string }

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

/** Cloud wins for menu/tables/settings/staff (per the offline-first conflict
 * rule), so this is a plain overwrite of the local cache -- no merge logic
 * needed. Called whenever the device is online (see usePullCatalog), so the
 * POS screen -- including PIN login and manager-PIN void authorization --
 * can keep reading from Dexie regardless of connectivity. */
export async function pullCatalog(merchantId: string, outletId: string): Promise<void> {
  const [
    categories,
    items,
    modifierGroups,
    modifiers,
    itemModifierGroups,
    tables,
    settings,
    merchant,
    outlet,
    staff,
  ] = await Promise.all([
    supabase.from('categories').select('*').eq('merchant_id', merchantId),
    supabase.from('items').select('*').eq('merchant_id', merchantId),
    supabase.from('modifier_groups').select('*').eq('merchant_id', merchantId),
    supabase.from('modifiers').select('*').eq('merchant_id', merchantId),
    supabase.from('item_modifier_groups').select('*').eq('merchant_id', merchantId),
    supabase.from('tables').select('*').eq('merchant_id', merchantId).eq('outlet_id', outletId),
    supabase.from('settings').select('*').eq('outlet_id', outletId).maybeSingle(),
    supabase.from('merchants').select('*').eq('id', merchantId).single(),
    supabase.from('outlets').select('*').eq('id', outletId).single(),
    supabase.from('staff').select('*').eq('merchant_id', merchantId),
  ])

  for (const result of [
    categories,
    items,
    modifierGroups,
    modifiers,
    itemModifierGroups,
    tables,
    staff,
  ]) {
    if (result.error) throw result.error
  }
  if (settings.error) throw settings.error
  if (merchant.error) throw merchant.error
  if (outlet.error) throw outlet.error

  await db.transaction(
    'rw',
    [
      db.categories,
      db.items,
      db.modifierGroups,
      db.modifiers,
      db.itemModifierGroups,
      db.diningTables,
      db.settings,
      db.merchants,
      db.outlets,
      db.staff,
    ],
    async () => {
      await db.categories.where('merchantId').equals(merchantId).delete()
      await db.categories.bulkPut((categories.data as CategoryRow[]).map(mapCategory))

      await db.items.where('merchantId').equals(merchantId).delete()
      await db.items.bulkPut((items.data as ItemRow[]).map(mapItem))

      await db.modifierGroups.where('merchantId').equals(merchantId).delete()
      await db.modifierGroups.bulkPut(
        (modifierGroups.data as ModifierGroupRow[]).map(mapModifierGroup),
      )

      await db.modifiers.where('merchantId').equals(merchantId).delete()
      await db.modifiers.bulkPut((modifiers.data as ModifierRow[]).map(mapModifier))

      await db.itemModifierGroups.where('merchantId').equals(merchantId).delete()
      await db.itemModifierGroups.bulkPut(
        (itemModifierGroups.data as ItemModifierGroupRow[]).map((row) => ({
          merchantId: row.merchant_id,
          itemId: row.item_id,
          groupId: row.group_id,
        })),
      )

      await db.diningTables.where('outletId').equals(outletId).delete()
      await db.diningTables.bulkPut((tables.data as DiningTableRow[]).map(mapDiningTable))

      if (settings.data) {
        await db.settings.put(mapSettings(settings.data as SettingsRow))
      }

      await db.merchants.put(mapMerchant(merchant.data as MerchantRow))
      await db.outlets.put(mapOutlet(outlet.data as OutletRow))

      await db.staff.where('merchantId').equals(merchantId).delete()
      await db.staff.bulkPut((staff.data as StaffRow[]).map(mapStaff))
    },
  )
}
