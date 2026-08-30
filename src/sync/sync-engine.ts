import { db, type Character } from '@/db/db'
import { parse } from 'yaml'
import { parseCharacterData } from '@/db/transfer'
import {
  characterPayload,
  deleteFile,
  downloadFile,
  isNotFound,
  readIndex,
  sha256Hex,
  uploadFile,
  writeIndex,
  type DriveIndex,
} from './drive-store'
import { getValidAccessToken } from './google-auth'
import { sanitizeFilename } from '@/db/transfer'

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
  // Connection checked inside the callback: importing isDriveConnected at
  // module scope creates an import cycle that breaks under node tests.
  pushTimer = setTimeout(async () => {
    pushTimer = null
    if (!(await hasDriveSession())) return
    try {
      await syncAll()
    } catch (error) {
      setSyncStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'unknown error',
      })
    }
  }, PUSH_DEBOUNCE_MS)
}

/** Token-presence check that tolerates non-browser environments.
 *
 * Dynamic import is deliberate (not a bundler-workaround): google-auth
 * touches localStorage at call time, and this module is imported by
 * db/characters.ts which node tests load without a DOM. The lazy import
 * defers that edge until a browser context actually schedules a sync.
 * Vite flags it as INEFFECTIVE_DYNAMIC_IMPORT because google-auth is also
 * statically reachable elsewhere — expected, the lazy edge is what matters.
 */
