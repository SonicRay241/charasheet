import { toast } from 'sonner'
import { syncNow } from '@/sync/sync-engine'

/** syncNow that reports failures as toasts instead of unhandled rejections. */
export function runSyncNow(): void {
  syncNow().catch((error: unknown) =>
    toast.error(error instanceof Error ? error.message : 'Sync failed'),
  )
}