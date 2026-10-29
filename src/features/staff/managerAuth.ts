import { db } from '../../lib/db'
import { verifyPin } from '../../lib/pin'
import type { Staff } from '../../lib/types'

/** Checks a PIN against every active owner/manager for the merchant,
 * returning whoever matches. Reads from the local Dexie cache (populated by
 * pullCatalog) so voids can be authorized offline. */
export async function authorizeManagerPin(merchantId: string, pin: string): Promise<Staff | null> {
  const candidates = await db.staff
    .where('merchantId')
    .equals(merchantId)
    .filter((member) => member.active && (member.role === 'owner' || member.role === 'manager'))
    .toArray()

  for (const member of candidates) {
    if (await verifyPin(pin, member.pinHash)) {
      return member
    }
  }
  return null
}
