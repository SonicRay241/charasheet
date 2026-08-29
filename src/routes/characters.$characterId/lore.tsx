import { useLiveQuery } from "dexie-react-hooks";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db/db";
import { updateCharacter } from "@/db/characters";
import type { Character } from "@/db/db";
import { Panel } from "@/components/terminal/panel.tsx";
import { AutoResizeTextarea } from "@/components/terminal/auto-resize-textarea.tsx";

export const Route = createFileRoute("/characters/$characterId/lore")({
  component: CharacterLorePage,
});

const LORE_PANELS: readonly {
  key: keyof Pick<
    Character,
    | "personalityTraits"
    | "ideals"
    | "bonds"
    | "flaws"
    | "alliesAndOrganizations"
    | "backstory"
    | "treasures"
  >;
  label: string;
  wide?: boolean;
}[] = [
  { key: "personalityTraits", label: "Personality Traits" },
  { key: "ideals", label: "Ideals" },
  { key: "bonds", label: "Bonds" },
  { key: "flaws", label: "Flaws" },
  { key: "alliesAndOrganizations", label: "Allies & Organizations" },
  { key: "treasures", label: "Treasures" },
  { key: "backstory", label: "Character Backstory", wide: true },
];

function CharacterLorePage() {
  const { characterId } = Route.useParams();
  const character = useLiveQuery(
    () => db.characters.get(characterId),
    [characterId],
  );

  if (character === undefined) {
    return <div className="p-4 text-muted-foreground">LOADING...</div>;
  }

  const update = (changes: Partial<Character>) =>
    updateCharacter(characterId, changes);

  return (
    <div className="grid gap-3 p-3 xl:grid-cols-2">
      {LORE_PANELS.map(({ key, label, wide }) => (
        <Panel
          key={key}
          label={label}
          className={wide ? "xl:col-span-2" : undefined}
        >
          <AutoResizeTextarea
            value={character[key]}
            minRows={3}
            onCommit={(value) => update({ [key]: value })}
            placeholder={`Enter ${label.toLowerCase()}...`}
            aria-label={label}
          />
        </Panel>
      ))}
    </div>
  );
}