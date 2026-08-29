import { db } from '@/db/db'
import { parse } from 'yaml'
import { parseCharacterData } from '@/db/transfer'
import {
  characterPayload,
  deleteFile,
  downloadFile,
  readIndex,
  sha256Hex,
  uploadFile,
  writeIndex,
  type DriveIndex,
} from './drive-store'
import { getValidAccessToken } from './google-auth'

export interface SyncResult {
  pushed: number
  pulled: number
  deleted: number
}

const PUSH_DEBOUNCE_MS = 2000
let pushTimer: ReturnType<typeof setTimeout> | null = null
let syncing = false

/** Schedule a debounced cloud sync, e.g. after any character edit. */
export function scheduleSync(): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void syncAll()
    // Failures surface via the footer status; no unhandled rejection.
  }, PUSH_DEBOUNCE_MS)
}

export function isSyncConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GDRIVE_CLIENT_ID)
}

// --- Sync status store (consumed by the footer) ---
export type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'error'; message: string }

let statusListeners: ((status: SyncStatus) => void)[] = []
let currentStatus: SyncStatus = { state: 'idle' }

export function setSyncStatus(status: SyncStatus): void {
  currentStatus = status
  for (const listener of statusListeners) listener(status)
}

export function getSyncStatus(): SyncStatus {
  return currentStatus
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  statusListeners.push(listener)
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener)
  }
}

/** Run syncAll with status reporting for the footer. */
export async function syncNow(): Promise<void> {
  setSyncStatus({ state: 'syncing' })
  try {
    await syncAll()
    setSyncStatus({ state: 'idle' })
  } catch (error) {
    setSyncStatus({
      state: 'error',
      message: error instanceof Error ? error.message : 'unknown error',
    })
    throw error
  }
}

function sanitize(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug === '' ? 'character' : slug
}

/** Full two-way sync for all characters where cloudSynced === true. */
export async function syncAll(): Promise<SyncResult> {
  if (syncing) return { pushed: 0, pulled: 0, deleted: 0 }
  syncing = true
  try {
    const token = await getValidAccessToken()
    if (!token) throw new Error('Not connected to Google Drive.')

    const { index, fileId: indexFileId } = await readIndex()
    const result: SyncResult = { pushed: 0, pulled: 0, deleted: 0 }
    await reconcile(index, result)

    const newIndexFileId = await writeIndex(index, indexFileId ?? undefined)
    await db.syncMeta.put({
      key: 'index',
      fileId: newIndexFileId,
      lastSyncedAt: new Date().toISOString(),
    })
    return result
  } finally {
    syncing = false
  }
}

/**
 * Per-character reconciliation. Mutates `index.entries` in place; tallies
 * pulls/pushes/deletes into `result`.
 */
