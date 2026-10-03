/**
 * Shared item type vocabulary. Characters store lists of `Item<T>` where `T`
 * is one of the detail types below; adding a new kind of item means adding a
 * detail type here and picking where it lives (weapons list, equipment list,
 * or a future list on Character).
 */

/** Slots for items that can be equipped. `twoHanded` occupies both hands. */
export type GearSlot =
  | 'mainHand'
  | 'offHand'
  | 'twoHanded'
  | 'head'
  | 'chest'
  | 'hands'
  | 'legs'
  | 'feet'
  | 'ring'
  | 'amulet'

export type WeaponSlot = 'mainHand' | 'offHand' | 'twoHanded'
export type WearableSlot = 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'ring' | 'amulet'

/** Struck from `GearSlot` so weapon/wearable slots stay exhaustive by construction. */
export type HeldSlot = Extract<GearSlot, WeaponSlot>
export type WornSlot = Extract<GearSlot, WearableSlot>

/** Weapons (melee/ranged) held in a hand slot. */
export interface WeaponDetails {
  slot: WeaponSlot
  type: 'melee' | 'ranged'
  attackBonus: string
  /** Damage and type combined, e.g. "1d4+2/B". */
  damage: string
}

/** Wearable gear (armor, jewelry) worn in a non-hand slot. */
export interface WearableDetails {
  slot: WearableSlot
  attackBonus: string
}

/** Potions, food, etc. — described purely by their effect text. `flavor` keeps food and potion apart (both share just `effect` in old payloads). */
export interface ConsumableDetails {
  effect: string
  flavor: 'food' | 'potion'
}

/** Arrows, gemstones, etc. — items whose value is their attack profile. */
export interface WeaponConsumableDetails {
  attackBonus: string
  /** Damage and type combined, e.g. "1d4+2/B". */
  damage: string
}

/** Any item detail payload. */
export type ItemDetails =
  | WeaponDetails
  | WearableDetails
  | ConsumableDetails
  | WeaponConsumableDetails
  | NoItemDetails

/** Miscellaneous has no details at all (the dropdown's default). */
export interface NoItemDetails {
  misc: ''
}

export interface Item<T extends ItemDetails = ItemDetails> {
  id: string
  name: string
  amount: number
  description: string
  weight: number
  details: T
}

/** Gear stored in `character.equipment` (wearables, consumables, misc). */
export type EquipmentItem = Item

/**
 * The type dropdown, as `{Dropdown name}`: each maps to one details
 * payload. `misc` is the default — an item with no details yet.
 */
export type ItemType =
  | 'misc'
  | 'armor'
  | 'clothing'
  | 'food'
  | 'potion'
  | 'ammunition'
  | 'weapon'

const TYPE_DETAILS: Record<ItemType, ItemDetails> = {
  misc: { misc: '' },
  armor: { slot: 'chest', attackBonus: '' },
  clothing: { slot: 'chest', attackBonus: '' },
  food: { effect: '', flavor: 'food' },
  potion: { effect: '', flavor: 'potion' },
  ammunition: { attackBonus: '', damage: '' },
  weapon: { slot: 'mainHand', type: 'melee', attackBonus: '', damage: '' },
}

/** Which payload class each type belongs to: armor/clothing are wearables, food/potion consumables. */
export type ItemTypeClass = 'weapon' | 'wearable' | 'consumable' | 'weaponConsumable' | 'misc'

export const ITEM_TYPE_CLASS: Record<ItemType, ItemTypeClass> = {
  misc: 'misc',
  armor: 'wearable',
  clothing: 'wearable',
  food: 'consumable',
  potion: 'consumable',
  ammunition: 'weaponConsumable',
  weapon: 'weapon',
}

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  misc: 'Miscellaneous',
  armor: 'Armor',
  clothing: 'Clothing',
  food: 'Food',
  potion: 'Potion',
  ammunition: 'Ammunition',
  weapon: 'Weapon',
}

/** The dropdown type an item's payload reads as. */
export function typeOf(details: ItemDetails): ItemType {
  if ('misc' in details) return 'misc'
  if ('slot' in details && 'type' in details) return 'weapon'
  if ('slot' in details && 'attackBonus' in details) return 'armor'
  if ('attackBonus' in details && 'damage' in details && !('slot' in details)) return 'ammunition'
  if ('effect' in details) return 'flavor' in details && details.flavor === 'potion' ? 'potion' : 'food'
  return 'misc'
}

/**
 * Rewraps details for a new type, carrying over what fits ("preserve
 * overlap, drop the rest"): fields the old and new payloads share survive;
 * everything else falls back to the new type's default.
 */
export function switchType(details: ItemDetails, type: ItemType): ItemDetails {
  if (type === 'misc') return { misc: '' }
  const next: Record<string, unknown> = { ...TYPE_DETAILS[type] } as unknown as Record<string, unknown>
  for (const key of Object.keys(next)) {
    const value = (details as unknown as Record<string, unknown>)[key]
    if (value !== undefined && value !== null) {
      next[key] = value
    }
  }
  return next as unknown as ItemDetails
}