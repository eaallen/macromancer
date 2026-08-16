import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

const MELEE_HIT_AT = 0.48;

export function meleeHitTime(clip: AnimationGroup): number {
  return clip.getLength() * MELEE_HIT_AT;
}

export function horizontalDistance(
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  return Math.hypot(ax - bx, az - bz);
}

export type CircleBlocker = {
  x: number;
  z: number;
  radius: number;
};

export function pushOutOfCircle(
  x: number,
  z: number,
  radius: number,
  cx: number,
  cz: number,
  blockerRadius: number,
): { x: number; z: number } {
  const dx = x - cx;
  const dz = z - cz;
  const minDist = radius + blockerRadius;
  const dist = Math.hypot(dx, dz);
  if (dist >= minDist) {
    return { x, z };
  }
  if (dist < 1e-6) {
    return { x: cx + minDist, z: cz };
  }
  const scale = minDist / dist;
  return { x: cx + dx * scale, z: cz + dz * scale };
}

export function splitCircleOverlap(
  a: CircleBlocker,
  b: CircleBlocker,
): { ax: number; az: number; bx: number; bz: number } | null {
  const pushed = pushOutOfCircle(a.x, a.z, a.radius, b.x, b.z, b.radius);
  const dx = pushed.x - a.x;
  const dz = pushed.z - a.z;
  if (dx === 0 && dz === 0) {
    return null;
  }
  return {
    ax: a.x + dx * 0.5,
    az: a.z + dz * 0.5,
    bx: b.x - dx * 0.5,
    bz: b.z - dz * 0.5,
  };
}

export function isInMeleeReach(
  originX: number,
  originZ: number,
  facingY: number,
  targetX: number,
  targetZ: number,
  range: number,
): boolean {
  const dx = targetX - originX;
  const dz = targetZ - originZ;
  const dist = Math.hypot(dx, dz);
  if (dist > range || dist < 0.05) {
    return false;
  }
  const facingX = Math.sin(facingY);
  const facingZ = Math.cos(facingY);
  return (dx * facingX + dz * facingZ) / dist > 0.18;
}

export function isInFrontCone(
  originX: number,
  originZ: number,
  facingY: number,
  targetX: number,
  targetZ: number,
  range: number,
  halfAngle: number,
): boolean {
  const dx = targetX - originX;
  const dz = targetZ - originZ;
  const dist = Math.hypot(dx, dz);
  if (dist > range || dist < 0.05) {
    return false;
  }
  const facingX = Math.sin(facingY);
  const facingZ = Math.cos(facingY);
  const dot = (dx * facingX + dz * facingZ) / dist;
  return dot >= Math.cos(halfAngle);
}

export function turnToward(
  current: number,
  target: number,
  maxDelta: number,
): number {
  let diff = target - current;
  while (diff > Math.PI) {
    diff -= Math.PI * 2;
  }
  while (diff < -Math.PI) {
    diff += Math.PI * 2;
  }
  if (Math.abs(diff) <= maxDelta) {
    return target;
  }
  return current + Math.sign(diff) * maxDelta;
}
