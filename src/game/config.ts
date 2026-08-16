export type GameMode = "macro" | "mancer";

export const WORLD_SIZE = 260;
export const WORLD_WALK_LIMIT = WORLD_SIZE / 2 - 4;

export const ARENA = { x: 0, z: 4 };
export let ARENA_RADIUS = 34;
export const SPAWN = { x: 0, z: -28 };
export let VILLAGE_RING_RADIUS = ARENA_RADIUS + 28;
export let VILLAGE_RING_HALF_WIDTH = 26;
export let SPAWN_YAW = Math.atan2(ARENA.x - SPAWN.x, ARENA.z - SPAWN.z);

export let MANCER_KNIGHT_LIMIT = 10;

export const KNIGHT_MAX_HP = 20;
export const KNIGHT_DAMAGE = 12;
export const KNIGHT_WALK = 6.2;
export const KNIGHT_RUN = 9.8;
export const KNIGHT_MELEE_RANGE = 2.5;
export const KNIGHT_REVIVE_DELAY = 2.6;
export const KNIGHT_REVIVE_INVULN = 1.6;

export const GIANT_MAX_HP = 320;
export const GIANT_DAMAGE = 50;
export const GIANT_HEIGHT = 7.4;
export const GIANT_COLLISION_RADIUS = 2.2;
export const GIANT_SMASH_RANGE = 8.6;
export const GIANT_SMASH_HALF_ANGLE = (55 * Math.PI) / 180;
export const GIANT_TURN_SPEED = (88 * Math.PI) / 180;
export const GIANT_RUN = 7.4;
export const GIANT_SIGHT_RANGE = 52;
export const GIANT_WINDUP = 1.15;
export const GIANT_RECOVERY = 1.35;
export const GIANT_ATTACK_COOLDOWN = 2.4;
export const GIANT_VICTORY_DELAY = 4;

export function applyLevelLayout(layout: {
  arena: { x: number; z: number; radius: number };
  spawn: { x: number; z: number };
  villageRing: { radius: number; halfWidth: number } | null;
  knights: number;
}): void {
  ARENA.x = layout.arena.x;
  ARENA.z = layout.arena.z;
  ARENA_RADIUS = layout.arena.radius;
  SPAWN.x = layout.spawn.x;
  SPAWN.z = layout.spawn.z;
  SPAWN_YAW = Math.atan2(ARENA.x - SPAWN.x, ARENA.z - SPAWN.z);
  MANCER_KNIGHT_LIMIT = layout.knights;
  VILLAGE_RING_RADIUS = layout.villageRing?.radius ?? layout.arena.radius + 28;
  VILLAGE_RING_HALF_WIDTH = layout.villageRing?.halfWidth ?? 0;
}

export function clampToWorld(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.min(WORLD_WALK_LIMIT, Math.max(-WORLD_WALK_LIMIT, x)),
    z: Math.min(WORLD_WALK_LIMIT, Math.max(-WORLD_WALK_LIMIT, z)),
  };
}

export function inArena(x: number, z: number, padding = 0): boolean {
  return Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA_RADIUS + padding;
}
