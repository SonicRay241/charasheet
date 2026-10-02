/**
 * What the character has on, Minecraft-inventory style: the mannequin in the
 * middle, armour slots down one side and
 * what's on and in the hands down the other. A slot opens a list of the character's own weapons
 * and equipment that belong in it to choose from.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { db } from '@/db/db'
import type { Character, EquipSlot } from '@/db/db'
import { EQUIP_SLOTS, SLOT_LABELS, bothHandsOn, equip, equippedIn, fitsSlot, isTwoHanded, type Equipped } from '@/db/equipped'
import { Panel } from '@/components/terminal/panel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { looksOf } from '@/components/barracks/looks'
import { Mannequin } from '@/components/barracks/mannequin'
import { barracksAnimated } from '@/components/barracks/motion'
import { cn } from '@/lib/utils'

const WORN: readonly EquipSlot[] = ['head', 'chest', 'legs', 'feet']
const HANDS: readonly EquipSlot[] = ['hands', 'mainHand', 'offHand']

/** What the picker suggests when nothing the character has goes in a slot. */
const WANTED: Record<EquipSlot, string> = {
  head: 'a hood, helmet, hat or circlet',
  chest: 'a tunic, armour, mail or a robe',
  hands: 'gloves, gauntlets, bracers or a ring',
  legs: 'leggings, trousers or greaves',
  feet: 'boots or shoes',
  mainHand: 'a weapon, shield, torch or staff',
  offHand: 'a weapon, shield, torch or staff',
}

interface EquippedPanelProps {
  characterId: string
}

export function EquippedPanel({ characterId }: EquippedPanelProps) {
  const character = useLiveQuery(() => db.characters.get(characterId), [characterId])
  const [choosing, setChoosing] = useState<EquipSlot | null>(null)

  if (!character) return null

  const gear: Partial<Record<EquipSlot, Equipped>> = {}
  for (const slot of EQUIP_SLOTS) {
    const equipped = equippedIn(character, slot)
    if (equipped) gear[slot] = equipped
  }

  // a two-handed weapon in the main hand takes the off hand too
  const bothHands = bothHandsOn(character)

  const slotButton = (slot: EquipSlot) => {
    const name = gear[slot] && (gear[slot].item.name || 'Unnamed')
    const locked = slot === 'offHand' && bothHands !== undefined
    const text = locked ? `Both hands on the ${bothHands.item.name || 'weapon'}` : name
    return (
      <button
        key={slot}
        type="button"
        className="equip-slot"
        data-filled={name ? '' : undefined}
        disabled={locked}
        aria-label={`${SLOT_LABELS[slot]}: ${text ?? 'empty'}${locked ? '' : '. Change'}`}
        onClick={() => setChoosing(slot)}
      >
        <span className="terminal-label">{SLOT_LABELS[slot]}</span>
        <span className={cn('line-clamp-3 text-sm leading-snug wrap-break-word', !name && 'text-paper-muted-foreground')}>{text ?? '—'}</span>
      </button>
    )
  }

  return (
    <Panel label="Equipped" className="bg-paper text-paper-foreground border-paper-border">
      <div className="grid grid-cols-[1fr_minmax(6.5rem,11rem)_1fr] items-stretch gap-2">
        <div className="grid gap-2">{WORN.map(slotButton)}</div>
        <div className="terminal-panel mannequin-stage">
          <Mannequin looks={looksOf(character.id)} gear={gear} animate={barracksAnimated()} />
        </div>
        <div className="grid gap-2">{HANDS.map(slotButton)}</div>
      </div>

      <SlotPicker
        character={character}
        slot={choosing}
        onClose={() => setChoosing(null)}
      />
    </Panel>
  )
}

/** The character's gear that belongs in a slot, to put there. */
function SlotPicker({ character, slot, onClose }: { character: Character; slot: EquipSlot | null; onClose: () => void }) {
  const current = slot ? equippedIn(character, slot)?.item.id : undefined
  const whereIs = new Map(
    EQUIP_SLOTS.flatMap((other) => {
      const id = equippedIn(character, other)?.item.id
      return id && other !== slot ? [[id, other] as const] : []
    }),
  )
  const offHand = equippedIn(character, 'offHand')
  const options = [
    ...(character.weapons ?? []).map((item) => {
      const both = isTwoHanded(item.name, true)
      // taking up a two-handed weapon puts away what's in the other hand
      const putsAway = both && slot === 'mainHand' && offHand && offHand.item.id !== item.id
      return {
        id: item.id,
        name: item.name,
        weapon: true,
        note: `Weapon${both ? ' · two-handed' : ''}${putsAway ? ` · puts away the ${offHand.item.name}` : ''}`,
      }
    }),
    ...(character.equipment ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      weapon: false,
      note: item.amount === 1 ? 'Equipment' : `Equipment ×${item.amount}`,
    })),
  ]
    .filter((option) => slot !== null && fitsSlot(slot, option.name, option.weapon))

  const choose = (itemId: string | null) => {
    if (slot) equip(character.id, slot, itemId)
    onClose()
  }

  return (
    <Dialog open={slot !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{slot && SLOT_LABELS[slot]}</DialogTitle>
          <DialogDescription>
            {slot && options.length === 0
              ? `Nothing you carry goes here. Add ${WANTED[slot]} to your ${slot === 'mainHand' || slot === 'offHand' ? 'weapons or equipment' : 'equipment'} first.`
              : 'Choose from what you carry that goes here.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-1 overflow-y-auto">
          {current && (
            <Button variant="outline" className="justify-start" onClick={() => choose(null)}>
              Take it off
            </Button>
          )}
          {options.map((option) => (
            <Button
              key={option.id}
              variant={option.id === current ? 'secondary' : 'ghost'}
              aria-pressed={option.id === current}
              className="h-auto justify-between gap-3 py-1.5 text-left"
              onClick={() => choose(option.id)}
            >
              <span className="min-w-0">
                <span className="block truncate">{option.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {option.note}
                  {whereIs.has(option.id) && ` · now in ${SLOT_LABELS[whereIs.get(option.id)!]}`}
                </span>
              </span>
              {option.id === current && <CheckIcon />}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
