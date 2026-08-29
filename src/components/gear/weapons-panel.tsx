import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '@/db/db'
import type { Weapon } from '@/db/db'
import { addWeapon, deleteWeapon, updateWeapon } from '@/db/weapons'
import { Panel } from '@/components/terminal/panel'
import { BareInput } from '@/components/terminal/bare-input'
import { ConfirmDialog } from '@/components/terminal/confirm-dialog'
import { Button } from '@/components/ui/button'
import { PlusIcon, Trash2Icon } from 'lucide-react'

interface WeaponsPanelProps {
  characterId: string
}

export function WeaponsPanel({ characterId }: WeaponsPanelProps) {
  const character = useLiveQuery(() => db.characters.get(characterId), [characterId])
  const [weaponToDelete, setWeaponToDelete] = useState<Weapon | null>(null)

  if (!character) return null

  const weapons = character.weapons ?? []

  return (
    <Panel
      label="Weapons"
      action={
        <Button variant="outline" size="icon-sm" aria-label="Add weapon" onClick={() => addWeapon(characterId)}>
          <PlusIcon />
        </Button>
      }
    >
      {weapons.length === 0 ? (
        <p className="text-sm text-muted-foreground">No weapons yet.</p>
      ) : (
        <div className="grid gap-1">
          <div className="grid grid-cols-[1fr_3.5rem_7rem_1.75rem] gap-2">
            <span className="terminal-label">Name</span>
            <span className="terminal-label text-center">Atk</span>
            <span className="terminal-label">Damage/Type</span>
            <span />
          </div>
          {weapons.map((weapon) => (
            <div key={weapon.id} className="grid grid-cols-[1fr_3.5rem_7rem_1.75rem] items-center gap-2">
              <BareInput
                value={weapon.name}
                placeholder="New weapon"
                onCommit={(name) => updateWeapon(characterId, weapon.id, { name })}
              />
              <BareInput
                value={weapon.attackBonus}
                placeholder="+0"
                className="text-center"
                onCommit={(attackBonus) => updateWeapon(characterId, weapon.id, { attackBonus })}
              />
              <BareInput
                value={weapon.damage}
                placeholder="1d4+0/B"
                onCommit={(damage) => updateWeapon(characterId, weapon.id, { damage })}
              />
              <Button
                variant="destructive"
                size="icon-sm"
                aria-label={`Delete ${weapon.name || 'weapon'}`}
                onClick={() => setWeaponToDelete(weapon)}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={weaponToDelete !== null}
        onOpenChange={(open) => !open && setWeaponToDelete(null)}
        title="Delete Weapon"
        description={`Remove ${weaponToDelete?.name || 'this weapon'} from your gear? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (weaponToDelete) {
            deleteWeapon(characterId, weaponToDelete.id)
          }
          setWeaponToDelete(null)
        }}
      />
    </Panel>
  )
}