import { useEffect } from 'react'
import { processSyncQueue } from './syncQueue'

const POLL_INTERVAL_MS = 30_000

/** Kicks the sync queue on mount, whenever the device reconnects, and on a
 * periodic poll (catches entries whose backoff has elapsed). */
export function useSyncEngine(): void {
  useEffect(() => {
    void processSyncQueue()

    function handleOnline() {
      void processSyncQueue()
    }
    window.addEventListener('online', handleOnline)

    const interval = setInterval(() => {
      if (navigator.onLine) void processSyncQueue()
    }, POLL_INTERVAL_MS)

    return () => {
      window.removeEventListener('online', handleOnline)
      clearInterval(interval)
    }
  }, [])
}
