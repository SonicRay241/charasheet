import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { db } from '@/db/db'
import {
  connectDrive,
  disconnectDrive,
  isDriveConnected,
  subscribeDriveConnection,
} from '@/sync/google-auth'
import {
  isSyncConfigured,
  subscribeSyncStatus,
  syncNow,
  unshareAll,
  type SyncStatus,
} from '@/sync/sync-engine'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/terminal/confirm-dialog'

function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' })
  useEffect(() => subscribeSyncStatus(setStatus), [])
  return status
}

function useDriveConnected(): boolean {
  const [connected, setConnected] = useState(isDriveConnected())
  useEffect(() => subscribeDriveConnection(setConnected), [])
  return connected
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
  const [disconnectPrompt, setDisconnectPrompt] = useState<
    'signout' | 'remove-cloud' | null
  >(null)

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
                  void syncNow()
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
        <Button variant="outline" size="sm" onClick={() => void syncNow()}>
          Sync now
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDisconnectPrompt('signout')}
        >
          Disconnect
        </Button>
      </footer>

      <ConfirmDialog
        open={disconnectPrompt !== null}
        onOpenChange={(open) => !open && setDisconnectPrompt(null)}
        title="Disconnect Google Drive"
        description={
          disconnectPrompt === 'remove-cloud'
            ? 'Sign out and delete all charasheet files from your Google Drive? Local characters are kept.'
            : 'Sign out of Google Drive? Cloud-enabled characters stop syncing until you reconnect. Local characters are kept.'
        }
        confirmLabel={
          disconnectPrompt === 'remove-cloud' ? 'Sign out & delete cloud' : 'Sign out'
        }
        destructive={disconnectPrompt === 'remove-cloud'}
        onConfirm={() => {
          if (disconnectPrompt === 'remove-cloud') {
            void unshareAll()
          }
          disconnectDrive()
          setDisconnectPrompt(null)
          toast.success('Disconnected from Google Drive')
        }}
      />
    </>
  )
}