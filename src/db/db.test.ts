// Loads fake-indexeddb before any Dexie import so tests run without a browser.
import 'fake-indexeddb/auto'

import { describe, expect, it, beforeEach } from 'vitest'
import { db, type Character } from './db'
import { addCharacter, createCharacter, listCharacters, updateCharacter } from './characters'
import { addWeapon, deleteWeapon, updateWeapon } from './weapons'
import { addEquipmentItem, deleteEquipmentItem, updateEquipmentItem } from './equipment'
import { abilityModifier, baseSavingThrowTotal, formatModifier, initiativeTotal, savingThrowTotal, skillTotal, SKILLS } from './derived'

const characterFromSheet = (): Character => {
  const character = createCharacter('Thorin')
  const abilities = {
    strength: { score: 9, proficient: false, halfProficient: false },
    dexterity: { score: 16, proficient: false, halfProficient: false },
    constitution: { score: 15, proficient: false, halfProficient: false },
    intelligence: { score: 11, proficient: false, halfProficient: false },
    wisdom: { score: 14, proficient: false, halfProficient: false },
    charisma: { score: 13, proficient: false, halfProficient: false },
  }
  character.abilities = abilities
  character.proficiencyBonus = 2
  character.skillProficiencies = { arcana: true, investigation: true, performance: true, survival: true }
  character.hitPointMaximum = 12
  character.currentHitPoints = 12
  character.armorClass = 13
  character.speed = 30
  return character
}

describe('derived values', () => {
  const character = characterFromSheet()

  it('computes ability modifiers', () => {
    expect(abilityModifier(9)).toBe(-1)
    expect(abilityModifier(16)).toBe(+3)
    expect(abilityModifier(15)).toBe(+2)
    expect(abilityModifier(11)).toBe(0)
    expect(abilityModifier(14)).toBe(+2)
    expect(abilityModifier(13)).toBe(+1)
    expect(abilityModifier(10)).toBe(0)
    expect(abilityModifier(8)).toBe(-1)
  })

  it('formats modifiers with explicit sign', () => {
    expect(formatModifier(-1)).toBe('-1')
    expect(formatModifier(0)).toBe('+0')
    expect(formatModifier(3)).toBe('+3')
  })

  it('derives saving throws with proficiency', () => {
    expect(savingThrowTotal(character, 'strength')).toBe(-1)
    const proficientWis = {
      ...character,
      abilities: {
        ...character.abilities,
        wisdom: { score: 14, proficient: true, halfProficient: false },
      },
    }
    expect(savingThrowTotal(proficientWis, 'wisdom')).toBe(+4)
  })

  it('derives skill totals per 5e rules (prof = mod + profBonus)', () => {
    // Note: the mock sheet image is internally inconsistent (e.g. Arcana +1
    // with Int 11 and prof +2); these expectations follow the actual rules.
    const byKey = new Map(SKILLS.map((skill) => [skill.key, skill]))
    expect(skillTotal(character, byKey.get('arcana')!)).toBe(+2)
    expect(skillTotal(character, byKey.get('investigation')!)).toBe(+2)
    expect(skillTotal(character, byKey.get('performance')!)).toBe(+3)
    expect(skillTotal(character, byKey.get('survival')!)).toBe(+4)
    expect(skillTotal(character, byKey.get('acrobatics')!)).toBe(+3)
    expect(skillTotal(character, byKey.get('animalHandling')!)).toBe(+2)
  })

  it('adds half proficiency (+1 at prof 2) via second checkbox', () => {
    const half = {
      ...character,
      skillHalfProficiencies: { perception: true },
      abilities: {
        ...character.abilities,
        wisdom: { score: 14, proficient: false, halfProficient: true },
      },
    }
    const byKey = new Map(SKILLS.map((skill) => [skill.key, skill]))
    // Perception: Wis +2, half prof +1 -> +3
    expect(skillTotal(half, byKey.get('perception')!)).toBe(+3)

    // Saving throw: Wis save +2, half prof +1 -> +3
    expect(baseSavingThrowTotal(half, 'wisdom')).toBe(+3)

    // Both checkboxes are independent bonuses: +2 mod +2 full +1 half = +5.
    const both = {
      ...half,
      skillProficiencies: { perception: true },
      abilities: {
        ...half.abilities,
        wisdom: { score: 14, proficient: true, halfProficient: true },
      },
    }
    expect(skillTotal(both, byKey.get('perception')!)).toBe(+5)
    expect(baseSavingThrowTotal(both, 'wisdom')).toBe(+5)
  })

  it('derives initiative from dex plus proficiency', () => {
    expect(initiativeTotal(character)).toBe(+5)
    expect(initiativeTotal({ ...character, initiativeOverride: 2 })).toBe(+2)
  })

  it('applies manual save deltas only when enabled', () => {
    // Strength base: -1. A +2 homebrew delta results in +1.
    const overridden = {
      ...character,
      saveOverridesEnabled: true,
      savingThrowOverrides: { strength: 2 },
    }
    expect(savingThrowTotal(overridden, 'strength')).toBe(+1)
    expect(savingThrowTotal(overridden, 'dexterity')).toBe(+3)
    expect(savingThrowTotal({ ...overridden, saveOverridesEnabled: false }, 'strength')).toBe(-1)
  })

  it('applies manual skill deltas only when enabled', () => {
    // Arcana base: Int 11 (+0) + prof 2 = +2. A -3 delta results in -1.
    const overridden = {
      ...character,
      skillOverridesEnabled: true,
      skillOverrides: { arcana: -3 },
    }
    const byKey = new Map(SKILLS.map((skill) => [skill.key, skill]))
    expect(skillTotal(overridden, byKey.get('arcana')!)).toBe(-1)
    expect(skillTotal(overridden, byKey.get('history')!)).toBe(0)
    expect(skillTotal({ ...overridden, skillOverridesEnabled: false }, byKey.get('arcana')!)).toBe(+2)
  })
})

