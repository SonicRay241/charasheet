import { useState } from 'react'
import type { Item } from '@/db/db'
import type { ItemType } from '@/db/item-types'
import { ITEM_TYPE_LABELS, typeOf, switchType } from '@/db/item-types'
import { BareInput, EditableNumber } from '@/components/terminal/bare-input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronRightIcon, Trash2Icon } from 'lucide-react'

/**
 * The equipment list's type dropdown, in order; weapons pick theirs in the
 * weapons panel (the same dropdown, sans items their list already covers).
 */
export const ITEM_TYPES: readonly ItemType[] = ['misc', 'armor', 'clothing', 'food', 'potion', 'ammunition']

/**
 * The item's type dropdown. `misc` is the default (no details); picking a
 * type rewraps the payload, preserving overlapping fields.
 */
export function ItemTypeSelect({ item, onUpdate, options = ITEM_TYPES, className }: {
  item: Item
  onUpdate: (changes: Partial<Omit<Item, 'id'>>) => void
  /** Types offered (equipment offers all but weapon; weapons only weapon). */
  options?: readonly ItemType[]
  className?: string
}) {
  const current = typeOf(item.details)
  const available = options.filter((type) => type !== 'weapon' || current === 'weapon')
  return (
    <select
      aria-label={`Type of ${item.name || 'item'}`}
      className={className ?? 'terminal-input py-0 text-xs'}
      value={current}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const next = event.target.value as ItemType
        if (next !== current) onUpdate({ details: switchType(item.details, next) })
      }}
    >
      {available.map((type) => (
        <option key={type} value={type}>{ITEM_TYPE_LABELS[type]}</option>
      ))}
    </select>
  )
}

/**
 * One equipment row: name + amount + type dropdown, a chevron at the far
 * end opening the item's stats modal (type, weight, description, delete).
 * The whole row is clickable; the dropdown and the inputs stop propagation
 * so they don't open the modal too.
 */
export function GearItemRow({ item, onDelete, onUpdate }: {
  item: Item
  onDelete: () => void
  onUpdate: (changes: Partial<Omit<Item, 'id'>>) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ItemStatsModal item={item} open={open} onOpenChange={setOpen} onDelete={onDelete} onUpdate={onUpdate} showType />
      <div
        className="grid cursor-pointer grid-cols-[1fr_3.5rem_8rem_1rem] items-center gap-2"
        onClick={() => setOpen(true)}
        data-slot="gear-item-row"
        onKeyDown={(event) => event.key === 'Enter' && setOpen(true)}
      >
        <BareInput
          value={item.name}
          placeholder="New item"
          onClick={(event) => event.stopPropagation()}
          onCommit={(name) => onUpdate({ name })}
        />
        <EditableNumber
          className="text-center text-sm font-semibold"
          value={item.amount}
          onClick={(event) => event.stopPropagation()}
          onCommit={(amount) => amount !== null && onUpdate({ amount })}
        />
        <ItemTypeSelect item={item} onUpdate={onUpdate} />
        <ChevronRightIcon className="size-4 text-paper-muted-foreground" />
      </div>
    </>
  )
}

/**
 * The item's stats in a paper modal: type, description, weight — and the
 * delete button (moved off the row). Everything commits as edited. Weapons
 * add their attack/damage lines via `extra`.
 */
export function ItemStatsModal({ item, open, onOpenChange, onDelete, onUpdate, extra, showType = false }: {
  item: Item
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  onUpdate: (changes: Partial<Omit<Item, 'id'>>) => void
  /** Weapon attack/damage lines, rendered between type and weight. */
  extra?: React.ReactNode
  /** Whether the type dropdown shows (weapons manage type via damage/type). */
  showType?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-paper text-paper-foreground border-paper-border">
        <DialogHeader>
          <DialogTitle>{item.name || 'Unnamed item'}</DialogTitle>
          <DialogDescription className="text-paper-muted-foreground">
            {showType ? 'The type decides what the item does and where it can be worn or held.' : 'What it does, and what it weighs.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {showType && (
            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <span className="terminal-label">Type</span>
              <ItemTypeSelect item={item} onUpdate={onUpdate} className="terminal-input" />
            </div>
          )}
          {extra}
          <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
            <span className="terminal-label">Weight</span>
            <BareInput
              className="terminal-input"
              value={String(item.weight ?? 0)}
              onCommit={(weight) => onUpdate({ weight: Number(weight) || 0 })}
            />
          </div>
          <div className="grid grid-cols-[5rem_1fr] items-start gap-2">
            <span className="terminal-label">Description</span>
            <BareInput
              className="terminal-input"
              value={item.description}
              placeholder="—"
              onCommit={(description) => onUpdate({ description })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outlinePaper" size="sm" onClick={() => { onOpenChange(false); onDelete() }} className="text-red-700">
            <Trash2Icon /> Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}