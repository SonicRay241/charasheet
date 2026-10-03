// The mannequin's slots.
import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import type { EquipmentItem, Weapon } from './db'
import type { ItemDetails, WearableDetails } from './item-types'
import { addCharacter, createCharacter, updateCharacter } from './characters'
import { bothHandsOn, equip, equippedIn, fitOf, fitOfDetails, fitsSlot, isTwoHanded } from './equipped'
import { deserializeCharacter, parseCharacterData, serializeCharacter } from './transfer'
import { mergeCharacter } from '../sync/sync-engine'
import { handwearOf, headgearOf, heldShape } from '@/components/barracks/gear-names'

const sword: Weapon = { id: 'w1', name: 'Iron Sword', amount: 1, description: '', weight: 3, details: { slot: 'mainHand', type: 'melee', attackBonus: '+4', damage: '1d8+2/S' } }
const hood: EquipmentItem = { id: 'e1', name: 'Leather Hood', amount: 1, description: '', weight: 1, details: { slot: 'head', attackBonus: '+2' } }
const shield: EquipmentItem = { id: 'e2', name: 'Rusty Shield', amount: 1, description: '', weight: 6, details: { slot: 'mainHand', type: 'melee', attackBonus: '+2', damage: '+KNB' } }
const tunic: EquipmentItem = { id: 'e3', name: 'Leather Tunic', amount: 1, description: '', weight: 10, details: { slot: 'chest', attackBonus: '+2' } }

describe('equipped slots', () => {
  beforeEach(async () => {
    await db.characters.clear()
  })

  it('puts an item in one slot at a time, and takes it off', async () => {
    const created = await addCharacter('Thorin')
    await updateCharacter(created.id, { weapons: [sword], equipment: [hood, shield] })

    await equip(created.id, 'head', hood.id)
    await equip(created.id, 'mainHand', sword.id)
    let loaded = await db.characters.get(created.id)
    expect(loaded?.equipped).toEqual({ head: 'e1', mainHand: 'w1' })
    expect(equippedIn(loaded!, 'head')).toEqual({ kind: 'equipment', item: hood })
    expect(equippedIn(loaded!, 'mainHand')).toEqual({ kind: 'weapon', item: sword })

    // moving it to the other hand empties the first
    await equip(created.id, 'offHand', sword.id)
    loaded = await db.characters.get(created.id)
    expect(loaded?.equipped).toEqual({ head: 'e1', offHand: 'w1' })

    await equip(created.id, 'head', null)
    loaded = await db.characters.get(created.id)
    expect(loaded?.equipped).toEqual({ offHand: 'w1' })
  })

  it("won't put something where it doesn't belong", async () => {
    const created = await addCharacter('Thorin')
    await updateCharacter(created.id, { weapons: [sword], equipment: [hood, tunic] })

    await equip(created.id, 'head', tunic.id)
    await equip(created.id, 'chest', sword.id)
    await equip(created.id, 'mainHand', hood.id)
    const loaded = await db.characters.get(created.id)
    expect(loaded?.equipped).toEqual({})
  })

  it('takes both hands for a greatsword or bow', async () => {
    const greatsword: Weapon = { id: 'w2', name: 'Iron Greatsword', amount: 1, description: '', weight: 8, details: { slot: 'twoHanded', type: 'melee', attackBonus: '+4', damage: '2d6+2/S' } }
    const bow: Weapon = { id: 'w3', name: 'Seasoned Bow', amount: 1, description: '', weight: 2, details: { slot: 'twoHanded', type: 'ranged', attackBonus: '+5', damage: '1d8+3/P' } }
    const created = await addCharacter('Thorin')
    await updateCharacter(created.id, { weapons: [sword, greatsword, bow], equipment: [shield] })

    await equip(created.id, 'mainHand', sword.id)
    await equip(created.id, 'offHand', shield.id)
    // taking up the greatsword puts the shield away
    await equip(created.id, 'mainHand', greatsword.id)
    let loaded = await db.characters.get(created.id)
    expect(loaded?.equipped).toEqual({ mainHand: 'w2' })
    expect(bothHandsOn(loaded!)?.item.name).toBe('Iron Greatsword')

    // nothing goes in the off hand meanwhile, and a two-hander never does
    await equip(created.id, 'offHand', shield.id)
    await equip(created.id, 'offHand', sword.id)
    loaded = await db.characters.get(created.id)
    expect(loaded?.equipped).toEqual({ mainHand: 'w2' })
    await equip(created.id, 'mainHand', sword.id)
    await equip(created.id, 'offHand', bow.id)
    loaded = await db.characters.get(created.id)
    expect(loaded?.equipped).toEqual({ mainHand: 'w1' })

    // an off hand saved alongside a two-hander (say, from a merge) is empty
    const merged = { ...loaded!, equipped: { mainHand: 'w3', offHand: 'e2' } }
    expect(equippedIn(merged, 'offHand')).toBeUndefined()
    expect(isTwoHanded('Crude Bow', true)).toBe(true)
    expect(isTwoHanded('Crude Sword', true)).toBe(false)
    expect(isTwoHanded('Iron Battle Axe', true)).toBe(false)
  })

  it('treats a slot whose item was deleted, or never belonged there, as empty', () => {
    const character = { ...createCharacter('Thorin'), equipment: [hood, tunic], equipped: { head: 'gone', legs: 'e3' } }
    expect(equippedIn(character, 'head')).toBeUndefined()
    expect(equippedIn(character, 'legs')).toBeUndefined()
  })

  it('keeps what is equipped through export and import', () => {
    const character = {
      ...createCharacter('Thorin'),
      weapons: [sword],
      equipment: [hood],
      equipped: { head: 'e1', mainHand: 'w1' },
    }
    const parsed = deserializeCharacter(serializeCharacter(character))
    expect(parsed.equipped).toEqual({ head: 'e1', mainHand: 'w1' })
    expect(equippedIn(parsed, 'head')?.item.name).toBe('Leather Hood')
  })

  it('drops unknown slots and non-string ids on import, and defaults to none', () => {
    expect(parseCharacterData({ name: 'Aria' }).equipped).toEqual({})
    const parsed = parseCharacterData({ equipped: { head: 'e1', tail: 'e2', feet: 3, legs: '' } })
    expect(parsed.equipped).toEqual({ head: 'e1' })
  })

  it('merges the slots as one field, the later write winning', () => {
    const local = { ...createCharacter('Thorin'), equipped: { head: 'e1' }, fieldTimestamps: { equipped: 100 } }
    const remote = { ...local, equipped: { head: 'e9' }, fieldTimestamps: { equipped: 200 } }
    expect(mergeCharacter(local, remote).equipped).toEqual({ head: 'e9' })
    expect(mergeCharacter(remote, local).equipped).toEqual({ head: 'e9' })
  })
})

