import {
  applyLevelLayout,
  GIANT_ATTACK_COOLDOWN,
  GIANT_DAMAGE,
  GIANT_RECOVERY,
  GIANT_RUN,
  GIANT_SIGHT_RANGE,
  GIANT_SMASH_HALF_ANGLE,
  GIANT_SMASH_RANGE,
  GIANT_TURN_SPEED,
  GIANT_WINDUP,
} from "./config.ts";
import { setHeightLayout } from "./height.ts";

export type Rgb = readonly [number, number, number];

export type LevelBuilding = {
  file: string;
  x: number;
  z: number;
  yaw: number;
  height: number;
  clearance: number;
};

export type ScatterKind = {
  attempts: number;
  count: number;
  seed: number;
  scale: readonly [number, number];
  collide: boolean;
  skipArena: boolean;
};

export type LevelScatter = {
  trees: ScatterKind;
  pines: ScatterKind;
  rocks: ScatterKind;
  bushes: ScatterKind;
  grass: ScatterKind;
  ringTrees: number;
};

export type LevelVibe = {
  theme: string;
  clear: Rgb;
  ambient: Rgb;
  fog: { density: number; color: Rgb };
  sun: {
    position: readonly [number, number, number];
    intensity: number;
    diffuse: Rgb;
  };
  hemi: { intensity: number; ground: Rgb };
  sky: {
    luminance: number;
    turbidity: number;
    rayleigh: number;
    mieCoefficient: number;
    mieDirectionalG: number;
  };
  terrain: { grass: Rgb; grassDark: Rgb; dirt: Rgb };
};

export type LevelGiant = {
  hp: number;
  size: number;
  speed: number;
  damage: number;
  smashRange: number;
  smashHalfAngle: number;
  sightRange: number;
  turnSpeed: number;
  windup: number;
  recovery: number;
  attackCooldown: number;
  x: number;
  z: number;
  yaw: number;
};

export type LevelCopy = {
  eyebrow: string;
  blurb: string;
  startCta: string;
  winTitle: string;
  winBody: string;
  loseTitle: string;
  loseBody: string;
  nextLabel: string;
};

export type LevelConfig = {
  title: string;
  bossName: string;
  next: string | null;
  knights: number;
  giants: LevelGiant[];
  arena: { x: number; z: number; radius: number };
  spawn: { x: number; z: number };
  villageRing: { radius: number; halfWidth: number } | null;
  flats: { x: number; z: number; radius: number }[];
  buildings: LevelBuilding[];
  scatter: LevelScatter;
  vibe: LevelVibe;
  copy: LevelCopy;
};

/**
 * Reads the JSON level block from the current page and applies it to the engine.
 */