async function reconcile(index: DriveIndex, result: SyncResult): Promise<void> {
  const localChars = await db.characters.toArray()
  const localById = new Map(localChars.map((c) => [c.id, c]))
  const metas = await db.characterSyncMeta.toArray()
  const metaById = new Map(metas.map((m) => [m.id, m]))

  // --- Pull phase: remote entries new or changed relative to local.
  for (const [id, entry] of Object.entries(index.entries)) {
    const local = localById.get(id)

    if (entry.deletedAt) {
      // Tombstone: delete locally only if the tombstone is newer than the
      // last local edit (optimistic concurrency on updatedAt).
      if (local && entry.deletedAt >= (local.updatedAt ?? 0)) {
        await db.characters.delete(id)
        await db.characterSyncMeta.delete(id)
        result.deleted += 1
      } else if (!local) {
        // Remote delete of something this device never had — nothing to do
        // except drop the tombstone once recorded locally.
        await db.deletedCharacters.delete(id)
      }
      continue
    }

    if (!local) {
      // A local delete may be pending upload as a tombstone; don't resurrect.
      const pendingDelete = await db.deletedCharacters.get(id)
      if (pendingDelete) {
        index.entries[id] = { ...entry, deletedAt: pendingDelete.deletedAt }
        try {
          await deleteFile(entry.fileId)
        } catch {
          // Already gone.
        }
        await db.characterSyncMeta.delete(id)
        result.deleted += 1
        continue
      }
      const yaml = await downloadFile(entry.fileId)
      const parsed = hydrateCharacter(yaml, id)
      await db.characters.put(parsed)
      await db.characterSyncMeta.put({ id, lastPushedHash: entry.hash, fileId: entry.fileId })
      result.pulled += 1
      continue
    }

    if (!local.cloudSynced) continue

    const localHash = await sha256Hex(characterPayload(local))
    if (localHash === entry.hash) {
      // Content identical — nothing to transfer.
      await db.characterSyncMeta.put({ id, lastPushedHash: entry.hash, fileId: entry.fileId })
      continue
    }
    // Diverged: last-write-wins on updatedAt.
    if ((local.updatedAt ?? 0) < entry.updatedAt) {
      const yaml = await downloadFile(entry.fileId)
      const parsed = hydrateCharacter(yaml, id)
      await db.characters.put(parsed)
      await db.characterSyncMeta.put({ id, lastPushedHash: entry.hash, fileId: entry.fileId })
      result.pulled += 1
    }
    // else: local wins; push phase uploads its newer content.
  }

  // --- Local deletes pending propagation: tombstone the cloud copy.
  const pendingDeletes = await db.deletedCharacters.toArray()
  for (const pending of pendingDeletes) {
    const entry = index.entries[pending.id]
    if (!entry) {
      // Nothing in the cloud (never pushed, or opt-out already cleaned it).
      await db.deletedCharacters.delete(pending.id)
      continue
    }
    // A newer cloud edit beats an older local delete: give up the tombstone.
    if (entry.updatedAt > pending.deletedAt && !entry.deletedAt) {
      await db.deletedCharacters.delete(pending.id)
      continue
    }
    index.entries[pending.id] = { ...entry, deletedAt: pending.deletedAt }
    try {
      await deleteFile(entry.fileId)
    } catch {
      // Already gone.
    }
    await db.characterSyncMeta.delete(pending.id)
    result.deleted += 1
    // Keep the tombstone record locally so other-device pulls stay consistent
    // until the next sync's pull phase clears it.
  }

  // --- Push phase: characters flagged cloudSynced.
  for (const character of localChars) {
    if (!character.cloudSynced) {
      // Opted out locally: remove the cloud copy and the index entry.
      // This is NOT a delete of the character — the local row stays.
      if (index.entries[character.id]) {
        const meta = metaById.get(character.id)
        if (meta?.fileId) {
          try {
            await deleteFile(meta.fileId)
          } catch {
            // Already gone — index cleanup is enough.
          }
        }
        delete index.entries[character.id]
        await db.characterSyncMeta.delete(character.id)
      }
      continue
    }

    const meta = metaById.get(character.id)
    const hash = await sha256Hex(characterPayload(character))
    const entry = index.entries[character.id]

    if (meta?.lastPushedHash === hash && entry) {
      continue // unchanged since last push — skip upload entirely
    }

    // id-suffixed filename: renames never collide, ids stay traceable.
    const fileId = await uploadFile(
      `${sanitize(character.name)}.${character.id.slice(0, 8)}.yaml`,
      characterPayload(character),
      meta?.fileId,
    )
    index.entries[character.id] = {
      id: character.id,
      fileId,
      hash,
      name: character.name,
      updatedAt: character.updatedAt,
    }
    await db.characterSyncMeta.put({ id: character.id, lastPushedHash: hash, fileId })
    result.pushed += 1
  }
}

function safeYaml(source: string): unknown {
  try {
    return parse(source)
  } catch {
    throw new Error('Synced character file is not valid YAML.')
  }
}

/** Parse + normalize a synced YAML payload into a Character. */
function hydrateCharacter(yaml: string, id: string) {
  const parsed = parseCharacterData(safeYaml(yaml))
  parsed.id = id
  return parsed
}

/** Delete all cloud files and local sync bookkeeping (keep characters local). */
export async function unshareAll(): Promise<void> {
  const { index, fileId: indexFileId } = await readIndex()
  for (const entry of Object.values(index.entries)) {
    if (!entry.deletedAt) {
      try {
        await deleteFile(entry.fileId)
      } catch {
        // Already gone.
      }
    }
  }
  if (indexFileId) await deleteFile(indexFileId)
  await db.characterSyncMeta.clear()
  await db.syncMeta.clear()
  await db.deletedCharacters.clear()
}