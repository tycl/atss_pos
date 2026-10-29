import { useEffect } from 'react'
import { pullCatalog } from './pullCatalog'

/** Refreshes the local menu/tables/settings cache on mount and whenever the
 * device reconnects, so the POS screen keeps working from the last-known
 * catalog while offline (cloud wins on reconnect, per the offline-first
 * rules). */
export function usePullCatalog(merchantId: string | null, outletId: string | null): void {
  useEffect(() => {
    if (!merchantId || !outletId) return
    const mId = merchantId
    const oId = outletId

    function pull() {
      pullCatalog(mId, oId).catch((err: unknown) => console.error('catalog pull failed', err))
    }

    pull()
    window.addEventListener('online', pull)
    return () => window.removeEventListener('online', pull)
  }, [merchantId, outletId])
}
