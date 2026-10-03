import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '@/db/db'
import type { Weapon } from '@/db/db'
import { addWeapon, deleteWeapon, updateWeapon } from '@/db/weapons'
import { Panel } from '@/components/terminal/panel'
import { BareInput } from '@/components/terminal/bare-input'
import { ItemStatsModal } from '@/components/gear/gear-item-row'
import { ConfirmDialog } from '@/components/terminal/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ChevronRightIcon, PlusIcon } from 'lucide-react'

interface WeaponsPanelProps {
  characterId: string
}

export function WeaponsPanel({ characterId }: WeaponsPanelProps) {
  const character = useLiveQuery(() => db.characters.get(characterId), [characterId])
  const [openId, setOpenId] = useState<string | null>(null)
  const [weaponToDelete, setWeaponToDelete] = useState<Weapon | null>(null)

  if (!character) return null

  const weapons = character.weapons ?? []

  return (
    <Panel
      label="Weapons"
      className='bg-paper text-paper-foreground border-paper-border'
      action={
        <Button variant="outlinePaper" size="icon-sm" aria-label="Add weapon" onClick={() => addWeapon(characterId)}>
          <PlusIcon />
        </Button>
      }
    >
      {weapons.length === 0 ? (
        <p className="text-sm text-paper-muted-foreground">No weapons yet.</p>
      ) : (
        <div className="grid gap-1">
          <div className="grid grid-cols-[1fr_3.5rem_7rem_1rem] gap-2">
            <span className="terminal-label">Name</span>
            <span className="terminal-label text-center">Atk</span>
            <span className="terminal-label">Damage/Type</span>
            <span />
          </div>
          {weapons.map((weapon) => (
            <div key={weapon.id}>
              <ItemStatsModal
                item={weapon}
                open={openId === weapon.id}
                onOpenChange={(open) => setOpenId(open ? weapon.id : null)}
                onDelete={() => setWeaponToDelete(weapon)}
                onUpdate={(changes) => {
                  const { details, ...rest } = changes
                  // weapons keep a WeaponDetails payload (the type dropdown
                  // is hidden); other field edits pass through
                  updateWeapon(characterId, weapon.id, {
                    ...rest,
                    ...(details && 'type' in details ? { details: details as Weapon['details'] } : {}),
                  } as Partial<Weapon>)
                }}
                extra={
                  <>
                    <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
                      <span className="terminal-label">Attack</span>
                      <BareInput
                        className="terminal-input"
                        value={weapon.details.attackBonus}
                        placeholder="+0"
                        onCommit={(attackBonus) =>
                          updateWeapon(characterId, weapon.id, { details: { ...weapon.details, attackBonus } })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
                      <span className="terminal-label">Damage/Type</span>
                      <BareInput
                        className="terminal-input"
                        value={weapon.details.damage}
                        placeholder="1d4+0/B"
                        onCommit={(damage) =>
                          updateWeapon(characterId, weapon.id, { details: { ...weapon.details, damage } })
                        }
                      />
                    </div>
                  </>
                }
              />
              <div
                className="grid cursor-pointer grid-cols-[1fr_3.5rem_7rem_1rem] items-center gap-2"
                onClick={() => setOpenId(weapon.id)}
                onKeyDown={(event) => event.key === 'Enter' && setOpenId(weapon.id)}
              >
                <BareInput
                  value={weapon.name}
                  placeholder="New weapon"
                  onClick={(event) => event.stopPropagation()}
                  onCommit={(name) => updateWeapon(characterId, weapon.id, { name })}
                />
                <BareInput
                  value={weapon.details.attackBonus}
                  placeholder="+0"
                  className="text-center"
                  onClick={(event) => event.stopPropagation()}
                  onCommit={(attackBonus) =>
                    updateWeapon(characterId, weapon.id, { details: { ...weapon.details, attackBonus } })
                  }
                />
                <BareInput
                  value={weapon.details.damage}
                  placeholder="1d4+0/B"
                  onClick={(event) => event.stopPropagation()}
                  onCommit={(damage) =>
                    updateWeapon(characterId, weapon.id, { details: { ...weapon.details, damage } })
                  }
                />
                <ChevronRightIcon className="size-4 text-paper-muted-foreground" />
              </div>
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