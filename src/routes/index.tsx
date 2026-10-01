import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { isSyncConfigured } from "@/sync/sync-engine";
import { useDriveConnected } from "@/hooks/use-drive-connected";
import { SyncFooter } from "@/components/sync/sync-footer";
import { NoticeBoard, BunkBay } from "@/components/barracks/barracks";
import {
  barracksAnimated,
  clickLid,
  isNewRecruit,
  openFootlocker,
  useBunkObserver,
} from "@/components/barracks/motion";

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

function CharactersPage() {
  // In the order they joined, so a new recruit takes the free bunk at the end
  // of the row instead of jumping in wherever its name sorts.
  const characters = useLiveQuery(() =>
    db.characters.toCollection().sortBy("createdAt"),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bunkObserver = useBunkObserver(characters?.length ?? 0);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const navigate = useNavigate();
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

  useEffect(() => {
    document.title = "charasheet";
  }, []);

  return (
    <div
      ref={bunkObserver}
      className="barracks min-h-dvh p-3 relative"
      data-animate={barracksAnimated() ? "on" : "off"}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="terminal-label">Charasheet</p>
          <h1 className="font-heading text-4xl leading-tight font-bold">
            The Barracks
          </h1>
        </div>
        <NoticeBoard count={characters?.length ?? 0} />
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
      ) : (
        <div className="grid gap-x-3 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <BunkBay
              key={character.id}
              seed={character.id}
              arriving={isNewRecruit(character.createdAt)}
            >
            <Panel
              label={character.name}
              className="footlocker"
              onOpen={(event) =>
                clickLid(event.currentTarget, () =>
                  void navigate({
                    to: "/characters/$characterId/sheet",
                    params: { characterId: character.id },
                  }),
                )
              }
            >
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
                        cloudSyncedAt:
                          checked === true ? Date.now() : undefined,
                      })
                    }
                    aria-label={`Sync ${character.name} to Google Drive`}
                  />
                  <span className="uppercase tracking-widest">Cloud</span>
                </label>
              ) : isSyncConfigured() ? (
                <p className="mt-3 text-xs text-muted-foreground/60">
                  Cloud sync unavailable — connect Google Drive in the footer.
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button variant="gold" size="sm" asChild>
                  <Link
                    to="/characters/$characterId/sheet"
                    params={{ characterId: character.id }}
                    onClick={(event) =>
                      openFootlocker(event, () =>
                        void navigate({
                          to: "/characters/$characterId/sheet",
                          params: { characterId: character.id },
                        }),
                      )
                    }
                  >
                    Open
                  </Link>
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() =>
                    downloadCharacterFile(character.id, character.name)
                  }
                >
                  Export
                </Button>
                <Button
                  variant="gold"
                  className="text-red-700"
                  size="sm"
                  onClick={() =>
                    setDeleteTarget({ id: character.id, name: character.name })
                  }
                >
                  Delete
                </Button>
              </div>
            </Panel>
            </BunkBay>
          ))}
          <BunkBay seed="empty" empty vacant={
            <div className="flex flex-col items-center gap-2.5 px-3.5 pt-4 pb-4.5 mx-[8%] border-2 border-dashed border-foreground/35 rounded-md text-center italic text-muted-foreground bg-background/55"
              // style={{ marginTop: '-2.588rem', zIndex: 1 }}
            >
              <p>
                {characters.length === 0
                  ? "No characters yet. Every bunk is free: create your first one or import a file."
                  : "A free bunk."}
              </p>
              <Button variant="outline" onClick={handleAdd}>
                Assign a new recruit
              </Button>
            </div>
          } />
          {/* more free bunks to finish the row (three to a row on wide screens) */}
          {Array.from({ length: (3 - ((characters.length + 1) % 3)) % 3 }, (_, i) => (
            <BunkBay key={i} seed={`spare-${i}`} empty spare aria-hidden="true" />
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-3 right-3">
        <SyncFooter />
        <p className="pb-3 text-center text-[10px] uppercase tracking-widest text-muted-foreground/60">
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          {" · "}
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </p>
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
