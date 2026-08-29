import type { Ability, Character } from './db'

export const ABILITY_ORDER: readonly Ability[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const

/** Proficiency tier: none = 0, half = 0.5, full = 1. */
export type ProficiencyTier = 0 | 0.5 | 1

export function proficiencyMultiplier(character: Character, tier: ProficiencyTier): number {
  return Math.floor(character.proficiencyBonus * tier)
}

export const ABILITY_LABELS: Record<Ability, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function initiativeTotal(character: Character): number {
  const dex = abilityModifier(character.abilities.dexterity.score)
  return character.initiativeOverride ?? dex + character.proficiencyBonus
}

export interface SkillDef {
  key: string
  label: string
  ability: Ability
}

export const SKILLS: readonly SkillDef[] = [
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dexterity' },
  { key: 'animalHandling', label: 'Animal Handling', ability: 'wisdom' },
  { key: 'arcana', label: 'Arcana', ability: 'intelligence' },
  { key: 'athletics', label: 'Athletics', ability: 'strength' },
  { key: 'deception', label: 'Deception', ability: 'charisma' },
  { key: 'history', label: 'History', ability: 'intelligence' },
  { key: 'insight', label: 'Insight', ability: 'wisdom' },
  { key: 'intimidation', label: 'Intimidation', ability: 'charisma' },
  { key: 'investigation', label: 'Investigation', ability: 'intelligence' },
  { key: 'medicine', label: 'Medicine', ability: 'wisdom' },
  { key: 'nature', label: 'Nature', ability: 'intelligence' },
  { key: 'perception', label: 'Perception', ability: 'wisdom' },
  { key: 'performance', label: 'Performance', ability: 'charisma' },
  { key: 'persuasion', label: 'Persuasion', ability: 'charisma' },
  { key: 'religion', ability: 'intelligence', label: 'Religion' },
  { key: 'sleightOfHand', label: 'Sleight of Hand', ability: 'dexterity' },
  { key: 'stealth', label: 'Stealth', ability: 'dexterity' },
  { key: 'survival', label: 'Survival', ability: 'wisdom' },
] as const

export type SkillKey = (typeof SKILLS)[number]['key']

export type SkillProficiencies = Partial<Record<SkillKey, boolean>>

export function skillTotal(character: Character, skill: SkillDef): number {
  return baseSkillTotal(character, skill) + (character.skillOverridesEnabled ? (character.skillOverrides?.[skill.key] ?? 0) : 0)
}

/** Skill total before any homebrew delta is applied. */
export function baseSkillTotal(character: Character, skill: SkillDef): number {
  const abilityMod = abilityModifier(character.abilities[skill.ability].score)
  const full = (character.skillProficiencies?.[skill.key] ?? false)
    ? proficiencyMultiplier(character, 1)
    : 0
  const half = (character.skillHalfProficiencies?.[skill.key] ?? false)
    ? proficiencyMultiplier(character, 0.5)
    : 0
  return abilityMod + full + half
}

export function savingThrowTotal(character: Character, ability: Ability): number {
  return (
    baseSavingThrowTotal(character, ability) +
    (character.saveOverridesEnabled ? (character.savingThrowOverrides?.[ability] ?? 0) : 0)
  )
}

/** Saving throw total before any homebrew delta is applied. */
export function baseSavingThrowTotal(character: Character, ability: Ability): number {
  const abilityMod = abilityModifier(character.abilities[ability].score)
  const { proficient = false, halfProficient = false } = character.abilities[ability] ?? {}
  return (
    abilityMod +
    (proficient ? proficiencyMultiplier(character, 1) : 0) +
    (halfProficient ? proficiencyMultiplier(character, 0.5) : 0)
  )
}