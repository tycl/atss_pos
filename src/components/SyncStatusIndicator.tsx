import { useSyncEngine } from '../features/sync/useSyncEngine'
import { useOnlineStatus } from '../features/sync/useOnlineStatus'
import { db } from '../lib/db'
import { useLiveQuery } from '../lib/useLiveQuery'

export function SyncStatusIndicator() {
  const online = useOnlineStatus()
  const pendingCount = useLiveQuery(() => db.syncQueue.count(), [], 0)
  useSyncEngine()

  return (
    <div className="fixed top-3 right-3 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow">
      <span
        className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`}
        aria-hidden
      />
      <span className="text-slate-700">{online ? 'Online' : 'Offline'}</span>
      {pendingCount > 0 && <span className="text-slate-500">· {pendingCount} waiting to sync</span>}
    </div>
  )
}
