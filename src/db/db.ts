import Dexie, { type EntityTable } from 'dexie'

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

export interface Weapon {
  id: string
  name: string
  attackBonus: string
  /** Damage and type combined, e.g. "1d4+2/B". */
  damage: string
}

export interface EquipmentItem {
  id: string
  name: string
  amount: number
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

type CharactersTable = EntityTable<Character, 'id'>

const db = new Dexie('charasheet') as Dexie & {
  characters: CharactersTable
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

export { db }