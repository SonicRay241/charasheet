import type { Ability, Character } from './db'
import { db } from './db'
import { ABILITY_ORDER } from './derived'
import { scheduleSync } from '@/sync/sync-engine'

export function createCharacter(name: string): Character {
  const now = Date.now()

  const abilities = Object.fromEntries(
    ABILITY_ORDER.map((ability) => [ability, { score: 10, proficient: false, halfProficient: false }]),
  ) as Record<Ability, { score: number; proficient: boolean; halfProficient: boolean }>

  return {
    id: crypto.randomUUID(),
    name,
    className: '',
    level: 1,
    race: '',
    alignment: '',
    inspiration: false,
    proficiencyBonus: 2,
    abilities,
    saveOverridesEnabled: false,
    savingThrowOverrides: {},
    skillOverridesEnabled: false,
    skillOverrides: {},
    armorClass: 10,
    initiativeOverride: null,
    speed: 30,
    hitPointMaximum: 0,
    currentHitPoints: 0,
    temporaryHitPoints: 0,
    hitDiceTotal: '1d6',
    deathSaves: { successes: 0, failures: 0 },
    skillProficiencies: {},
    skillHalfProficiencies: {},
    weapons: [],
    equipment: [],
    spells: [],
    cloudSynced: false,
    personalityTraits: '',
    ideals: '',
    bonds: '',
    flaws: '',
    alliesAndOrganizations: '',
    backstory: '',
    treasures: '',
    createdAt: now,
    updatedAt: now,
  }
}

export async function addCharacter(name: string): Promise<Character> {
  const character = createCharacter(name)
  await db.characters.add(character)
  return character
}

export async function listCharacters(): Promise<Character[]> {
  return db.characters.orderBy('name').toArray()
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  return db.characters.get(id)
}

export async function updateCharacter(
  id: string,
  changes: Partial<Character> | ((character: Character) => Partial<Character>),
): Promise<void> {
  if (typeof changes === 'function') {
    await db.transaction('rw', db.characters, async () => {
      const character = await db.characters.get(id)
      if (!character) return
      const patch = changes(character)
      await db.characters.update(id, { ...patch, updatedAt: Date.now() })
    })
    scheduleSync()
    return
  }
  const patch = { ...changes, updatedAt: Date.now() }
  for (const key of Object.keys(patch) as (keyof Character)[]) {
    if (patch[key] === undefined) {
      delete patch[key]
    }
  }
  await db.characters.update(id, patch)
  scheduleSync()
}

export async function deleteCharacter(id: string): Promise<void> {
  const character = await db.characters.get(id)
  await db.characters.delete(id)
  await db.characterSyncMeta.delete(id)
  if (character?.cloudSynced) {
    // Remember the deletion so the next sync tombstones the cloud copy.
    await db.deletedCharacters.put({ id, deletedAt: Date.now() })
  }
  scheduleSync()
}