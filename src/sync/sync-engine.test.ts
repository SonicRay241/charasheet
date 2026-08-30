// Loads fake-indexeddb before any Dexie import so tests run without a browser.
import 'fake-indexeddb/auto'

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { db, type Character } from '../db/db'
import { addCharacter, updateCharacter } from '../db/characters'

// Fake Drive: an in-memory object store backed by vi.mock hoisting.
const fakeDrive = vi.hoisted(() => {
  const files = new Map<string, string>()
  return {
    files,
    reset: () => files.clear(),
    put: (id: string, content: string) => files.set(id, content),
  }
})

vi.mock('../sync/drive-store', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../sync/drive-store')>()
  return {
    ...actual,
    downloadFile: vi.fn(async (fileId: string) => {
      const content = fakeDrive.files.get(fileId)
      if (content === undefined) {
        const error: Error & { status?: number } = new Error('404')
        error.status = 404
        throw error
      }
      return content
    }),
    uploadFile: vi.fn(async (_name: string, content: string, fileId?: string) => {
      const id = fileId ?? `file-${fakeDrive.files.size + 1}`
      fakeDrive.files.set(id, content)
      return id
    }),
    deleteFile: vi.fn(async (fileId: string) => {
      fakeDrive.files.delete(fileId)
    }),
    readIndex: vi.fn(async () => {
      const raw = fakeDrive.files.get('index')
      if (raw === undefined) return { index: { entries: {} }, fileId: null }
      return { index: JSON.parse(raw), fileId: 'index' }
    }),
    writeIndex: vi.fn(async (index: unknown, _fileId?: string) => {
      fakeDrive.files.set('index', JSON.stringify(index))
      return 'index'
    }),
  }
})

// No real network in tests.
vi.mock('../sync/google-auth', () => ({
  getValidAccessToken: vi.fn(async () => 'fake-token'),
  isDriveConnected: () => true,
}))

import { syncAll, mergeCharacter } from '../sync/sync-engine'
import { characterPayload, sha256Hex } from '../sync/drive-store'
import { serializeCharacter } from '../db/transfer'
import { parse } from 'yaml'

const syncedCharacter = async (name: string): Promise<Character> => {
  const created = await addCharacter(name)
  await db.characters.update(created.id, { cloudSynced: true })
  return (await db.characters.get(created.id))!
}

describe('syncAll two-device repro', () => {
  beforeEach(async () => {
    fakeDrive.reset()
    await db.characters.clear()
    await db.characterSyncMeta.clear()
    await db.deletedCharacters.clear()
    await db.syncMeta.clear()
  })

  it('pushes merged content to the cloud, not the stale pre-merge snapshot', async () => {
    // Device A (this test): edits level. Pushes to the fake cloud.
    const mine = await syncedCharacter('Thorin')
    await updateCharacter(mine.id, { level: 9 })
    await syncAll()
    const localLevelAfterOwnPush = (await db.characters.get(mine.id))!.level

    // Device B: edits armorClass with a newer stamp, updates cloud + index.
    const remotePayload = characterPayload({
      ...(await db.characters.get(mine.id))!,
      level: localLevelAfterOwnPush,
      armorClass: 18,
      updatedAt: Date.now(),
      fieldTimestamps: {
        armorClass: Date.now() + 5000,
      },
    } as Character)
    const remoteHash = await sha256Hex(remotePayload)
    fakeDrive.put(`file-1`, remotePayload)
    fakeDrive.put(
      'index',
      JSON.stringify({
        entries: {
          [mine.id]: {
            id: mine.id,
            fileId: 'file-1',
            hash: remoteHash,
            name: 'Thorin',
            updatedAt: Date.now(),
          },
        },
      }),
    )

    // One syncAll: pull B's armorClass, merge with local level, push merged.
    const result = await syncAll()
    expect(result.pulled).toBe(1)

    const merged = (await db.characters.get(mine.id))!
    expect(merged.level).toBe(9) // local stamp wins
    expect(merged.armorClass).toBe(18) // remote stamp wins

    // The cloud file must contain the MERGED content, not the stale
    // pre-merge local snapshot (level 9 AND armorClass 18).
    const cloudRaw = fakeDrive.files.get('file-1')!
    expect(cloudRaw).toContain('level: 9')
    expect(cloudRaw).toContain('armorClass: 18')

    // Index hash matches the pushed merged payload.
    const index = JSON.parse(fakeDrive.files.get('index')!)
    expect(index.entries[mine.id].hash).toBe(await sha256Hex(cloudRaw))
  })

  it('seeds lastPushedHash so a pure remote win skips the next push', async () => {
    const mine = await syncedCharacter('Bofur')
    await syncAll() // initial push

    // Remote produces newer content; local has no edits of its own.
    const local = (await db.characters.get(mine.id))!
    const remote = { ...local, level: local.level + 2, updatedAt: Date.now() + 1000 }
    const payload = characterPayload(remote as Character)
    const hash = await sha256Hex(payload)
    fakeDrive.put('file-1', payload)
    fakeDrive.put(
      'index',
      JSON.stringify({
        entries: {
          [mine.id]: { id: mine.id, fileId: 'file-1', hash, name: mine.name, updatedAt: remote.updatedAt },
        },
      }),
    )

    await syncAll() // pulls remote content
    const afterPull = await syncAll() // should skip: content matches index
    expect(afterPull.pushed).toBe(0)
    expect((await db.characters.get(mine.id))!.level).toBe(remote.level)
  })

  it('round-trips serialize→parse→merge without losing stamps', async () => {
    const base = await syncedCharacter('Aria')
    const local = (await db.characters.get(base.id))!
    const remoteLevelStamp = Date.now() + 10_000
    const remote: Character = {
      ...local,
      level: 7,
      updatedAt: local.updatedAt + 10,
      fieldTimestamps: { level: remoteLevelStamp },
    }
    const hydrated = parse(serializeCharacter(remote)) as Partial<Character>
    const merged = mergeCharacter(local, { ...local, ...hydrated, id: local.id } as Character)
    expect(merged.level).toBe(7) // remote stamp survives the round-trip
    expect(merged.fieldTimestamps?.level).toBe(remoteLevelStamp)
  })
})