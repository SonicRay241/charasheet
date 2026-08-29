import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { db } from "@/db/db";
import {
  addCharacter,
  deleteCharacter,
  updateCharacter,
} from "@/db/characters";
import {
  importCharacter,
  sanitizeFilename,
  serializeCharacter,
} from "@/db/transfer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Panel } from "@/components/terminal/panel";
import { ConfirmDialog } from "@/components/terminal/confirm-dialog";
import { isDriveConnected, subscribeDriveConnection } from "@/sync/google-auth";
import { isSyncConfigured } from "@/sync/sync-engine";
import { SyncFooter } from "@/components/sync/sync-footer";

export const Route = createFileRoute("/")({
  component: CharactersPage,
});

function downloadCharacterFile(characterId: string, name: string): void {
  void db.characters.get(characterId).then((character) => {
    if (!character) return;
    const yaml = serializeCharacter(character);
    const blob = new Blob([yaml], { type: "application/yaml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sanitizeFilename(name)}.yaml`;
    anchor.click();
    URL.revokeObjectURL(url);
  });
}

function useDriveConnected(): boolean {
  const [connected, setConnected] = useState(isDriveConnected());
  useEffect(() => subscribeDriveConnection(setConnected), []);
  return connected;
}

function CharactersPage() {
  const characters = useLiveQuery(() =>
    db.characters.orderBy("name").toArray(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const driveConnected = useDriveConnected();
  const driveReady = isSyncConfigured() && driveConnected;

  async function handleAdd() {
    const character = await addCharacter("New Character");
    toast.success(`Created ${character.name}`);
  }

  async function handleImport(file: File) {
    try {
      const source = await file.text();
      const character = await importCharacter(source);
      toast.success(`Imported ${character.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteCharacter(deleteTarget.id);
    toast.success(`Deleted ${deleteTarget.name}`);
    setDeleteTarget(null);
  }

  return (
    <div className="min-h-dvh p-3 relative">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold uppercase tracking-widest text-primary">
          Characters
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Import
          </Button>
          <Button variant="outline" onClick={handleAdd}>
            New Character
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml,.toml,.txt"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImport(file);
          event.target.value = "";
        }}
      />

      {characters === undefined ? (
        <p className="text-muted-foreground">LOADING...</p>
      ) : characters.length === 0 ? (
        <p className="text-muted-foreground">
          No characters yet. Create your first one or import a file.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <Panel key={character.id} label={character.name}>
              <p className="text-sm text-muted-foreground">
                {character.className || "—"} · LVL {character.level} · HP{" "}
                {character.currentHitPoints}/{character.hitPointMaximum} · AC{" "}
                {character.armorClass}
              </p>
              {driveReady ? (
                <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={character.cloudSynced ?? false}
                    onCheckedChange={(checked) =>
                      void updateCharacter(character.id, {
                        cloudSynced: checked === true,
                      })
                    }
                    aria-label={`Sync ${character.name} to Google Drive`}
                  />
                  <span className="uppercase tracking-widest">Cloud</span>
                </label>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground/60">
                  Cloud sync unavailable — connect Google Drive in the footer.
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/characters/$characterId/sheet"
                    params={{ characterId: character.id }}
                  >
                    Open
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadCharacterFile(character.id, character.name)
                  }
                >
                  Export
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setDeleteTarget({ id: character.id, name: character.name })
                  }
                >
                  Delete
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-3 right-3">
        <SyncFooter />
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Character"
        description={`Permanently delete ${deleteTarget?.name ?? ""}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
