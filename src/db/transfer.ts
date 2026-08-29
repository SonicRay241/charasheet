import { parse, stringify } from "yaml";
import { createCharacter } from "./characters";
import { createWeapon } from "./weapons";
import { createEquipmentItem } from "./equipment";
import { createSpell } from "./spells";
import { ABILITY_ORDER, SKILLS } from "./derived";
import type { Ability, AbilityScore, Character, DeathSaves, EquipmentItem, Spell, Weapon } from "./db";

const ABILITIES: readonly Ability[] = ABILITY_ORDER;
const SKILL_KEYS: readonly string[] = SKILLS.map((skill) => skill.key);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function toNumberOrNull(value: unknown, fallback: number | null): number | null {
  if (value === null || value === undefined) return null;
  return toNumber(value, fallback as number);
}

function toBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toAbilityScore(data: unknown, fallback: AbilityScore): AbilityScore {
  if (!isRecord(data)) return { ...fallback };
  return {
    score: toNumber(data.score, fallback.score),
    proficient: toBool(data.proficient, fallback.proficient),
    halfProficient: toBool(data.halfProficient, fallback.halfProficient),
  };
}

function toDeathSaves(data: unknown, fallback: DeathSaves): DeathSaves {
  return {
    successes: toNumber(isRecord(data) ? data.successes : undefined, fallback.successes),
    failures: toNumber(isRecord(data) ? data.failures : undefined, fallback.failures),
  };
}

function toNumberMap(
  data: unknown,
  keys: readonly string[],
): Record<string, number> {
  if (!isRecord(data)) return {};
  const result: Record<string, number> = {};
  for (const key of keys) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) result[key] = value;
  }
  return result;
}

function toBoolMap(data: unknown, keys: readonly string[]): Record<string, boolean> {
  if (!isRecord(data)) return {};
  const result: Record<string, boolean> = {};
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "boolean") result[key] = value;
  }
  return result;
}

function toWeapon(data: unknown, fallback: Weapon): Weapon {
  if (!isRecord(data)) return { ...fallback };
  return {
    id: typeof data.id === "string" && data.id !== "" ? data.id : fallback.id,
    name: toStr(data.name, fallback.name),
    attackBonus: toStr(data.attackBonus, fallback.attackBonus),
    damage: toStr(data.damage, fallback.damage),
  };
}

function toEquipmentItem(data: unknown, fallback: EquipmentItem): EquipmentItem {
  if (!isRecord(data)) return { ...fallback };
  return {
    id: typeof data.id === "string" && data.id !== "" ? data.id : fallback.id,
    name: toStr(data.name, fallback.name),
    amount: toNumber(data.amount, fallback.amount),
    description: toStr(data.description, fallback.description),
  };
}

function toWeaponList(data: unknown): Weapon[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => toWeapon(item, createWeapon()));
}

function toEquipmentList(data: unknown): EquipmentItem[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => toEquipmentItem(item, createEquipmentItem()));
}

function toSpell(data: unknown, fallback: Spell): Spell {
  if (!isRecord(data)) return { ...fallback };
  return {
    id: typeof data.id === "string" && data.id !== "" ? data.id : fallback.id,
    name: toStr(data.name, fallback.name),
    level: Math.max(0, toNumber(data.level, fallback.level)),
    description: toStr(data.description, fallback.description),
  };
}

function toSpellList(data: unknown): Spell[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => toSpell(item, createSpell()));
}

/**
 * Merges parsed YAML/TOML data over a fresh `createCharacter` base so partial
 * files fill every missing field with character-creation defaults.
 */
export function parseCharacterData(data: unknown): Character {
  const base = createCharacter("New Character");
  if (data === undefined || data === null) return base;
  if (!isRecord(data)) {
    throw new Error("Invalid character file: expected a mapping of fields");
  }

  const abilities = {} as Record<Ability, AbilityScore>;
  const unknownAbilities = isRecord(data.abilities) ? data.abilities : {};
  for (const ability of ABILITIES) {
    abilities[ability] = toAbilityScore(unknownAbilities[ability], base.abilities[ability]);
  }

  return {
    ...base,
    name: toStr(data.name, base.name),
    className: toStr(data.className, base.className),
    level: toNumber(data.level, base.level),
    race: toStr(data.race, base.race),
    alignment: toStr(data.alignment, base.alignment),
    inspiration: toBool(data.inspiration, base.inspiration),
    proficiencyBonus: toNumber(data.proficiencyBonus, base.proficiencyBonus),
    abilities,
    saveOverridesEnabled: toBool(data.saveOverridesEnabled, base.saveOverridesEnabled),
    savingThrowOverrides: toNumberMap(data.savingThrowOverrides, ABILITIES),
    skillOverridesEnabled: toBool(data.skillOverridesEnabled, base.skillOverridesEnabled),
    skillOverrides: toNumberMap(data.skillOverrides, SKILL_KEYS),
    armorClass: toNumber(data.armorClass, base.armorClass),
    initiativeOverride: toNumberOrNull(data.initiativeOverride, null),
    speed: toNumber(data.speed, base.speed),
    hitPointMaximum: toNumber(data.hitPointMaximum, base.hitPointMaximum),
    currentHitPoints: toNumber(data.currentHitPoints, base.currentHitPoints),
    temporaryHitPoints: toNumber(data.temporaryHitPoints, base.temporaryHitPoints),
    hitDiceTotal: toStr(data.hitDiceTotal, base.hitDiceTotal),
    deathSaves: toDeathSaves(data.deathSaves, base.deathSaves),
    skillProficiencies: toBoolMap(data.skillProficiencies, SKILL_KEYS),
    skillHalfProficiencies: toBoolMap(data.skillHalfProficiencies, SKILL_KEYS),
    weapons: toWeaponList(data.weapons),
    equipment: toEquipmentList(data.equipment),
    spells: toSpellList(data.spells),
    personalityTraits: toStr(data.personalityTraits, base.personalityTraits),
    ideals: toStr(data.ideals, base.ideals),
    bonds: toStr(data.bonds, base.bonds),
    flaws: toStr(data.flaws, base.flaws),
    alliesAndOrganizations: toStr(data.alliesAndOrganizations, base.alliesAndOrganizations),
    backstory: toStr(data.backstory, base.backstory),
    treasures: toStr(data.treasures, base.treasures),
  };
}

export function deserializeCharacter(source: string): Character {
  let data: unknown;
  try {
    data = parse(source);
  } catch (error) {
    throw new Error(
      `Invalid YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return parseCharacterData(data);
}

/** Strips runtime-managed fields; import always mints a fresh id and timestamps. */
export function serializeCharacter(character: Character): string {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = character;
  return stringify(rest);
}

export async function importCharacter(source: string): Promise<Character> {
  const character = deserializeCharacter(source);
  const { db } = await import("./db");
  await db.characters.add(character);
  return character;
}

export function sanitizeFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "character" : slug;
}