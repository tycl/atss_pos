import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

/** Subscribes to a Dexie liveQuery for the lifetime of the component, so the
 * UI updates automatically whenever the underlying IndexedDB data changes
 * (e.g. after a menu pull or a local cart write). */
export function useLiveQuery<T>(query: () => Promise<T>, deps: unknown[], initial: T): T {
  const [value, setValue] = useState<T>(initial)

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: setValue,
      error: (err: unknown) => console.error('liveQuery error', err),
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return value
}
