import Dexie, { type EntityTable } from 'dexie'
import type { ItemDetails, WeaponDetails } from './item-types'
import { fitOf, isTwoHanded } from './equipped'

export type {
  GearSlot,
  WeaponSlot,
  WearableSlot,
  HeldSlot,
  WornSlot,
  WeaponDetails,
  WearableDetails,
  ConsumableDetails,
  WeaponConsumableDetails,
} from './item-types'

export type Ability = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'

export interface AbilityScore {
  score: number
  proficient: boolean
  halfProficient: boolean
}

export interface DeathSaves {
  successes: number
  failures: number
}

export interface SkillProficiencies {
  [skillKey: string]: boolean
}

export interface SkillHalfProficiencies {
  [skillKey: string]: boolean
}

export interface SkillOverrides {
  [skillKey: string]: number
}

/**
 * Unified item shape: common fields plus a typed `details` payload. `T` is
 * one of the detail types from './item-types' (weapons, wearables,
 * consumables, weapon consumables); new kinds of items only need a new
 * detail type there.
 */
export type Item<T extends ItemDetails = ItemDetails> = {
  id: string
  name: string
  amount: number
  description: string
  weight: number
  details: T
}

/** Where something is worn or held on the mannequin. */
export type EquipSlot = 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'mainHand' | 'offHand'
/** Weapon stored in `character.weapons`. */
export type Weapon = Item<WeaponDetails>

/** Gear stored in `character.equipment`. */
export type EquipmentItem = Item

export interface Spell {
  id: string
  name: string
  /** 0 = cantrip. */
  level: number
  description: string
}

export interface Character {
  id: string
  name: string

  // Metadata header
  className: string
  level: number
  race: string
  alignment: string

  // Top-left box
  inspiration: boolean
  proficiencyBonus: number

  // Ability scores
  abilities: Record<Ability, AbilityScore>

  // Manual saving throw overrides (homebrew)
  saveOverridesEnabled: boolean
  savingThrowOverrides: Partial<Record<Ability, number>>
  skillOverridesEnabled: boolean
  skillOverrides: SkillOverrides

  // Combat block
  armorClass: number
  initiativeOverride: number | null
  speed: number
  hitPointMaximum: number
  currentHitPoints: number
  temporaryHitPoints: number
  hitDiceTotal: string
  deathSaves: DeathSaves
  skillProficiencies: SkillProficiencies
  skillHalfProficiencies: SkillHalfProficiencies

  // Gear
  weapons: Weapon[]
  equipment: EquipmentItem[]
  spells: Spell[]
  /** What's worn or held, by slot: the id of one of this character's weapons or equipment items. */
  equipped: Partial<Record<EquipSlot, string>>

  // Sync
  /** Whether this character is synced to cloud storage. */
  cloudSynced?: boolean
  /** When the current opt-in happened; guards against stale opt-out tombstones. */
  cloudSyncedAt?: number
  /**
   * Per-field last-write timestamps (LWW-Register merge metadata). Keys are
   * top-level field names, or `abilities.<ability>` for ability sub-fields.
   * Travels with the payload so merges work across devices.
   */
  fieldTimestamps?: Record<string, number>

  // Lore
  personalityTraits: string
  ideals: string
  bonds: string
  flaws: string
  alliesAndOrganizations: string
  backstory: string
  treasures: string

  createdAt: number
  updatedAt: number
}

export interface CharacterSyncMeta {
  id: string
  /** Stable hash of the last pushed character payload. */
  lastPushedHash: string
  /** Drive file id of the character YAML, once uploaded. */
  fileId?: string
}

export interface SyncMeta {
  key: 'index'
  /** Drive file id of index.json. */
  fileId?: string
  /** ISO timestamp of the last successful sync. */
  lastSyncedAt?: string
}

export interface DeletedCharacter {
  id: string
  /** When the local delete happened; compared against index updatedAt. */
  deletedAt: number
}

type CharactersTable = EntityTable<Character, 'id'>
type SyncMetaTable = EntityTable<SyncMeta, 'key'>
type CharacterSyncMetaTable = EntityTable<CharacterSyncMeta, 'id'>
type DeletedCharactersTable = EntityTable<DeletedCharacter, 'id'>

const db = new Dexie('charasheet') as Dexie & {
  characters: CharactersTable
  syncMeta: SyncMetaTable
  characterSyncMeta: CharacterSyncMetaTable
  deletedCharacters: DeletedCharactersTable
}

db.version(1).stores({
  characters: 'id, name, updatedAt',
})