describe('gear told from its name', () => {
  it('recognises common weapons and armour', () => {
    expect(heldShape('Crude Greatsword', true)).toBe('greatsword')
    expect(heldShape('Crude Bow', true)).toBe('bow')
    expect(heldShape('Quarterstaff Husk', true)).toBe('staff')
    expect(heldShape('Iron Battle Axe', true)).toBe('axe')
    expect(heldShape('Iron-Shod Club', true)).toBe('club')
    expect(heldShape('Basic Dagger', true)).toBe('dagger')
    expect(heldShape('Rusty Shield', false)).toBe('shield')
    expect(heldShape('Rope', false)).toBe('pouch')
    expect(heldShape('Bonecleaver', true)).toBe('sword')
    expect(headgearOf('Leather Hood')).toBe('hood')
    expect(headgearOf('Iron Cap')).toBe('hat')
    expect(headgearOf('Iron Helmet')).toBe('helm')
  })

  it('gives each thing one place: a slot it is worn in, or held', () => {
    expect(fitOf('Leather Hood', false)).toBe('head')
    expect(fitOf('Leather Tunic', false)).toBe('chest')
    expect(fitOf('Leather Leggings', false)).toBe('legs')
    expect(fitOf('Leather Boots', false)).toBe('feet')
    expect(fitOf('Plate Boots', false)).toBe('feet')
    expect(fitOf('Mail Coif', false)).toBe('head')
    expect(fitOf('Hooded Cloak', false)).toBe('chest')
    expect(fitOf('Iron Shield', false)).toBe('held')
    expect(fitOf('Iron Mace', true)).toBe('held')
    expect(fitOf('Rations', false)).toBeUndefined()
    expect(fitOf('Rope', false)).toBeUndefined()
    expect(fitsSlot('head', { slot: 'chest', attackBonus: '' })).toBe(false)
    expect(fitsSlot('offHand', { slot: 'offHand', attackBonus: '' } as ItemDetails as WearableDetails)).toBe(true)
    expect(fitsSlot('mainHand', { slot: 'offHand', attackBonus: '' } as ItemDetails as WearableDetails)).toBe(true)
    expect(fitsSlot('feet', { slot: 'twoHanded', type: 'ranged', attackBonus: '', damage: '' })).toBe(false)
  })

  it('puts gloves, gauntlets, bracers and rings on the hands, not in them', () => {
    expect(fitOf('Leather Gloves', false)).toBe('hands')
    expect(fitOf('Mail Gauntlets', false)).toBe('hands')
    expect(fitOf('Iron Bracers', false)).toBe('hands')
    expect(fitOf('Signet Ring', false)).toBe('hands')
    expect(fitsSlot('hands', { slot: 'hands', attackBonus: '' })).toBe(true)
    expect(fitsSlot('mainHand', { slot: 'hands', attackBonus: '' })).toBe(false)
    expect(fitsSlot('hands', { slot: 'mainHand', type: 'melee', attackBonus: '', damage: '' })).toBe(false)
    expect(handwearOf('Mail Gauntlets')).toBe('gloves')
    expect(handwearOf('Iron Bracers')).toBe('bracers')
    expect(handwearOf('Signet Ring')).toBe('ring')
  })

  it('sends an equipped ring nowhere, by type: rings and amulets have no mannequin slot', () => {
    expect(fitOfDetails({ slot: 'ring', attackBonus: '' })).toBeUndefined()
    expect(fitsSlot('hands', { slot: 'ring', attackBonus: '' })).toBe(false)
  })

  it("isn't fooled by words inside other words and names", () => {
    expect(fitOf('Crownsblood', false)).toBeUndefined()
    expect(fitOf('Crownweave Writ', false)).toBeUndefined()
    expect(fitOf('Aerialring Pass', false)).toBeUndefined()
    expect(fitOf('Escape Rope', false)).toBeUndefined()
    expect(fitOf('Blackmail Letter', false)).toBeUndefined()
    expect(fitOf("Captain's Log", false)).toBeUndefined()
    expect(fitOf('Crown', false)).toBe('head')
    expect(fitOf('Crownweave Hood', false)).toBe('head')
    expect(headgearOf('Crownweave Hood')).toBe('hood')
    expect(headgearOf('Crownweave Helm')).toBe('helm')
    expect(heldShape('Rainbow Staff', false)).toBe('staff')
  })
})
