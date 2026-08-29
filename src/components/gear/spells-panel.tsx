import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '@/db/db'
import type { Spell } from '@/db/db'
import { addSpell, deleteSpell, updateSpell } from '@/db/spells'
import { Panel } from '@/components/terminal/panel'
import { BareInput, EditableNumber } from '@/components/terminal/bare-input'
import { ConfirmDialog } from '@/components/terminal/confirm-dialog'
import { Button } from '@/components/ui/button'
import { PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'

interface SpellsPanelProps {
  characterId: string
}

export function SpellsPanel({ characterId }: SpellsPanelProps) {
  const character = useLiveQuery(() => db.characters.get(characterId), [characterId])
  const [spellToDelete, setSpellToDelete] = useState<Spell | null>(null)
  const [query, setQuery] = useState('')

  if (!character) return null

  const spells = character.spells ?? []
  const normalizedQuery = query.trim().toLowerCase()
  const visibleSpells = normalizedQuery
    ? spells.filter(
        (spell) =>
          spell.name.toLowerCase().includes(normalizedQuery) ||
          spell.description.toLowerCase().includes(normalizedQuery),
      )
    : spells

  return (
    <Panel
      label="Spells"
      action={
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Add spell"
          onClick={() => addSpell(characterId)}
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
          placeholder="Search spells..."
          onChange={(e) => setQuery(e.target.value)}
          className="terminal-input pl-6"
        />
      </div>

      {spells.length === 0 ? (
        <p className="text-sm text-muted-foreground">No spells yet.</p>
      ) : visibleSpells.length === 0 ? (
        <p className="text-sm text-muted-foreground">No spells match “{query.trim()}”.</p>
      ) : (
        <div className="grid gap-1">
          <div className="grid grid-cols-[1fr_3.5rem_2fr_1.75rem] gap-2">
            <span className="terminal-label">Name</span>
            <span className="terminal-label text-center">Level</span>
            <span className="terminal-label">Description</span>
            <span />
          </div>
          {visibleSpells.map((spell) => (
            <div key={spell.id} className="grid grid-cols-[1fr_3.5rem_2fr_1.75rem] items-center gap-2">
              <BareInput
                value={spell.name}
                placeholder="New spell"
                onCommit={(name) => updateSpell(characterId, spell.id, { name })}
              />
              <EditableNumber
                className="text-center text-sm font-semibold"
                value={spell.level}
                onCommit={(level) =>
                  level !== null && updateSpell(characterId, spell.id, { level })
                }
              />
              <BareInput
                value={spell.description}
                placeholder={spell.level === 0 ? 'Cantrip' : '—'}
                onCommit={(description) => updateSpell(characterId, spell.id, { description })}
              />
              <Button
                variant="destructive"
                size="icon-sm"
                aria-label={`Delete ${spell.name || 'spell'}`}
                onClick={() => setSpellToDelete(spell)}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={spellToDelete !== null}
        onOpenChange={(open) => !open && setSpellToDelete(null)}
        title="Delete Spell"
        description={`Remove ${spellToDelete?.name || 'this spell'} from your spell list? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (spellToDelete) {
            deleteSpell(characterId, spellToDelete.id)
          }
          setSpellToDelete(null)
        }}
      />
    </Panel>
  )
}