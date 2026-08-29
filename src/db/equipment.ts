import type { Character, EquipmentItem } from './db'
import { updateCharacter } from './characters'

export function createEquipmentItem(): EquipmentItem {
  return {
    id: crypto.randomUUID(),
    name: '',
    amount: 1,
    description: '',
  }
}

export async function addEquipmentItem(characterId: string): Promise<EquipmentItem> {
  const item = createEquipmentItem()
  await updateCharacter(characterId, (character) => ({
    equipment: [...(character.equipment ?? []), item],
  }))
  return item
}

export async function updateEquipmentItem(
  characterId: string,
  itemId: string,
  changes: Partial<Omit<EquipmentItem, 'id'>>,
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

export type { Character, EquipmentItem }