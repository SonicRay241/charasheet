import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { db } from '@/db/db'
import {
  subscribeSyncStatus,
  type SyncStatus,
} from '@/sync/sync-engine'
import { activeAdapter } from '@/sync/sync-sources'
import { useSyncConnected } from '@/hooks/use-sync-connected'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/terminal/confirm-dialog'
import { DriveProviderDialog } from '@/components/sync/drive-provider-dialog'
import { runSyncNow } from '@/components/sync/sync-actions'

function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' })
  useEffect(() => subscribeSyncStatus(setStatus), [])
  return status
}

export function SyncFooter() {
  const connected = useSyncConnected()
  const status = useSyncStatus()
  const characterCount = useLiveQuery(() => db.characters.count())
  const cloudCount = useLiveQuery(
    () => db.characters.filter((c) => c.cloudSynced === true).count(),
  )
  const lastSyncedAt = useLiveQuery(
    async () => (await db.syncMeta.get('index'))?.lastSyncedAt,
  )
  const [signOutPrompt, setSignOutPrompt] = useState(false)
  const [providerPrompt, setProviderPrompt] = useState(false)

  const label = activeAdapter().label

  if (!connected) {
    return (
      <>
        <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-border p-3 text-xs text-muted-foreground">
          <span>Want to sync across devices?</span>
          <button
            type="button"
            className="terminal-label inline-block cursor-pointer text-xs"
            onClick={() => setProviderPrompt(true)}
          >
            Connect to drive provider
          </button>
        </footer>
        <DriveProviderDialog open={providerPrompt} onOpenChange={setProviderPrompt} />
      </>
    )
  }

  const lastSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString()
    : 'never'

  return (
    <>
      <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-border p-3 text-xs text-muted-foreground">
        <span>
          {status.state === 'syncing'
            ? 'Syncing...'
            : status.state === 'error'
              ? `Sync error: ${status.message}`
              : `Synced ${lastSync} · ${cloudCount ?? 0}/${characterCount ?? 0} characters in ${label}`}
        </span>
        <Button variant="outline" size="sm" onClick={runSyncNow}>
          Sync now
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setSignOutPrompt(true)}
        >
          Disconnect
        </Button>
      </footer>

      <ConfirmDialog
        open={signOutPrompt}
        onOpenChange={(open) => !open && setSignOutPrompt(false)}
        title={`Disconnect ${label}`}
        description={`Sign out of ${label}? Cloud-enabled characters stop syncing until you reconnect. Local characters are kept.`}
        confirmLabel="Sign out"
        destructive
        onConfirm={() => {
          activeAdapter().disconnect()
          setSignOutPrompt(false)
          toast.success(`Disconnected from ${label}`)
        }}
      />
    </>
  )
}