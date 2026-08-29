import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db/db";
import { updateCharacter } from "@/db/characters";
import type { Character } from "@/db/db";
import {
  ABILITY_LABELS,
  ABILITY_ORDER,
  baseSavingThrowTotal,
  baseSkillTotal,
  formatModifier,
  initiativeTotal,
  savingThrowTotal,
  skillTotal,
  SKILLS,
} from "@/db/derived";
import { Panel } from "@/components/terminal/panel.tsx";
import {
  BareInput,
  EditableNumber,
} from "@/components/terminal/bare-input.tsx";
import { ConfirmDialog } from "@/components/terminal/confirm-dialog.tsx";
import { WeaponsPanel } from "@/components/gear/weapons-panel.tsx";
import { EquipmentPanel } from "@/components/gear/equipment-panel.tsx";
import { SpellsPanel } from "@/components/gear/spells-panel.tsx";
import { Checkbox } from "@/components/ui/checkbox";
import { PortalTarget } from "@/components/terminal/portal-target.tsx";
import { useIsLg } from "@/hooks/use-is-lg.ts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/characters/$characterId/sheet")({
  component: CharacterSheetPage,
});

function CharacterSheetPage() {
  const { characterId } = Route.useParams();
  const character = useLiveQuery(
    () => db.characters.get(characterId),
    [characterId],
  );
  const [overridePrompt, setOverridePrompt] = useState<{
    kind: "save" | "skill";
    enabling: boolean;
    apply: () => void;
  } | null>(null);
  const [proficiencySlot, setProficiencySlot] = useState<HTMLDivElement | null>(
    null,
  );
  const {
    isLg,
    measured: layoutMeasured,
  } = useIsLg();

  if (character === undefined) {
    return <div className="p-4 text-muted-foreground">LOADING...</div>;
  }

  const update = (changes: Partial<Character>) =>
    updateCharacter(characterId, changes);

  function confirmOverrideToggle(
    kind: "save" | "skill",
    enabling: boolean,
    apply: () => void,
  ) {
    if (!enabling) {
      apply();
      return;
    }
    setOverridePrompt({ kind, enabling, apply });
  }

  return (
    <div className="flex flex-wrap gap-3 p-3">
      <div className="w-full lg:w-[calc(50%-0.4rem)] space-y-3">
        {/* Character + Statistics stack: left on lg, full width on mobile */}
        <Panel
          label="Character"
          contentClassName="grid gap-4"
          className="lg:col-start-1 lg:row-start-1"
        >
          <Field label="Character Name">
            <BareInput
              value={character.name}
              onCommit={(name) => update({ name })}
              className="text-lg"
            />
          </Field>
          <Field label="Class">
            <BareInput
              value={character.className}
              onCommit={(className) => update({ className })}
            />
          </Field>
          <Field label="Race">
            <BareInput
              value={character.race}
              onCommit={(race) => update({ race })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Level">
              <EditableNumber
                value={character.level}
                onCommit={(level) => level !== null && update({ level })}
              />
            </Field>
            <Field label="Alignment">
              <BareInput
                value={character.alignment}
                onCommit={(alignment) => update({ alignment })}
              />
            </Field>
          </div>
        </Panel>

        <Panel
          label="Statistics"
          banner="Proficiency bonus included"
          className="lg:col-start-1 lg:row-start-2"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ABILITY_ORDER.map((ability) => {
              const { score } = character.abilities[ability];
              const modifier = Math.floor((score - 10) / 2);
              return (
                <div
                  key={ability}
                  className="terminal-panel flex min-h-16 flex-col justify-between p-2"
                >
                  <div className="flex justify-between w-full">
                    <span className="terminal-label mb-0">
                      {ABILITY_LABELS[ability]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {!(modifier < 0) && "+"}
                      {modifier}
                    </span>
                  </div>
                  <EditableNumber
                    className="text-3xl leading-none font-medium"
                    value={score}
                    onCommit={(value) =>
                      value !== null &&
                      update({
                        abilities: {
                          ...character.abilities,
                          [ability]: {
                            ...character.abilities[ability],
                            score: value,
                          },
                        },
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <StatEditBox
              label="Proficiency Bonus"
              value={character.proficiencyBonus}
              onCommit={(value) =>
                value !== null && update({ proficiencyBonus: value })
              }
            />
            <div className="terminal-panel flex min-h-16 flex-col justify-between p-2">
              <span className="terminal-label">Inspiration</span>
              <Checkbox
                checked={character.inspiration}
                onCheckedChange={(checked) =>
                  update({ inspiration: checked === true })
                }
                aria-label="Inspiration"
              />
            </div>
            <StatEditBox
              label="Maximum Hit Points"
              value={character.hitPointMaximum}
              onCommit={(value) =>
                value !== null && update({ hitPointMaximum: value })
              }
            />
            <StatEditBox
              label="Temporary Hit Points"
              value={character.temporaryHitPoints}
              onCommit={(value) => update({ temporaryHitPoints: value ?? 0 })}
            />
          </div>
        </Panel>

        {/* Proficiency panels portal here when the viewport is lg or wider */}
        <div ref={setProficiencySlot} />
      </div>

      {/* Combat + Gear: right on lg, and above Saving Throws on mobile order */}
      <div className="w-full lg:w-[calc(50%-0.4rem)] space-y-3">
        <Panel label="Combat" className="mb-3">
          <div className="grid grid-cols-3 gap-2">
            <StatEditBox
              label="Armor Class"
              value={character.armorClass}
              onCommit={(value) =>
                value !== null && update({ armorClass: value })
              }
            />
            <div className="terminal-panel flex min-h-20 flex-col justify-between p-2">
              <div className="flex w-full items-center justify-between">
                <span className="terminal-label">Initiative</span>
                <Checkbox
                  checked={character.initiativeOverride !== null}
                  onCheckedChange={(checked) =>
                    update({
                      initiativeOverride:
                        checked === true ? initiativeTotal(character) : null,
                    })
                  }
                  aria-label="Override initiative (homebrew)"
                  title="Override (homebrew)"
                />
              </div>
              {character.initiativeOverride !== null ? (
                <EditableNumber
                  className="text-3xl leading-none font-medium"
                  value={initiativeTotal(character)}
                  signed
                  aria-label="Initiative override value"
                  onCommit={(value) =>
                    value !== null && update({ initiativeOverride: value })
                  }
                />
              ) : (
                <span className="text-3xl leading-none font-medium pb-1">
                  {formatModifier(initiativeTotal(character))}
                </span>
              )}
            </div>
            <StatEditBox
              label="Speed"
              value={character.speed}
              onCommit={(value) => value !== null && update({ speed: value })}
            />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <StatEditBox
              label="Current Hit Points"
              value={character.currentHitPoints}
              onCommit={(value) =>
                value !== null && update({ currentHitPoints: value })
              }
            />
            <div className="terminal-panel flex min-h-16 flex-col justify-between p-2">
              <span className="terminal-label">Hit Dice</span>
              <BareInput
                value={character.hitDiceTotal}
                onCommit={(hitDiceTotal) => update({ hitDiceTotal })}
                className="text-3xl leading-none font-medium"
              />
            </div>
          </div>
        </Panel>

        <WeaponsPanel characterId={characterId} />

        <EquipmentPanel characterId={characterId} />

        <SpellsPanel characterId={characterId} />
      </div>

      <div className="w-full lg:w-[calc(50%-0.4rem)] space-y-3">
        <PortalTarget
          enabled={isLg}
          target={proficiencySlot}
          measured={layoutMeasured}
        >
          <Panel label="Saving Throws" className="mb-3">
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="save-overrides"
              checked={character.saveOverridesEnabled}
              onCheckedChange={(checked) =>
                confirmOverrideToggle("save", checked === true, () =>
                  update({ saveOverridesEnabled: checked === true }),
                )
              }
            />
            <label
              htmlFor="save-overrides"
              className="terminal-label cursor-pointer"
            >
              Override (homebrew)
            </label>
          </div>
          <div className="grid gap-1">
            {ABILITY_ORDER.map((ability) => {
              const { proficient, halfProficient } =
                character.abilities[ability];
              const total = savingThrowTotal(character, ability);
              const overridden =
                character.saveOverridesEnabled &&
                (character.savingThrowOverrides?.[ability] ?? undefined) !==
                  undefined;
              const setAbility = (
                changes: Partial<{
                  proficient: boolean;
                  halfProficient: boolean;
                }>,
              ) =>
                update({
                  abilities: {
                    ...character.abilities,
                    [ability]: { ...character.abilities[ability], ...changes },
                  },
                });
              return (
                <label key={ability} className="flex items-center gap-3">
                  <Checkbox
                    checked={proficient}
                    disabled={character.saveOverridesEnabled}
                    onCheckedChange={(checked) =>
                      setAbility({ proficient: checked === true })
                    }
                    aria-label={`${ABILITY_LABELS[ability]} saving throw proficiency (+${character.proficiencyBonus})`}
                  />
                  <Checkbox
                    checked={halfProficient}
                    disabled={character.saveOverridesEnabled}
                    onCheckedChange={(checked) =>
                      setAbility({ halfProficient: checked === true })
                    }
                    aria-label={`${ABILITY_LABELS[ability]} saving throw half proficiency (+${Math.floor(character.proficiencyBonus / 2)})`}
                  />
                  {character.saveOverridesEnabled ? (
                    <EditableNumber
                      className="w-10 text-center text-sm font-semibold"
                      value={savingThrowTotal(character, ability)}
                      aria-label={`${ABILITY_LABELS[ability]} saving throw override`}
                      allowEmpty
                      signed
                      onCommit={(total) => {
                        const overrides = { ...character.savingThrowOverrides };
                        const base = baseSavingThrowTotal(character, ability);
                        if (total === null || total === base) {
                          delete overrides[ability];
                        } else {
                          overrides[ability] = total - base;
                        }
                        update({ savingThrowOverrides: overrides });
                      }}
                    />
                  ) : (
                    <span className="w-10 text-center text-sm font-semibold">
                      {formatModifier(total)}
                    </span>
                  )}
                  <span className={cn(overridden && "text-muted-foreground")}>
                    {ABILITY_LABELS[ability]}
                  </span>
                </label>
              );
            })}
          </div>
        </Panel>
        <Panel label="Skills">
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="skill-overrides"
              checked={character.skillOverridesEnabled}
              onCheckedChange={(checked) =>
                confirmOverrideToggle("skill", checked === true, () =>
                  update({ skillOverridesEnabled: checked === true }),
                )
              }
            />
            <label
              htmlFor="skill-overrides"
              className="terminal-label cursor-pointer"
            >
              Override (homebrew)
            </label>
          </div>
          <div className="grid gap-1">
            {SKILLS.map((skill) => {
              const proficient =
                character.skillProficiencies[skill.key] ?? false;
              const halfProficient =
                character.skillHalfProficiencies[skill.key] ?? false;
              const total = skillTotal(character, skill);
              const overridden =
                character.skillOverridesEnabled &&
                (character.skillOverrides?.[skill.key] ?? undefined) !==
                  undefined;
              return (
                <label key={skill.key} className="flex items-center gap-3">
                  <Checkbox
                    checked={proficient}
                    disabled={character.skillOverridesEnabled}
                    onCheckedChange={(checked) =>
                      update({
                        skillProficiencies: {
                          ...character.skillProficiencies,
                          [skill.key]: checked === true,
                        },
                      })
                    }
                    aria-label={`${skill.label} proficiency (+${character.proficiencyBonus})`}
                  />
                  <Checkbox
                    checked={halfProficient}
                    disabled={character.skillOverridesEnabled}
                    onCheckedChange={(checked) =>
                      update({
                        skillHalfProficiencies: {
                          ...character.skillHalfProficiencies,
                          [skill.key]: checked === true,
                        },
                      })
                    }
                    aria-label={`${skill.label} half proficiency (+${Math.floor(character.proficiencyBonus / 2)})`}
                  />
                  {character.skillOverridesEnabled ? (
                    <EditableNumber
                      className="w-10 text-center text-sm font-semibold"
                      value={skillTotal(character, skill)}
                      aria-label={`${skill.label} override`}
                      allowEmpty
                      signed
                      onCommit={(total) => {
                        const overrides = { ...character.skillOverrides };
                        const base = baseSkillTotal(character, skill);
                        if (total === null || total === base) {
                          delete overrides[skill.key];
                        } else {
                          overrides[skill.key] = total - base;
                        }
                        update({ skillOverrides: overrides });
                      }}
                    />
                  ) : (
                    <span className="w-10 text-center text-sm font-semibold">
                      {formatModifier(total)}
                    </span>
                  )}
                  <span>
                    <span className={cn(overridden && "text-muted-foreground")}>
                      {skill.label}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      ({skill.ability.slice(0, 3)})
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </Panel>
        </PortalTarget>
      </div>

      <ConfirmDialog
        open={overridePrompt !== null}
        onOpenChange={(open) => !open && setOverridePrompt(null)}
        title="Enable Override"
        description={
          overridePrompt?.kind === "save"
            ? "Enabling override will clear all selected saving throw proficiencies so values can be set manually. Continue?"
            : "Enabling override will clear all selected skill proficiencies so values can be set manually. Continue?"
        }
        confirmLabel="Clear & Enable"
        destructive
        onConfirm={() => {
          if (!overridePrompt) return;
          if (overridePrompt.kind === "save") {
            update({ saveOverridesEnabled: true, savingThrowOverrides: {} });
          } else {
            update({ skillOverridesEnabled: true, skillOverrides: {} });
          }
          setOverridePrompt(null);
        }}
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5">
      <span className="terminal-label">{label}</span>
      {children}
    </div>
  );
}

function StatEditBox({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (value: number | null) => void;
}) {
  return (
    <div className="terminal-panel flex min-h-16 flex-col justify-between p-2">
      <span className="terminal-label">{label}</span>
      <EditableNumber
        className="text-3xl leading-none font-medium"
        value={value}
        onCommit={onCommit}
      />
    </div>
  );
}
