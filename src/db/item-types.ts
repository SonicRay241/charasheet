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

/** Gear stored in `character.equipment` (wearables, consumables, misc). */
export type EquipmentItem = Item

/** Selectable kinds in the equipment list's type dropdown (weapons live in their own list). */
export type ItemKind = 'wearable' | 'consumable'

const KIND_DETAILS: Record<ItemKind, ItemDetails> = {
  wearable: { slot: 'chest', attackBonus: '' },
  consumable: { effect: '' },
}

/** Human labels for the kinds. */
export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  wearable: 'Wearable',
  consumable: 'Consumable',
}

/** The kind an item's details payload reads as, for the dropdown. */
export function kindOf(details: ItemDetails): ItemKind | undefined {
  if ('effect' in details) return 'consumable'
  if ('slot' in details && 'attackBonus' in details && !('type' in details)) return 'wearable'
  return undefined
}

/**
 * Rewraps details for a new kind, carrying over what fits (the user's ask:
 * "preserve overlap, drop the rest") — attackBonus/damage/slot survive
 * where the new kind has them; everything else falls back to the kind's
 * default.
 */
export function switchKind(details: ItemDetails, kind: ItemKind): ItemDetails {
  const next = { ...KIND_DETAILS[kind] }
  // fields shared between old and new payloads survive the switch
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    if (key in details && details[key as keyof ItemDetails] !== undefined) {
      next[key] = details[key as keyof ItemDetails] as never
    }
  }
  return next
}

/** A fresh details payload for a kind. */
export function createDetails(kind: ItemKind): ItemDetails {
  return { ...KIND_DETAILS[kind] }
}