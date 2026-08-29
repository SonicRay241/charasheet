import type { Character, Weapon } from './db'
import { updateCharacter } from './characters'

export function createWeapon(): Weapon {
  return {
    id: crypto.randomUUID(),
    name: '',
    attackBonus: '+0',
    damage: '1d4+0',
  }
}

export async function addWeapon(characterId: string): Promise<Weapon> {
  const weapon = createWeapon()
  await updateCharacter(characterId, (character) => ({
    weapons: [...(character.weapons ?? []), weapon],
  }))
  return weapon
}

export async function updateWeapon(
  characterId: string,
  weaponId: string,
  changes: Partial<Omit<Weapon, 'id'>>,
): Promise<void> {
  await updateCharacter(characterId, (character) => ({
    weapons: (character.weapons ?? []).map((weapon) =>
      weapon.id === weaponId ? { ...weapon, ...changes } : weapon,
    ),
  }))
}

export async function deleteWeapon(characterId: string, weaponId: string): Promise<void> {
  await updateCharacter(characterId, (character) => ({
    weapons: (character.weapons ?? []).filter((weapon) => weapon.id !== weaponId),
  }))
}

export type { Character, Weapon }