import type { Character, Item } from './db'
import { updateCharacter } from './characters'

export type { Character, Item }

export function createEquipmentItem(): Item {
  return {
    id: crypto.randomUUID(),
    name: '',
    amount: 1,
    description: '',
    weight: 0,
    details: { effect: '' },
  }
}

export async function addEquipmentItem(characterId: string): Promise<Item> {
  const item = createEquipmentItem()
  await updateCharacter(characterId, (character) => ({
    equipment: [...(character.equipment ?? []), item],
  }))
  return item
}

export async function updateEquipmentItem(
  characterId: string,
  itemId: string,
  changes: Partial<Omit<Item, 'id'>>,
): Promise<void> {
  await updateCharacter(characterId, (character) => ({
    equipment: (character.equipment ?? []).map((item) =>
      item.id === itemId ? { ...item, ...changes } : item,
    ),
  }))
}

export async function deleteEquipmentItem(characterId: string, itemId: string): Promise<void> {
  await updateCharacter(characterId, (character) => ({
    equipment: (character.equipment ?? []).filter((item) => item.id !== itemId),
  }))
}