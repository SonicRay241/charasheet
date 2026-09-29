import type { SyncSourceId } from './adapters/types'
import { gdriveAdapter } from './adapters/gdrive'
import { webdavAdapter } from './adapters/webdav'
import type { SyncAdapter } from './adapters/types'
import { subscribeConnection, emitConnectionChanged } from './adapters/connection'

const ADAPTERS: Record<SyncSourceId, SyncAdapter> = {
  gdrive: gdriveAdapter,
  webdav: webdavAdapter,
}

const SOURCE_KEY = 'sync-source'

/** Last selected sync source (persisted); gdrive until the user picks otherwise. */
export function readActiveSource(): SyncSourceId {
  const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(SOURCE_KEY)
  return raw === 'gdrive' || raw === 'webdav' ? raw : 'gdrive'
}

export function setActiveSource(source: SyncSourceId): void {
  localStorage.setItem(SOURCE_KEY, source)
  // The effective connection snapshot is (source, credentials): switching the
  // source changes it even though no adapter touched its credentials. Emit so
  // useSyncConnected() consumers re-read the new adapter's isConnected().
  emitConnectionChanged()
}

export function getAdapter(source: SyncSourceId): SyncAdapter {
  return ADAPTERS[source]
}

/** The adapter sync calls into; the persisted source picks which one. */
export function activeAdapter(): SyncAdapter {
  return ADAPTERS[readActiveSource()]
}

/**
 * Reactively tracks the active source: any adapter credential change (connect,
 * disconnect, token refresh) notifies, and the persisted source is re-read.
 * Replaces the Drive-only connection hook.
 */
export function subscribeSyncSource(listener: () => void): () => void {
  return subscribeConnection(listener)
}

export type { SyncAdapter, SyncSourceId } from './adapters/types'