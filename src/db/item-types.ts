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

/** Potions, food, etc. — described purely by their effect text. */
export interface ConsumableDetails {
  effect: string
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

export interface Item<T extends ItemDetails = ItemDetails> {
  id: string
  name: string
  amount: number
  description: string
  weight: number
  details: T
}

/** Weapon stored in `character.weapons`; same shape regardless of list. */
export type WeaponItem = Item<WeaponDetails>

/** Gear stored in `character.equipment` (wearables, consumables, misc). */
export type EquipmentItem = Item