// v2: backfill homebrew override fields for characters created before them.
db.version(2)
  .stores({
    characters: 'id, name, updatedAt',
  })
  .upgrade((tx) =>
    tx
      .table('characters')
      .toCollection()
      .modify((character) => {
        character.saveOverridesEnabled ??= false
        character.savingThrowOverrides ??= {}
        character.skillOverridesEnabled ??= false
        character.skillOverrides ??= {}
      }),
  )

// v3: backfill half-proficiency fields for characters created before them.
db.version(3)
  .stores({
    characters: 'id, name, updatedAt',
  })
  .upgrade((tx) =>
    tx
      .table('characters')
      .toCollection()
      .modify((character) => {
        for (const ability of Object.keys(character.abilities) as (keyof typeof character.abilities)[]) {
          character.abilities[ability].halfProficient ??= false
        }
        character.skillHalfProficiencies ??= {}
      }),
  )

// v4: backfill weapons list for characters created before it existed.
db.version(4)
  .stores({
    characters: 'id, name, updatedAt',
  })
  .upgrade((tx) =>
    tx
      .table('characters')
      .toCollection()
      .modify((character) => {
        character.weapons ??= []
      }),
  )

// v5: backfill equipment list for characters created before it existed.
db.version(5)
  .stores({
    characters: 'id, name, updatedAt',
  })
  .upgrade((tx) =>
    tx
      .table('characters')
      .toCollection()
      .modify((character) => {
        character.equipment ??= []
      }),
  )

// v6: backfill lore fields for characters created before they existed.
db.version(6)
  .stores({
    characters: 'id, name, updatedAt',
  })
  .upgrade((tx) =>
    tx
      .table('characters')
      .toCollection()
      .modify((character) => {
        character.personalityTraits ??= ''
        character.ideals ??= ''
        character.bonds ??= ''
        character.flaws ??= ''
        character.alliesAndOrganizations ??= ''
        character.backstory ??= ''
        character.treasures ??= ''
      }),
  )

// v7: backfill spells list for characters created before it existed.
db.version(7)
  .stores({
    characters: 'id, name, updatedAt',
  })
  .upgrade((tx) =>
    tx
      .table('characters')
      .toCollection()
      .modify((character) => {
        character.spells ??= []
      }),
  )

// v8: cloud sync — per-character opt-in flag + sync bookkeeping tables.
db.version(8)
  .stores({
    characters: 'id, name, updatedAt',
    syncMeta: 'key',
    characterSyncMeta: 'id',
    deletedCharacters: 'id',
  })
  .upgrade((tx) =>
    tx
      .table('characters')
      .toCollection()
      .modify((character) => {
        character.cloudSynced ??= false
      }),
  )

// v10: unified items (legacy flat weapons/equipment rows wrapped into the
// Item shape with a details payload) and the mannequin's slots (legacy
// characters get `equipped`, with slots inferred from item names).
// Reruns the v9 upgrade: a user who opened the app while v9 was mid-flight
// (slots backfilled, items left flat) is already marked 9 — only a new
// version re-triggers the wrap.
db.version(10)
  .stores({
    characters: 'id, name, updatedAt',
    syncMeta: 'key',
    characterSyncMeta: 'id',
    deletedCharacters: 'id',
  })
  .upgrade((tx) =>
    tx
      .table('characters')
      .toCollection()
      .modify((character) => {
        character.equipped ??= {}
        // Where legacy items belong on the mannequin, from their names:
        for (const weapon of character.weapons ?? []) {
          if (weapon.details === undefined || weapon.details === null) {
            weapon.amount ??= 1
            weapon.description ??= ''
            weapon.weight ??= 0
            weapon.details = {
              slot: 'mainHand',
              type: 'melee',
              attackBonus: weapon.attackBonus ?? '+0',
              damage: weapon.damage ?? '1d4+0',
            }
            delete weapon.attackBonus
            delete weapon.damage
          }
          // Where it sits on the mannequin, from its name: weapons are held
          // (a two-hander is `twoHanded`, taking both hands); wearables go
          // by the same word lists fitOf uses on the mannequin at runtime.
          if (weapon.details.slot === undefined) {
            weapon.details.slot = isTwoHanded(weapon.name, true) ? 'twoHanded' : 'mainHand'
          }
        }
        for (const item of character.equipment ?? []) {
          if (item.details === undefined || item.details === null) {
            item.amount ??= 1
            item.weight ??= 0
            item.details = { effect: '' }
          }
          // Where it's worn, from its name; unrecognised names go nowhere
          // (the slot stays unset — equippedIn demands a fit anyway).
          if (item.details.slot === undefined) {
            const fit = fitOf(item.name, false)
            if (fit !== undefined && fit !== 'held') item.details.slot = fit
          }
        }
      }),
  )

export { db }