export function loadPageLevel(): LevelConfig {
  const el = document.querySelector("#level-config");
  if (!el?.textContent) {
    throw new Error("This page is missing a <script id=\"level-config\"> JSON block.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(el.textContent);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`Level config JSON could not be parsed: ${detail}`);
  }
  const level = parseLevel(raw);
  activateLevel(level);
  return level;
}

function activateLevel(level: LevelConfig): void {
  applyLevelLayout({
    arena: level.arena,
    spawn: level.spawn,
    villageRing: level.villageRing,
    knights: level.knights,
  });
  setHeightLayout({
    arena: level.arena,
    spawn: level.spawn,
    villageRing: level.villageRing,
    flats: level.flats,
  });
  document.title = level.title;
  document.body.dataset.theme = level.vibe.theme;
  const boss = document.querySelector(".boss-label");
  if (boss) {
    boss.textContent = level.bossName;
  }
  setText("#level-eyebrow", level.copy.eyebrow);
  setText("#level-title", level.title);
  setText("#level-blurb", level.copy.blurb);
  setText("#win-title", level.copy.winTitle);
  setText("#win-body", level.copy.winBody);
  setText("#lose-title", level.copy.loseTitle);
  setText("#lose-body", level.copy.loseBody);
  const next = document.querySelector<HTMLAnchorElement>("#next-level");
  if (next) {
    if (level.next) {
      next.href = level.next;
      next.textContent = nextButtonLabel(level.next, level.copy.nextLabel);
      next.classList.remove("hidden");
    } else {
      next.classList.add("hidden");
    }
  }
}

function setText(selector: string, value: string): void {
  const el = document.querySelector(selector);
  if (el) {
    el.textContent = value;
  }
}

function nextButtonLabel(next: string, nextLabel: string): string {
  if (next.includes("fields.html")) {
    return nextLabel;
  }
  return `Next level: ${nextLabel.replace(/^next level:\s*/i, "")}`;
}

function parseLevel(raw: unknown): LevelConfig {
  const root = asRecord(raw, "level");
  const arena = asRecord(root.arena, "arena");
  const spawn = asRecord(root.spawn, "spawn");
  const arenaPoint = {
    x: num(arena, "x", "arena"),
    z: num(arena, "z", "arena"),
    radius: num(arena, "radius", "arena"),
  };
  return {
    title: str(root, "title"),
    bossName: str(root, "bossName"),
    next: optionalStr(root, "next"),
    knights: positiveInt(root, "knights"),
    giants: parseGiants(root, arenaPoint),
    arena: arenaPoint,
    spawn: {
      x: num(spawn, "x", "spawn"),
      z: num(spawn, "z", "spawn"),
    },
    villageRing: parseVillageRing(root.villageRing),
    flats: parseFlats(root.flats),
    buildings: parseBuildings(root.buildings),
    scatter: parseScatter(root.scatter),
    vibe: parseVibe(root.vibe),
    copy: parseCopy(root.copy),
  };
}

function parseGiants(
  root: Record<string, unknown>,
  arena: { x: number; z: number },
): LevelGiant[] {
  if (root.giants != null) {
    if (!Array.isArray(root.giants) || root.giants.length === 0) {
      throw new Error("Level config giants must be a non-empty array.");
    }
    return root.giants.map((item, index) => parseGiant(item, arena, `giants[${index}]`));
  }
  return [parseGiant(root.giant, arena, "giant")];
}

function parseGiant(
  raw: unknown,
  arena: { x: number; z: number },
  path: string,
): LevelGiant {
  const giant = asRecord(raw, path);
  const smashAngleDeg =
    optionalNum(giant, "smashAngle") ?? (GIANT_SMASH_HALF_ANGLE * 180) / Math.PI;
  const turnDeg = optionalNum(giant, "turnSpeed") ?? (GIANT_TURN_SPEED * 180) / Math.PI;
  const x = optionalNum(giant, "x") ?? arena.x;
  const z = optionalNum(giant, "z") ?? arena.z;
  return {
    hp: positiveInt(giant, "hp"),
    size: optionalPositive(giant, "size") ?? 1,
    speed: optionalNum(giant, "speed") ?? GIANT_RUN,
    damage: optionalNum(giant, "damage") ?? GIANT_DAMAGE,
    smashRange: optionalNum(giant, "smashRange") ?? GIANT_SMASH_RANGE,
    smashHalfAngle: (smashAngleDeg * Math.PI) / 180,
    sightRange: optionalNum(giant, "sightRange") ?? GIANT_SIGHT_RANGE,
    turnSpeed: (turnDeg * Math.PI) / 180,
    windup: optionalNum(giant, "windup") ?? GIANT_WINDUP,
    recovery: optionalNum(giant, "recovery") ?? GIANT_RECOVERY,
    attackCooldown: optionalNum(giant, "attackCooldown") ?? GIANT_ATTACK_COOLDOWN,
    x,
    z,
    yaw: optionalNum(giant, "yaw") ?? facingYaw(x, z, arena),
  };
}

function facingYaw(x: number, z: number, arena: { x: number; z: number }): number {
  if (x === arena.x && z === arena.z) {
    return Math.PI;
  }
  return Math.atan2(arena.x - x, arena.z - z);
}

function parseCopy(raw: unknown): LevelCopy {
  const copy = asRecord(raw, "copy");
  return {
    eyebrow: str(copy, "eyebrow"),
    blurb: str(copy, "blurb"),
    startCta: str(copy, "startCta"),
    winTitle: str(copy, "winTitle"),
    winBody: str(copy, "winBody"),
    loseTitle: str(copy, "loseTitle"),
    loseBody: str(copy, "loseBody"),
    nextLabel: optionalStr(copy, "nextLabel") ?? "Next field",
  };
}

function parseVillageRing(
  raw: unknown,
): { radius: number; halfWidth: number } | null {
  if (raw == null) {
    return null;
  }
  const ring = asRecord(raw, "villageRing");
  return {
    radius: num(ring, "radius", "villageRing"),
    halfWidth: num(ring, "halfWidth", "villageRing"),
  };
}

function parseFlats(raw: unknown): { x: number; z: number; radius: number }[] {
  if (raw == null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new Error("Level config flats must be an array.");
  }
  return raw.map((item, index) => {
    const flat = asRecord(item, `flats[${index}]`);
    return {
      x: num(flat, "x", `flats[${index}]`),
      z: num(flat, "z", `flats[${index}]`),
      radius: num(flat, "radius", `flats[${index}]`),
    };
  });
}

function parseBuildings(raw: unknown): LevelBuilding[] {
  if (!Array.isArray(raw)) {
    throw new Error("Level config buildings must be an array.");
  }
  return raw.map((item, index) => {
    const building = asRecord(item, `buildings[${index}]`);
    return {
      file: str(building, "file"),
      x: num(building, "x", `buildings[${index}]`),
      z: num(building, "z", `buildings[${index}]`),
      yaw: optionalNum(building, "yaw") ?? 0,
      height: optionalNum(building, "height") ?? 8,
      clearance: optionalNum(building, "clearance") ?? 16,
    };
  });
}

function parseScatter(raw: unknown): LevelScatter {
  const scatter = asRecord(raw, "scatter");
  return {
    trees: parseScatterKind(scatter.trees, "scatter.trees", false, true),
    pines: parseScatterKind(scatter.pines, "scatter.pines", false, true),
    rocks: parseScatterKind(scatter.rocks, "scatter.rocks", true, true),
    bushes: parseScatterKind(scatter.bushes, "scatter.bushes", false, true),
    grass: parseScatterKind(scatter.grass, "scatter.grass", false, false),
    ringTrees: optionalNum(scatter, "ringTrees") ?? 0,
  };
}

function parseScatterKind(
  raw: unknown,
  path: string,
  collide: boolean,
  skipArena: boolean,
): ScatterKind {
  const spec = asRecord(raw, path);
  const scale = spec.scale;
  if (!Array.isArray(scale) || scale.length !== 2) {
    throw new Error(`Level config ${path}.scale must be [min, max].`);
  }
  const min = scale[0];
  const max = scale[1];
  if (typeof min !== "number" || typeof max !== "number") {
    throw new Error(`Level config ${path}.scale must be two numbers.`);
  }
  return {
    attempts: num(spec, "attempts", path),
    count: num(spec, "count", path),
    seed: num(spec, "seed", path),
    scale: [min, max],
    collide: optionalBool(spec, "collide") ?? collide,
    skipArena: optionalBool(spec, "skipArena") ?? skipArena,
  };
}

function parseVibe(raw: unknown): LevelVibe {
  const vibe = asRecord(raw, "vibe");
  const fog = asRecord(vibe.fog, "vibe.fog");
  const sun = asRecord(vibe.sun, "vibe.sun");
  const hemi = asRecord(vibe.hemi, "vibe.hemi");
  const sky = asRecord(vibe.sky, "vibe.sky");
  const terrain = asRecord(vibe.terrain, "vibe.terrain");
  return {
    theme: str(vibe, "theme"),
    clear: rgb(vibe.clear, "vibe.clear"),
    ambient: rgb(vibe.ambient, "vibe.ambient"),
    fog: {
      density: num(fog, "density", "vibe.fog"),
      color: rgb(fog.color, "vibe.fog.color"),
    },
    sun: {
      position: vec3(sun.position, "vibe.sun.position"),
      intensity: num(sun, "intensity", "vibe.sun"),
      diffuse: rgb(sun.diffuse, "vibe.sun.diffuse"),
    },
    hemi: {
      intensity: num(hemi, "intensity", "vibe.hemi"),
      ground: rgb(hemi.ground, "vibe.hemi.ground"),
    },
    sky: {
      luminance: num(sky, "luminance", "vibe.sky"),
      turbidity: num(sky, "turbidity", "vibe.sky"),
      rayleigh: num(sky, "rayleigh", "vibe.sky"),
      mieCoefficient: num(sky, "mieCoefficient", "vibe.sky"),
      mieDirectionalG: num(sky, "mieDirectionalG", "vibe.sky"),
    },
    terrain: {
      grass: rgb(terrain.grass, "vibe.terrain.grass"),
      grassDark: rgb(terrain.grassDark, "vibe.terrain.grassDark"),
      dirt: rgb(terrain.dirt, "vibe.terrain.dirt"),
    },
  };
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Level config ${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function str(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Level config ${key} must be a non-empty string.`);
  }
  return value;
}

function optionalStr(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key];
  if (value == null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Level config ${key} must be a string.`);
  }
  return value;
}

function num(obj: Record<string, unknown>, key: string, path: string): number {
  const value = obj[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Level config ${path}.${key} must be a number.`);
  }
  return value;
}

function optionalNum(obj: Record<string, unknown>, key: string): number | undefined {
  const value = obj[key];
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Level config ${key} must be a number.`);
  }
  return value;
}

function optionalPositive(obj: Record<string, unknown>, key: string): number | undefined {
  const value = optionalNum(obj, key);
  if (value == null) {
    return undefined;
  }
  if (value <= 0) {
    throw new Error(`Level config ${key} must be greater than 0.`);
  }
  return value;
}

function optionalBool(obj: Record<string, unknown>, key: string): boolean | undefined {
  const value = obj[key];
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`Level config ${key} must be a boolean.`);
  }
  return value;
}

function positiveInt(obj: Record<string, unknown>, key: string): number {
  const value = num(obj, key, key);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Level config ${key} must be a positive integer.`);
  }
  return value;
}

function rgb(value: unknown, path: string): Rgb {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`Level config ${path} must be [r, g, b].`);
  }
  const r = value[0];
  const g = value[1];
  const b = value[2];
  if (typeof r !== "number" || typeof g !== "number" || typeof b !== "number") {
    throw new Error(`Level config ${path} must be three numbers.`);
  }
  return [r, g, b];
}

function vec3(value: unknown, path: string): readonly [number, number, number] {
  return rgb(value, path);
}
