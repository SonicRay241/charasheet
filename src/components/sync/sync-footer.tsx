import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { db } from '@/db/db'
import { connectDrive, disconnectDrive } from '@/sync/google-auth'
import {
  isSyncConfigured,
  subscribeSyncStatus,
  syncNow,
  type SyncStatus,
} from '@/sync/sync-engine'
import { useDriveConnected } from '@/hooks/use-drive-connected'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/terminal/confirm-dialog'

function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' })
  useEffect(() => subscribeSyncStatus(setStatus), [])
  return status
}

/** syncNow that reports failures as toasts instead of unhandled rejections. */
function runSyncNow(): void {
  syncNow().catch((error: unknown) =>
    toast.error(error instanceof Error ? error.message : 'Sync failed'),
  )
}

export function SyncFooter() {
  const connected = useDriveConnected()
  const configured = isSyncConfigured()
  const status = useSyncStatus()
  const characterCount = useLiveQuery(() => db.characters.count())
  const cloudCount = useLiveQuery(
    () => db.characters.filter((c) => c.cloudSynced === true).count(),
  )
  const lastSyncedAt = useLiveQuery(
    async () => (await db.syncMeta.get('index'))?.lastSyncedAt,
  )
  const [signOutPrompt, setSignOutPrompt] = useState(false)

  if (!configured) return null
  if (!connected) {
    return (
      <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-border p-3 text-xs text-muted-foreground">
        <span>
          Want to sync across devices?{' '}
          <button
            type="button"
            className="terminal-label inline-block cursor-pointer text-xs"
            onClick={() => {
              connectDrive()
                .then(() => {
                  toast.success('Connected to Google Drive')
                  runSyncNow()
                })
                .catch((error: unknown) =>
                  toast.error(
                    error instanceof Error ? error.message : 'Connection failed',
                  ),
                )
            }}
          >
            Connect to Google Drive
          </button>
        </span>
      </footer>
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
              : `Synced ${lastSync} · ${cloudCount ?? 0}/${characterCount ?? 0} characters in cloud`}
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
        title="Disconnect Google Drive"
        description="Sign out of Google Drive? Cloud-enabled characters stop syncing until you reconnect. Local characters are kept."
        confirmLabel="Sign out"
        destructive
        onConfirm={() => {
          disconnectDrive()
          setSignOutPrompt(false)
          toast.success('Disconnected from Google Drive')
        }}
      />
    </>
  )
}