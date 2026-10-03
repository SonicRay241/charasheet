import { parse, stringify } from "yaml";
import { createCharacter } from "./characters";
import { createWeapon } from "./weapons";
import { createEquipmentItem } from "./equipment";
import { createSpell } from "./spells";
import { EQUIP_SLOTS } from "./equipped";
import { ABILITY_ORDER, SKILLS } from "./derived";
import type { Ability, AbilityScore, Character, DeathSaves, EquipSlot, Item, Spell, Weapon } from "./db";
import type {
  ConsumableDetails,
  WeaponConsumableDetails,
  WeaponDetails,
  WeaponSlot,
  WearableDetails,
  WearableSlot,
} from "./item-types";

const ABILITIES: readonly Ability[] = ABILITY_ORDER;
const SKILL_KEYS: readonly string[] = SKILLS.map((skill) => skill.key);

/** Top-level fields that participate in per-field LWW merge. */
const MERGEABLE_FIELD_KEYS: readonly string[] = [
  "name",
  "className",
  "level",
  "race",
  "alignment",
  "inspiration",
  "proficiencyBonus",
  "saveOverridesEnabled",
  "savingThrowOverrides",
  "skillOverridesEnabled",
  "skillOverrides",
  "armorClass",
  "initiativeOverride",
  "speed",
  "hitPointMaximum",
  "currentHitPoints",
  "temporaryHitPoints",
  "hitDiceTotal",
  "deathSaves",
  "skillProficiencies",
  "skillHalfProficiencies",
  "weapons",
  "equipment",
  "spells",
  "equipped",
  "personalityTraits",
  "ideals",
  "bonds",
  "flaws",
  "alliesAndOrganizations",
  "backstory",
  "treasures",
];

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

const WEAPON_SLOTS: readonly WeaponSlot[] = [
  "mainHand",
  "offHand",
  "twoHanded",
];

const WEARABLE_SLOTS: readonly WearableSlot[] = [
  "head",
  "chest",
  "hands",
  "legs",
  "feet",
  "ring",
  "amulet",
];

function isWeaponSlot(value: unknown): value is WeaponSlot {
  return WEAPON_SLOTS.some((candidate) => candidate === value);
}

function isWearableSlot(value: unknown): value is WearableSlot {
  return WEARABLE_SLOTS.some((candidate) => candidate === value);
}

/** Branch defaults for payloads pieced together from partial/legacy input. */
const DEFAULT_WEAPON_DETAILS: WeaponDetails = {
  slot: "mainHand",
  type: "melee",
  attackBonus: "",
  damage: "",
};

const DEFAULT_WEARABLE_DETAILS: WearableDetails = {
  slot: "head",
  attackBonus: "",
  flavor: "armor",
};

const DEFAULT_WEAPON_CONSUMABLE_DETAILS: WeaponConsumableDetails = {
  attackBonus: "",
  damage: "",
};

function toWeaponDetails(data: unknown, fallback: WeaponDetails): WeaponDetails {
  if (!isRecord(data)) return { ...fallback };
  const slot = WEAPON_SLOTS.find((candidate) => candidate === data.slot);
  return {
    slot: slot ?? fallback.slot,
    type: data.type === "ranged" ? "ranged" : "melee",
    attackBonus: toStr(data.attackBonus, fallback.attackBonus),
    damage: toStr(data.damage, fallback.damage),
  };
}

function toWearableDetails(data: unknown, fallback: WearableDetails): WearableDetails {
  if (!isRecord(data)) return { ...fallback };
  const slot = WEARABLE_SLOTS.find((candidate) => candidate === data.slot);
  return {
    slot: slot ?? fallback.slot,
    attackBonus: toStr(data.attackBonus, fallback.attackBonus),
    // payloads from before the armor/clothing split read as armor unless
    // they say otherwise
    flavor: data.flavor === "clothing" ? "clothing" : "armor",
  };
}

function toConsumableDetails(data: unknown, fallback: ConsumableDetails): ConsumableDetails {
  if (!isRecord(data)) return { ...fallback };
  return {
    effect: toStr(data.effect, fallback.effect),
    // payloads from before the food/potion split (and hand-authored YAML)
    // read as food unless they say otherwise
    flavor: data.flavor === "potion" ? "potion" : "food",
  };
}

function toWeaponConsumableDetails(
  data: unknown,
  fallback: WeaponConsumableDetails,
): WeaponConsumableDetails {
  if (!isRecord(data)) return { ...fallback };
  return {
    attackBonus: toStr(data.attackBonus, fallback.attackBonus),
    damage: toStr(data.damage, fallback.damage),
  };
}

/** True when `data` carries item detail fields directly (legacy flat shape). */
function hasLegacyItemFields(data: Record<string, unknown>): boolean {
  return "attackBonus" in data || "damage" in data || "slot" in data || "type" in data;
}

