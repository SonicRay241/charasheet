/**
 * What an item is and what it's made of, told from its name, for the sheet's
 * mannequin: a sheet's gear is only a name and a description, so "Leather
 * Hood" has to be enough. Words are matched whole (or by their start, for
 * "rusty" or "golden"), since names are full of them: an Escape Rope is no
 * cape, nor a Captain's Log a cap.
 */
export const WOOD = '#8a6038'
export const IRON = '#9aa0a8'
export const LEATHER = '#7a5230'
export const GOLD = '#c9a13b'
export const BRASS = '#b89a52'
const CLOTHS = ['#7a2e24', '#3d4a5c', '#5d4d2c', '#4a5a3a', '#6b3a52']

/** What it seems to be made of, from its name; `fallback` if the name doesn't say. */
export function materialOf(name: string, fallback: string): string {
  const n = name.toLowerCase()
  if (/\b(gold|gilded)/.test(n)) return GOLD
  if (/\b(silver|mithril)/.test(n)) return '#c9ced6'
  if (/\brust/.test(n)) return '#8a5236'
  if (/\b(bronze|copper|brass)/.test(n)) return '#a8743a'
  if (/\b(steel|iron|chain|mail|plate|metal)|-shod\b/.test(n)) return IRON
  if (/\b(crude|impure)/.test(n)) return '#7d7f84'
  if (/\b(leather|hide|fur)/.test(n)) return LEATHER
  if (/\bbone/.test(n)) return '#ddd2b8'
  if (/\b(wood|oak|timber|husk)/.test(n)) return WOOD
  if (/\b(cloth|wool|linen|silk|fabric|robe|cloak|cape)/.test(n)) {
    return CLOTHS[[...n].reduce((sum, c) => sum + c.charCodeAt(0), 0) % CLOTHS.length]
  }
  return fallback
}

export type Headgear = 'hood' | 'hat' | 'crown' | 'helm'

/** How it sits on the head: anything unrecognised is a helm. */
export function headgearOf(name: string): Headgear {
  const n = name.toLowerCase()
  if (/\b(hoods?|hooded|cowls?)\b/.test(n)) return 'hood'
  if (/\b(hats?|caps?|berets?|bonnets?)\b/.test(n)) return 'hat'
  if (/\b(crown|circlets?|tiaras?|diadems?)\b/.test(n)) return 'crown'
  return 'helm'
}

export type Handwear = 'gloves' | 'bracers' | 'ring'

/** What's on the hands: rings and bracelets as they are, anything else as gloves. */
export function handwearOf(name: string): Handwear {
  const n = name.toLowerCase()
  if (/\b(rings?|signets?)\b/.test(n)) return 'ring'
  if (/\b(bracers?|vambraces?|bracelets?|bangles?|wrist ?guards?|armbands?)\b/.test(n)) return 'bracers'
  return 'gloves'
}

export type Held =
  | 'shield' | 'bow' | 'staff' | 'spear' | 'axe' | 'mace' | 'hammer' | 'club'
  | 'dagger' | 'greatsword' | 'sword' | 'torch' | 'lantern' | 'pouch'

const HELD: [RegExp, Held][] = [
  [/\b(shields?|bucklers?)\b/, 'shield'],
  [/\b(long|short|cross)?bows?\b/, 'bow'],
  [/\b(quarter)?staff\b|\b(staves?|rods?|wands?|canes?)\b/, 'staff'],
  [/\b(spears?|pikes?|lances?|halberds?|glaives?|tridents?|javelins?|polearms?)\b/, 'spear'],
  [/\b(great|battle|hand)?axes?\b|\bhatchets?\b/, 'axe'],
  [/\b(maces?|flails?|morning ?stars?)\b/, 'mace'],
  [/\b(war)?hammers?\b|\bmauls?\b/, 'hammer'],
  [/\b(great)?clubs?\b|\bcudgels?\b/, 'club'],
  [/\b(daggers?|knife|knives|dirks?|stilettos?)\b/, 'dagger'],
  [/\b(great ?swords?|claymores?|zweihanders?)\b/, 'greatsword'],
  [/\b(long|short|broad|bastard)?swords?\b|\b(blades?|sabres?|sabers?|rapiers?|scimitars?|katanas?|cutlass(es)?)\b/, 'sword'],
  [/\btorch(es)?\b/, 'torch'],
  [/\b(lanterns?|lamps?)\b/, 'lantern'],
]

/** What something held looks like: a weapon nobody recognises is a sword, anything else a pouch. */
export function heldShape(name: string, weapon: boolean): Held {
  const n = name.toLowerCase()
  return HELD.find(([pattern]) => pattern.test(n))?.[1] ?? (weapon ? 'sword' : 'pouch')
}
