import type { Character, Spell } from './db'
import { updateCharacter } from './characters'

export function createSpell(): Spell {
  return {
    id: crypto.randomUUID(),
    name: '',
    level: 0,
    description: '',
  }
}

export async function addSpell(characterId: string): Promise<Spell> {
  const spell = createSpell()
  await updateCharacter(characterId, (character) => ({
    spells: [...(character.spells ?? []), spell],
  }))
  return spell
}

export async function updateSpell(
  characterId: string,
  spellId: string,
  changes: Partial<Omit<Spell, 'id'>>,
): Promise<void> {
  await updateCharacter(characterId, (character) => ({
    spells: (character.spells ?? []).map((spell) =>
      spell.id === spellId ? { ...spell, ...changes } : spell,
    ),
  }))
}

export async function deleteSpell(characterId: string, spellId: string): Promise<void> {
  await updateCharacter(characterId, (character) => ({
    spells: (character.spells ?? []).filter((spell) => spell.id !== spellId),
  }))
}

export type { Character, Spell }