async function hasDriveSession(): Promise<boolean> {
  try {
    const { isDriveConnected } = await import('./google-auth')
    return isDriveConnected()
  } catch {
    return false
  }
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

// --- Refocus sync: pull remote changes when the tab regains focus. ---
const REFOCUS_THROTTLE_MS = 10_000
let lastRefocusSync = 0

async function refocusSync(): Promise<void> {
  // Reserve the throttle slot synchronously: visibilitychange and focus can
  // fire in the same refocus, and this must reject the second before either
  // hits its first await.
  const now = Date.now()
  if (now - lastRefocusSync < REFOCUS_THROTTLE_MS) return
  lastRefocusSync = now
  if (!(await hasDriveSession())) return
  try {
    await syncAll()
  } catch {
    // Silent: refocus pulls are opportunistic; footer shows manual errors.
    lastRefocusSync = 0 // allow an immediate retry on the next focus
  }
}

/** Install the visibility-change listener (called once from main.tsx). */
export function installRefocusSync(): void {
  if (typeof document === 'undefined') return
  // visibilitychange alone covers tab switches; window focus events on the
  // same transition would just race it through the shared throttle.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refocusSync()
  })
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
  // Snapshot for the pull phase only; the push phase re-reads fresh state
  // below (the pull can persist merged rows and stamped meta).
  const localChars = await db.characters.toArray()
  const localById = new Map(localChars.map((c) => [c.id, c]))

  // --- Pull phase: remote entries new or changed relative to local.
  for (const [id, entry] of Object.entries(index.entries)) {
    const local = localById.get(id)

    if (entry.deletedAt) {
      // Tombstone: apply only if newer than both the last local edit and the
      // last local opt-IN (optimistic concurrency on timestamps).
      const newerThanEdit = entry.deletedAt >= (local?.updatedAt ?? 0)
      const newerThanOptIn =
        local?.cloudSyncedAt === undefined || entry.deletedAt > local.cloudSyncedAt
      if (local && newerThanEdit && newerThanOptIn) {
        if (entry.optedOut) {
          // Origin device kept its copy but left the cloud; follow suit by
          // disabling sync locally instead of deleting the character.
          if (local.cloudSynced) {
            await db.characters.update(id, { cloudSynced: false })
            await db.characterSyncMeta.delete(id)
          }
        } else {
          await db.characters.delete(id)
          await db.characterSyncMeta.delete(id)
          result.deleted += 1
        }
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
      let yaml: string
      try {
        yaml = await downloadFile(entry.fileId)
      } catch (error) {
        if (isNotFound(error)) {
          // Drive file vanished (crash between deleteFile and writeIndex, or
          // manual deletion): nothing to pull. Clearing the index entry lets
          // the push phase re-create it from another device's copy.
          delete index.entries[id]
          continue
        }
        throw error
      }
      const parsed = hydrateCharacter(yaml, id, entry.updatedAt)
      // Pulled = this device wants it; keep the checkbox on so the next
      // push phase doesn't mistake it for a local opt-out.
      parsed.cloudSynced = true
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
    // Diverged: merge field-by-field, later timestamp wins per field (a
    // LWW-Register CRDT). Falls back to updatedAt for legacy payloads
    // without fieldTimestamps.
    let yaml: string
    try {
      yaml = await downloadFile(entry.fileId)
    } catch (error) {
      if (isNotFound(error)) {
        // Cloud file gone: adopt local as the merge winner and let the push
        // phase re-create the file (uploadFile also self-heals stale ids).
        continue
      }
      throw error
    }
    const remote = hydrateCharacter(yaml, id, entry.updatedAt)
    const merged = mergeCharacter(local, remote)
    merged.cloudSynced = local.cloudSynced
    merged.cloudSyncedAt = local.cloudSyncedAt
    // Compare by content: mergeCharacter always allocates a new object.
    const localPayload = characterPayload(local)
    const mergedPayload = characterPayload(merged)
    if (mergedPayload === localPayload) {
      // Merge resolved entirely to local content; push phase uploads it.
      continue
    }
    // Merge adopted remote content (wholly or partly). Persist the merged
    // row and record its hash in meta: when the merge settled everything
    // (pure remote win) the push phase's content comparison matches the
    // index and skips; a merged hybrid differs and gets re-pushed.
    merged.updatedAt = Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0, entry.updatedAt)
    await db.characters.put(merged)
    const mergedHash = await sha256Hex(mergedPayload)
    await db.characterSyncMeta.put({ id, lastPushedHash: mergedHash, fileId: entry.fileId })
    result.pulled += 1
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
  // Re-read state: the pull phase may have persisted merged rows and stamped
  // meta. Iterating the pre-pull snapshot here would resurrect stale content
  // and clobber remote-won fields in the freshly written cloud file.
  const pushChars = await db.characters.toArray()
  const pushMetas = await db.characterSyncMeta.toArray()
  const pushMetaById = new Map(pushMetas.map((m) => [m.id, m]))
  for (const character of pushChars) {
    if (!character.cloudSynced) {
      // Opted out locally: tombstone the cloud copy so OTHER devices remove
      // theirs. This is not a character delete on this device — the local
      // row stays, its payload just left the shared cloud.
      const existing = index.entries[character.id]
      if (existing && !existing.deletedAt) {
        index.entries[character.id] = {
          ...existing,
          deletedAt: Date.now(),
          optedOut: true,
        }
        const meta = pushMetaById.get(character.id)
        if (meta?.fileId) {
          try {
            await deleteFile(meta.fileId)
          } catch {
            // Already gone — tombstone is enough.
          }
        }
        await db.characterSyncMeta.delete(character.id)
      }
      continue
    }

    const meta = pushMetaById.get(character.id)
    const hash = await sha256Hex(characterPayload(character))
    const entry = index.entries[character.id]

    // The cloud index is the source of truth for file identity: if it
    // disagrees with local meta (other device re-created or removed the
    // file), adopt the index's fileId.
    const knownFileId = entry?.fileId ?? meta?.fileId

    // Skip only when the local content hash matches BOTH the last push we
    // recorded AND the index's current hash. entry.hash must be checked too:
    // a hybrid merge during the pull phase stamps meta with the merged hash
    // while the index still holds the old remote hash — without that check
    // the push would skip and the merged content would never reach the
    // cloud (it only healed if another device pushed later).
    if (
      meta?.lastPushedHash === hash &&
      entry &&
      entry.hash === hash &&
      entry.fileId === knownFileId
    ) {
      continue // unchanged since last push — skip upload entirely
    }

    // id-suffixed filename: renames never collide, ids stay traceable.
    const fileId = await uploadFile(
      `${sanitizeFilename(character.name)}.${character.id.slice(0, 8)}.yaml`,
      characterPayload(character),
      knownFileId,
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

/** Parse + normalize a synced YAML payload into a Character. The index's
 * updatedAt is authoritative for the row (payloads strip runtime stamps). */
function hydrateCharacter(yaml: string, id: string, rowUpdatedAt: number) {
  const parsed = parseCharacterData(safeYaml(yaml))
  parsed.id = id
  parsed.updatedAt = rowUpdatedAt
  return parsed
}

const MERGEABLE_FIELDS = [
  'name',
  'className',
  'level',
  'race',
  'alignment',
  'inspiration',
  'proficiencyBonus',
  'saveOverridesEnabled',
  'savingThrowOverrides',
  'skillOverridesEnabled',
  'skillOverrides',
  'armorClass',
  'initiativeOverride',
  'speed',
  'hitPointMaximum',
  'currentHitPoints',
  'temporaryHitPoints',
  'hitDiceTotal',
  'deathSaves',
  'skillProficiencies',
  'skillHalfProficiencies',
  'weapons',
  'equipment',
  'spells',
  'personalityTraits',
  'ideals',
  'bonds',
  'flaws',
  'alliesAndOrganizations',
  'backstory',
  'treasures',
] as const

const ABILITY_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

/**
 * LWW-Register merge: for each field, later per-field timestamp wins.
 * Timestamp ties go to remote (deterministic across devices). Fields missing
 * from both timestamp maps fall back to whole-row updatedAt. Does not mutate
 * its inputs.
 */
export function mergeCharacter(local: Character, remote: Character): Character {
  const localTs = local.fieldTimestamps ?? {}
  const remoteTs = remote.fieldTimestamps ?? {}
  const localRowTs = local.updatedAt ?? 0
  const remoteRowTs = remote.updatedAt ?? 0

  const merged: Character = { ...local }

  const pick = (field: string, remoteValue: unknown, fallbackWinner: 'local' | 'remote') => {
    const lt = localTs[field]
    const rt = remoteTs[field]
    // Explicit field stamps win outright over row-level fallbacks: a stamp
    // proves the side actually wrote this field, whereas row updatedAt can
    // be fresher due to an unrelated field's edit.
    if (lt !== undefined && rt !== undefined) {
      if (rt > lt || (rt === lt && fallbackWinner === 'remote')) {
        ;(merged as unknown as Record<string, unknown>)[field] = remoteValue
      }
      return
    }
    if (rt !== undefined && lt === undefined) {
      ;(merged as unknown as Record<string, unknown>)[field] = remoteValue
      return
    }
    if (lt !== undefined && rt === undefined) return // local wrote it; remote never did
    // Neither side has a stamp for this field: row-level fallback.
    const lft = localRowTs
    const rft = remoteRowTs
    if (rft > lft || (rft === lft && fallbackWinner === 'remote')) {
      ;(merged as unknown as Record<string, unknown>)[field] = remoteValue
    }
  }

  for (const field of MERGEABLE_FIELDS) {
    pick(field, remote[field], 'remote')
  }

  // Abilities: per-ability merge using the same stamp-beats-fallback rule.
  merged.abilities = { ...local.abilities }
  for (const ability of ABILITY_KEYS) {
    const fieldKey = `abilities.${ability}`
    const lt = localTs[fieldKey] ?? localTs.abilities
    const rt = remoteTs[fieldKey] ?? remoteTs.abilities
    if (lt !== undefined && rt !== undefined) {
      merged.abilities[ability] = rt > lt || rt === lt
        ? { ...remote.abilities[ability] }
        : { ...local.abilities[ability] }
    } else if (rt !== undefined) {
      merged.abilities[ability] = { ...remote.abilities[ability] }
    } else if (lt !== undefined) {
      merged.abilities[ability] = { ...local.abilities[ability] }
    } else {
      // Neither stamped: fall back to row timestamps.
      merged.abilities[ability] = remoteRowTs > localRowTs
        ? { ...remote.abilities[ability] }
        : { ...local.abilities[ability] }
    }
  }

  // Union the timestamp maps with per-key max: remote-won fields must keep
  // their newer stamps, or the next merge compares stale times and can
  // ping-pong between devices. Local-won keys keep their (winning) stamps.
  merged.fieldTimestamps = { ...localTs }
  for (const [field, stamp] of Object.entries(remoteTs)) {
    merged.fieldTimestamps[field] = Math.max(merged.fieldTimestamps[field] ?? 0, stamp)
  }

  return merged
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