function toDetails(data: unknown, fallback: Item["details"]): Item["details"] {
  if (isRecord(data) && isRecord(data.details)) {
    const raw = data.details;
    // Discriminate by markers rather than requiring an explicit kind tag so
    // hand-edited YAML without one still lands on a sensible detail type.
    // Branch defaults (not the list fallback) fill missing keys: the fallback
    // is the list's default payload and may not match the chosen branch.
    if (raw.type === "melee" || raw.type === "ranged") {
      return toWeaponDetails(raw, DEFAULT_WEAPON_DETAILS);
    }
    if (isWeaponSlot(raw.slot)) return toWeaponDetails(raw, DEFAULT_WEAPON_DETAILS);
    if (isWearableSlot(raw.slot)) return toWearableDetails(raw, DEFAULT_WEARABLE_DETAILS);
    if ("slot" in raw) return toWearableDetails(raw, fallback as WearableDetails);
    if ("effect" in raw) return toConsumableDetails(raw, fallback as ConsumableDetails);
    if ("damage" in raw || "attackBonus" in raw) {
      return toWeaponConsumableDetails(raw, DEFAULT_WEAPON_CONSUMABLE_DETAILS);
    }
    return { ...fallback };
  }
  return { ...fallback };
}

function toItem(data: unknown, fallback: Item): Item {
  if (!isRecord(data)) return { ...fallback };
  const details = toDetails(data, fallback.details);
  return {
    id: typeof data.id === "string" && data.id !== "" ? data.id : fallback.id,
    name: toStr(data.name, fallback.name),
    amount: toNumber(data.amount, fallback.amount),
    description: toStr(data.description, fallback.description),
    weight: toNumber(data.weight, fallback.weight),
    details,
  };
}

/** Weapons may still arrive in the legacy flat shape (`attackBonus` at the
 * top level) from older exports; normalize them into the details payload. */
function toWeaponList(data: unknown): Weapon[] {
  if (!Array.isArray(data)) return [];
  return data.map((entry) => {
    const item = toItem(entry, createWeapon());
    if (isRecord(entry) && hasLegacyItemFields(entry)) {
      return { ...item, details: toWeaponDetails(entry, item.details as WeaponDetails) };
    }
    return item as Weapon;
  });
}

/** Equipment may carry flat detail fields (`slot`/`effect` at the top level,
 * e.g. hand-authored wearables in YAML); normalize them like weapons. */
function toEquipmentList(data: unknown): Item[] {
  if (!Array.isArray(data)) return [];
  return data.map((entry) => {
    const item = toItem(entry, createEquipmentItem());
    if (isRecord(entry) && hasLegacyItemFields(entry)) {
      const raw = entry as Record<string, unknown>;
      const details = isWeaponSlot(raw.slot)
        ? toWeaponDetails(raw, DEFAULT_WEAPON_DETAILS)
        : toWearableDetails(raw, DEFAULT_WEARABLE_DETAILS);
      return { ...item, details };
    }
    return item;
  });
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

/** The mannequin's slots: item ids, by slot. */
function toEquipped(data: unknown): Partial<Record<EquipSlot, string>> {
  if (!isRecord(data)) return {};
  const result: Partial<Record<EquipSlot, string>> = {};
  for (const slot of EQUIP_SLOTS) {
    const value = data[slot];
    if (typeof value === "string" && value !== "") result[slot] = value;
  }
  return result;
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
    equipped: toEquipped(data.equipped),
    personalityTraits: toStr(data.personalityTraits, base.personalityTraits),
    ideals: toStr(data.ideals, base.ideals),
    bonds: toStr(data.bonds, base.bonds),
    flaws: toStr(data.flaws, base.flaws),
    alliesAndOrganizations: toStr(data.alliesAndOrganizations, base.alliesAndOrganizations),
    backstory: toStr(data.backstory, base.backstory),
    treasures: toStr(data.treasures, base.treasures),
    // Sync merge metadata: travels with payloads so per-field LWW works
    // across devices. cloudSynced/cloudSyncedAt stay device-local. Stamp
    // keys: mergeable fields + per-ability keys (`abilities.<ability>`).
    fieldTimestamps: toNumberMap(data.fieldTimestamps, [
      ...MERGEABLE_FIELD_KEYS,
      ...ABILITIES.map((ability) => `abilities.${ability}`),
    ]),
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

/**
 * Strips runtime-managed fields; import always mints a fresh id and
 * timestamps. cloudSynced is device-local opt-in state, not character data —
 * it never travels in payloads.
 */
export function serializeCharacter(character: Character): string {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    cloudSynced: _cloudSynced,
    ...rest
  } = character;
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