describe('character store', () => {
  beforeEach(async () => {
    await db.characters.clear()
  })

  it('round-trips a character through IndexedDB', async () => {
    const created = await addCharacter('Thorin')
    const loaded = await db.characters.get(created.id)
    expect(loaded?.name).toBe('Thorin')
    expect(loaded?.abilities.dexterity.score).toBe(10)
  })

  it('lists multiple characters sorted by name', async () => {
    await addCharacter('Zara')
    await addCharacter('Bofur')
    const names = (await listCharacters()).map((c) => c.name)
    expect(names).toEqual(['Bofur', 'Zara'])
  })

  it('updates a character and bumps updatedAt', async () => {
    const created = await addCharacter('Thorin')
    await new Promise((r) => setTimeout(r, 5))
    await updateCharacter(created.id, { currentHitPoints: 7 })
    const loaded = await db.characters.get(created.id)
    expect(loaded?.currentHitPoints).toBe(7)
    expect(loaded!.updatedAt).toBeGreaterThan(created.updatedAt)
  })

  it('persists override enable flags and deltas', async () => {
    const created = await addCharacter('Thorin')
    await updateCharacter(created.id, {
      saveOverridesEnabled: true,
      savingThrowOverrides: { strength: 2 },
      skillOverridesEnabled: true,
      skillOverrides: { arcana: -3 },
    })
    const loaded = await db.characters.get(created.id)
    expect(loaded?.saveOverridesEnabled).toBe(true)
    expect(loaded?.savingThrowOverrides).toEqual({ strength: 2 })
    expect(loaded?.skillOverridesEnabled).toBe(true)
    expect(loaded?.skillOverrides).toEqual({ arcana: -3 })
  })

  it('applies functional updates transactionally', async () => {
    const created = await addCharacter('Thorin')
    await updateCharacter(created.id, (c) => ({
      savingThrowOverrides: { ...c.savingThrowOverrides, wisdom: -1 },
    }))
    const loaded = await db.characters.get(created.id)
    expect(loaded?.savingThrowOverrides).toEqual({ wisdom: -1 })
  })

  it('adds, updates, and deletes weapons atomically', async () => {
    const created = await addCharacter('Thorin')

    const weapon = await addWeapon(created.id)
    expect(weapon.attackBonus).toBe('+0')
    let loaded = await db.characters.get(created.id)
    expect(loaded?.weapons).toHaveLength(1)

    await updateWeapon(created.id, weapon.id, { name: 'Club', damage: '1d4+2/B' })
    loaded = await db.characters.get(created.id)
    expect(loaded?.weapons[0].name).toBe('Club')
    expect(loaded?.weapons[0].damage).toBe('1d4+2/B')

    await addWeapon(created.id)
    await deleteWeapon(created.id, weapon.id)
    loaded = await db.characters.get(created.id)
    expect(loaded?.weapons).toHaveLength(1)
    expect(loaded?.weapons[0].name).toBe('')
  })

  it('adds, updates, and deletes equipment atomically', async () => {
    const created = await addCharacter('Thorin')

    const item = await addEquipmentItem(created.id)
    expect(item.amount).toBe(1)
    let loaded = await db.characters.get(created.id)
    expect(loaded?.equipment).toHaveLength(1)

    await updateEquipmentItem(created.id, item.id, {
      name: 'Rope',
      amount: 50,
      description: '50 ft. hempen rope',
    })
    loaded = await db.characters.get(created.id)
    expect(loaded?.equipment[0].name).toBe('Rope')
    expect(loaded?.equipment[0].amount).toBe(50)
    expect(loaded?.equipment[0].description).toBe('50 ft. hempen rope')

    await addEquipmentItem(created.id)
    await deleteEquipmentItem(created.id, item.id)
    loaded = await db.characters.get(created.id)
    expect(loaded?.equipment).toHaveLength(1)
  })
})