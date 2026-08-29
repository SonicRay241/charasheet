import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '@/db/db'
import type { EquipmentItem } from '@/db/db'
import { addEquipmentItem, deleteEquipmentItem, updateEquipmentItem } from '@/db/equipment'
import { Panel } from '@/components/terminal/panel'
import { BareInput, EditableNumber } from '@/components/terminal/bare-input'
import { ConfirmDialog } from '@/components/terminal/confirm-dialog'
import { Button } from '@/components/ui/button'
import { PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'

interface EquipmentPanelProps {
  characterId: string
}

export function EquipmentPanel({ characterId }: EquipmentPanelProps) {
  const character = useLiveQuery(() => db.characters.get(characterId), [characterId])
  const [itemToDelete, setItemToDelete] = useState<EquipmentItem | null>(null)
  const [query, setQuery] = useState('')

  if (!character) return null

  const equipment = character.equipment ?? []
  const normalizedQuery = query.trim().toLowerCase()
  const visibleEquipment = normalizedQuery
    ? equipment.filter(
        (item) =>
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery),
      )
    : equipment

  return (
    <Panel
      label="Equipment"
      action={
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Add equipment"
          onClick={() => addEquipmentItem(characterId)}
        >
          <PlusIcon />
        </Button>
      }
    >
      <div className="relative mb-2">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          placeholder="Search equipment..."
          onChange={(e) => setQuery(e.target.value)}
          className="terminal-input pl-6"
        />
      </div>

      {equipment.length === 0 ? (
        <p className="text-sm text-muted-foreground">No equipment yet.</p>
      ) : visibleEquipment.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items match “{query.trim()}”.</p>
      ) : (
        <div className="grid gap-1">
          <div className="grid grid-cols-[1fr_3.5rem_2fr_1.75rem] gap-2">
            <span className="terminal-label">Item</span>
            <span className="terminal-label text-center">Amount</span>
            <span className="terminal-label">Description</span>
            <span />
          </div>
          {visibleEquipment.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_3.5rem_2fr_1.75rem] items-center gap-2">
              <BareInput
                value={item.name}
                placeholder="New item"
                onCommit={(name) => updateEquipmentItem(characterId, item.id, { name })}
              />
              <EditableNumber
                className="text-center text-sm font-semibold"
                value={item.amount}
                onCommit={(amount) =>
                  amount !== null && updateEquipmentItem(characterId, item.id, { amount })
                }
              />
              <BareInput
                value={item.description}
                placeholder="—"
                onCommit={(description) => updateEquipmentItem(characterId, item.id, { description })}
              />
              <Button
                variant="destructive"
                size="icon-sm"
                aria-label={`Delete ${item.name || 'item'}`}
                onClick={() => setItemToDelete(item)}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        title="Delete Equipment"
        description={`Remove ${itemToDelete?.name || 'this item'} from your equipment? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (itemToDelete) {
            deleteEquipmentItem(characterId, itemToDelete.id)
          }
          setItemToDelete(null)
        }}
      />
    </Panel>
  )
}