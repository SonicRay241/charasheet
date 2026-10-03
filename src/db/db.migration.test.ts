// Regression: legacy flat weapons/equipment rows (pre-v9 schema) upgrade into
// the unified Item shape with a details payload.
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeEach, expect, it } from 'vitest'
import { db } from './db'
import type { Character } from './db'
import type { WeaponDetails } from './item-types'

interface LegacyRow {
  id: string
  name: string
  weapons: Array<{ id: string; name: string; attackBonus: string; damage: string }>
  equipment: Array<{ id: string; name: string; amount: number; description: string }>
  [key: string]: unknown
}

const legacyRow = (): LegacyRow => ({
  id: 'legacy-1',
  name: 'Thorin',
  weapons: [{ id: 'w1', name: 'Greataxe', attackBonus: '+5', damage: '1d12+3/S' }],
  equipment: [{ id: 'e1', name: 'Rope', amount: 50, description: '50 ft.' }],
})

/** Seed a character the way pre-v9 Dexie stored it: flat item fields. */
async function seedLegacyCharacter(row: LegacyRow): Promise<string> {
  const legacy = new Dexie('charasheet')
  legacy.version(8).stores({ characters: 'id, name, updatedAt' })
  await legacy.open()
  const store = legacy.table('characters') as unknown as {
    add: (value: unknown) => Promise<unknown>
  }
  await store.add(row)
  await legacy.close()
  return row.id
}

/** Force `db` to run its full upgrade chain against the seeded legacy row. */
async function openMigratedDb(): Promise<void> {
  await db.open()
}

beforeEach(async () => {
  await db.delete()
})

it('migrates flat weapons and equipment into Item.details', async () => {
  const row = legacyRow()
  await seedLegacyCharacter(row)
  await openMigratedDb()

  const loaded: Character | undefined = await db.characters.get(row.id)
  expect(loaded?.name).toBe('Thorin')

  const weapon = loaded?.weapons?.[0]
  expect(weapon).toEqual({
    id: 'w1',
    name: 'Greataxe',
    amount: 1,
    description: '',
    weight: 0,
    details: { slot: 'mainHand', type: 'melee', attackBonus: '+5', damage: '1d12+3/S' },
  })

  const item = loaded?.equipment?.[0]
  expect(item).toEqual({
    id: 'e1',
    name: 'Rope',
    amount: 50,
    description: '50 ft.',
    weight: 0,
    details: { misc: '' },
  })
})

it('leaves already-upgraded items untouched', async () => {
  await openMigratedDb()
  const created = await db.characters.add({
    ...legacyRow(),
    weapons: [
      {
        id: 'w1',
        name: 'Bow',
        amount: 1,
        description: '',
        weight: 2,
        details: { slot: 'twoHanded', type: 'ranged', attackBonus: '+4', damage: '1d8/P' } satisfies WeaponDetails,
      },
    ],
    equipment: [],
  } as unknown as Character)

  const loaded: Character | undefined = await db.characters.get(created)
  const weapon = loaded?.weapons?.[0]
  // `details` exists post-migration and the legacy keys were stripped.
  expect(weapon?.details).toEqual({ slot: 'twoHanded', type: 'ranged', attackBonus: '+4', damage: '1d8/P' })
})

// Regression: a user who opened the app while v9 was mid-flight (slots
// backfilled but items left flat) is already marked version 9 — the
// wrapped upgrade must rerun on v10, or the weapons panel crashes on
// `details.attackBonus` of undefined.
it('reruns the upgrade at v10, healing records stuck flat at v9', async () => {
  const row = legacyRow()
  // seed at v9 — the shape the aborted v9 leaves behind: equipment only,
  // weapons still flat without details
  const legacy = new Dexie('charasheet')
  legacy.version(9).stores({
    characters: 'id, name, updatedAt',
    syncMeta: 'key',
    characterSyncMeta: 'id',
    deletedCharacters: 'id',
  })
  await legacy.open()
  await (legacy.table('characters') as unknown as { add: (v: unknown) => Promise<unknown> }).add({
    ...row,
    weapons: [{ id: 'w1', name: 'Greataxe', attackBonus: '+5', damage: '1d12+3/S' }],
    equipment: [{ id: 'e1', name: 'Rope', amount: 50, description: '50 ft.' }],
    equipped: {},
  })
  await legacy.close()
  await openMigratedDb()

  const loaded: Character | undefined = await db.characters.get(row.id)
  expect(db.verno).toBe(10)
  const weapon = loaded?.weapons?.[0]
  expect(weapon?.details).toEqual({ slot: 'mainHand', type: 'melee', attackBonus: '+5', damage: '1d12+3/S' })
  expect(weapon && 'attackBonus' in weapon).toBe(false)
  const item = loaded?.equipment?.[0]
  // "Rope" matches no wearable word list, so no slot is inferred — it
  // stays Miscellaneous (equippedIn would reject it anyway).
  expect(item?.details).toEqual({ misc: '' })
  expect(loaded?.equipped).toEqual({})
})

// Regression: a user at version 9 from `main` has unified items but no
// `equipped` field (main's v9 predates the mannequin). v10 must backfill
// equipped and infer wearable slots — without touching valid items.
it("upgrades main's v9 records: unified items, no equipped field", async () => {
  const legacy = new Dexie('charasheet')
  legacy.version(9).stores({
    characters: 'id, name, updatedAt',
    syncMeta: 'key',
    characterSyncMeta: 'id',
    deletedCharacters: 'id',
  })
  await legacy.open()
  const row = legacyRow()
  await (legacy.table('characters') as unknown as { add: (v: unknown) => Promise<unknown> }).add({
    ...row,
    weapons: [{
      id: 'w1',
      name: 'Greataxe',
      amount: 1,
      description: '',
      weight: 7,
      details: { slot: 'mainHand', type: 'melee', attackBonus: '+5', damage: '1d12+3/S' },
    }],
    equipment: [{ id: 'e1', name: 'Boots', amount: 1, description: '', weight: 1, details: { slot: 'chest', attackBonus: '' } }],
    // no `equipped` — main's v9 predates the mannequin
  })
  await legacy.close()
  await openMigratedDb()

  const loaded: Character | undefined = await db.characters.get(row.id)
  expect(db.verno).toBe(10)
  expect(loaded?.equipped).toEqual({})
  // valid items pass through untouched
  expect(loaded?.weapons?.[0]?.details).toEqual({ slot: 'mainHand', type: 'melee', attackBonus: '+5', damage: '1d12+3/S' })
  // main's v9 couldn't know slots; wearables get them from their name
  expect(loaded?.equipment?.[0]?.details).toEqual({ slot: 'chest', attackBonus: '' })
})