/**
 * The mannequin's slots: what a character
 * wears and holds, each slot naming one of their own weapons or equipment
 * items by id. Only things that belong there go in a slot: a sheet's gear is
 * just a name, so that's told from the name (boots on the feet, a hood on the
 * head, gloves or a ring on the hands; weapons, shields and lights held in
 * them). Words are matched whole, since names are full of them: an Escape
 * Rope is no cape, nor a Captain's Log a cap. A slot whose
 * item has since been deleted, or renamed into something that doesn't belong,
 * is empty.
 */
import { db, type Character, type EquipmentItem, type EquipSlot, type Weapon } from './db'
import type { ItemDetails } from './item-types'
import { updateCharacter } from './characters'

export const EQUIP_SLOTS: readonly EquipSlot[] = ['head', 'chest', 'hands', 'legs', 'feet', 'mainHand', 'offHand']

export const SLOT_LABELS: Record<EquipSlot, string> = {
  head: 'Head',
  chest: 'Chest',
  hands: 'Hands',
  legs: 'Legs',
  feet: 'Feet',
  mainHand: 'Main hand',
  offHand: 'Off hand',
}

/** Where a thing can go: a slot it's worn in, or held in either hand. */
export type Fit = 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'held'

/**
 * In order: the first match decides, so "Plate Boots" are boots, "Mail
 * Gauntlets" go on the hands, a "Mail Coif" on the head and a "Hooded Cloak"
 * on the chest.
 */
const FITS: [Fit, RegExp][] = [
  ['feet', /\b(boots?|shoes?|sandals?|sabatons?|slippers?|footwraps?)\b/],
  ['legs', /\b(leggings?|trousers|pants|greaves|breeches|skirts?|kilts?|chausses|tassets?|legguards?)\b/],
  ['hands', /\b(gloves?|gauntlets?|mitts?|mittens?|handwraps?|bracers?|vambraces?|bracelets?|bangles?|wrist ?guards?|armbands?|rings?|signets?)\b/],
  ['chest', /\b(cloaks?|capes?|robes?|gowns?|mantles?)\b/],
  ['head', /\b(hoods?|hooded|cowls?|helms?|helmets?|hats?|caps?|coifs?|masks?|crown|circlets?|tiaras?|diadems?|headbands?)\b/],
  ['chest', /\b(tunics?|armou?r|mail|chainmail|hauberks?|plate|breastplates?|cuirass(es)?|shirts?|vests?|jerkins?|gambesons?|coats?|doublets?|brigandines?|jackets?)\b/],
  ['held', /\b(shields?|bucklers?|torch(es)?|lanterns?|lamps?|staff|staves|rods?|wands?|orbs?)\b/],
]

/** Where something goes, from its type, not its name: weapons are held (a two-hander only in the main hand); wearables sit in the slot they name; consumables, ammunition, rings and amulets go nowhere (no mannequin slot). */
export function fitOfDetails(details: ItemDetails): Fit | undefined {
  if (!('slot' in details)) return undefined
  const { slot } = details
  if (slot === 'mainHand' || slot === 'offHand' || slot === 'twoHanded') return 'held'
  return slot === 'head' || slot === 'chest' || slot === 'hands' || slot === 'legs' || slot === 'feet' ? slot : undefined
}

/** Whether it takes both hands, by its type (the migration infers this from names; from here on the type decides). */
export function twoHanded(details: ItemDetails): boolean {
  return 'slot' in details && details.slot === 'twoHanded'
}

/** Whether the payload is a held thing (a hand slot). */
export function heldItem(details: ItemDetails): boolean {
  return 'slot' in details && (details.slot === 'mainHand' || details.slot === 'offHand' || details.slot === 'twoHanded')
}

/** Where something goes, from its name: weapons are held; anything unrecognised goes nowhere. */
export function fitOf(name: string, weapon: boolean): Fit | undefined {
  if (weapon) return 'held'
  const n = name.toLowerCase()
  return FITS.find(([, pattern]) => pattern.test(n))?.[0]
}

/** Weapons that take both hands: greatswords and bows. */
const TWO_HANDED = /\b(great ?swords?|claymores?|zweihanders?|(long|short|cross)?bows?)\b/

/** Whether it takes both hands, from its name (migration only; the type decides at runtime). */
export function isTwoHanded(name: string, weapon: boolean): boolean {
  return weapon && TWO_HANDED.test(name.toLowerCase())
}

/** Whether something can go in a slot, by its type payload. */
export function fitsSlot(slot: EquipSlot, details: ItemDetails): boolean {
  if (!('slot' in details)) return false
  const fit = fitOfDetails(details)
  if (slot === 'offHand') return fit === 'held' && details.slot !== 'twoHanded'
  return slot === 'mainHand' ? fit === 'held' : fit === slot
}

export type Equipped = { kind: 'weapon'; item: Weapon } | { kind: 'equipment'; item: EquipmentItem }

/** Something of the character's by id, weapon or equipment. */
function findGear(character: Character, id: string): Equipped | undefined {
  const weapon = (character.weapons ?? []).find((item) => item.id === id)
  if (weapon) return { kind: 'weapon', item: weapon }
  const item = (character.equipment ?? []).find((entry) => entry.id === id)
  return item && { kind: 'equipment', item }
}

/** What's in a slot, if anything (still in the character's gear, and belonging there). */
export function equippedIn(character: Character, slot: EquipSlot): Equipped | undefined {
  if (slot === 'offHand' && bothHandsOn(character)) return undefined
  const id = character.equipped?.[slot]
  const gear = id ? findGear(character, id) : undefined
  return gear && fitsSlot(slot, 'slot' in gear.item.details ? gear.item.details : { effect: '' }) ? gear : undefined
}

/** The two-handed weapon in the main hand, if that's what's held (the off hand is taken up by it). */
export function bothHandsOn(character: Character): Equipped | undefined {
  const main = equippedIn(character, 'mainHand')
  return main && twoHanded(main.item.details) ? main : undefined
}

/**
 * Put an item in a slot (or empty it, with null). An item is only in one
 * place at a time, so it leaves whichever slot it was in before; a two-handed
 * weapon empties the off hand too. Something that doesn't belong in the slot
 * isn't put there, nor anything in an off hand a two-handed weapon has taken.
 */
export async function equip(characterId: string, slot: EquipSlot, itemId: string | null): Promise<void> {
  if (itemId !== null) {
    const character = await db.characters.get(characterId)
    const gear = character && findGear(character, itemId)
    if (!gear || !fitsSlot(slot, 'slot' in gear.item.details ? gear.item.details : { effect: '' })) return
    if (slot === 'offHand' && bothHandsOn(character)) return
  }
  await updateCharacter(characterId, (character) => {
    const equipped = { ...(character.equipped ?? {}) }
    for (const other of EQUIP_SLOTS) {
      if (itemId !== null && equipped[other] === itemId) delete equipped[other]
    }
    if (itemId === null) delete equipped[slot]
    else equipped[slot] = itemId
    const gear = itemId === null ? undefined : findGear(character, itemId)
    if (slot === 'mainHand' && gear && twoHanded(gear.item.details)) delete equipped.offHand
    return { equipped }
  })
}
