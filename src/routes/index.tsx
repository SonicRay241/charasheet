import { useLiveQuery } from 'dexie-react-hooks'
import { createFileRoute, Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { db } from '@/db/db'
import { addCharacter, deleteCharacter } from '@/db/characters'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/terminal/panel'

export const Route = createFileRoute('/')({
  component: CharactersPage,
})

function CharactersPage() {
  const characters = useLiveQuery(() => db.characters.orderBy('name').toArray())

  async function handleAdd() {
    const character = await addCharacter('New Character')
    toast.success(`Created ${character.name}`)
  }

  async function handleDelete(id: string, name: string) {
    await deleteCharacter(id)
    toast.success(`Deleted ${name}`)
  }

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold uppercase tracking-widest text-primary">Characters</h1>
        <Button variant="outline" onClick={handleAdd}>
          New Character
        </Button>
      </div>

      {characters === undefined ? (
        <p className="text-muted-foreground">LOADING…</p>
      ) : characters.length === 0 ? (
        <p className="text-muted-foreground">No characters yet. Create your first one.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <Panel key={character.id} label={character.name}>
              <p className="text-sm text-muted-foreground">
                {character.className || '—'} · LVL {character.level} · HP{' '}
                {character.currentHitPoints}/{character.hitPointMaximum} · AC {character.armorClass}
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/characters/$characterId/sheet" params={{ characterId: character.id }}>
                    Open
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(character.id, character.name)}
                >
                  Delete
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}