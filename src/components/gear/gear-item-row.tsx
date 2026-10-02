import { useState } from 'react'
import type { Item } from '@/db/db'
import type { ItemKind } from '@/db/item-types'
import { ITEM_KIND_LABELS, kindOf, switchKind } from '@/db/item-types'
import { BareInput, EditableNumber } from '@/components/terminal/bare-input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronRightIcon, Trash2Icon } from 'lucide-react'

/** The kinds an equipment item can be, in dropdown order. */
const KINDS: readonly ItemKind[] = ['wearable', 'consumable']

/**
 * One equipment row: name + amount + type dropdown, a chevron at the far
 * end opening the item's stats modal (description, weight, delete). The
 * whole row is clickable; the dropdown and the inputs stop propagation so
 * they don't open the modal too.
 */
export function GearItemRow({ item, onDelete, onUpdate }: {
  item: Item
  onDelete: () => void
  onUpdate: (changes: Partial<Omit<Item, 'id'>>) => void
}) {
  const [open, setOpen] = useState(false)
  const kind = kindOf(item.details)

  return (
    <>
      <ItemStatsModal item={item} open={open} onOpenChange={setOpen} onDelete={onDelete} onUpdate={onUpdate} showType />
      <div
        className="grid cursor-pointer grid-cols-[1fr_3.5rem_7rem_1rem] items-center gap-2"
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
      <select
        aria-label={`Type of ${item.name || 'item'}`}
        className="terminal-input py-0 text-xs"
        value={kind ?? ''}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const next = event.target.value as ItemKind
          if (next !== kind) onUpdate({ details: switchKind(item.details, next) })
        }}
      >
        {kind === undefined && <option value="" disabled>Type…</option>}
        {KINDS.map((k) => (
          <option key={k} value={k}>{ITEM_KIND_LABELS[k]}</option>
        ))}
      </select>
      <ChevronRightIcon className="size-4 text-paper-muted-foreground" />
      </div>
    </>
  )
}

/**
 * The item's stats in a paper modal: type, description, weight — and the
 * delete button (moved off the row). Everything commits as edited. Weapons
 * reuse this with extra detail fields via `extra`.
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
  const kind = kindOf(item.details)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-paper text-paper-foreground border-paper-border">
        <DialogHeader>
          <DialogTitle>{item.name || 'Unnamed item'}</DialogTitle>
          <DialogDescription className="text-paper-muted-foreground">
            {kind === undefined ? 'No type yet — pick one to equip it.' : `Type: ${ITEM_KIND_LABELS[kind]}`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {showType && (
            <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
              <span className="terminal-label">Type</span>
              <select
                aria-label={`Type of ${item.name || 'item'}`}
                className="terminal-input"
                value={kind ?? ''}
                onChange={(event) => {
                  const next = event.target.value as ItemKind
                  if (next !== kind) onUpdate({ details: switchKind(item.details, next) })
                }}
              >
                {kind === undefined && <option value="" disabled>Type…</option>}
                {KINDS.map((k) => (
                  <option key={k} value={k}>{ITEM_KIND_LABELS[k]}</option>
                ))}
              </select>
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