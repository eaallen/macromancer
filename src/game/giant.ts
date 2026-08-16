import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { Scene } from "@babylonjs/core/scene";
import {
  attachKaykitFromContainer,
  CHEER_CLIP,
  findClip,
  HIT_CLIPS,
} from "./kaykitCharacter.ts";
import {
  horizontalDistance,
  isInFrontCone,
  meleeHitTime,
  splitCircleOverlap,
  turnToward,
  type CircleBlocker,
} from "./combat.ts";
import { heightAt } from "./height.ts";
import {
  clampToWorld,
  GIANT_COLLISION_RADIUS,
  GIANT_HEIGHT,
} from "./config.ts";
import type { Knight } from "./knight.ts";

const HIDDEN_GEAR = new Set(["1H_Axe", "Mug", "Barbarian_Round_Shield"]);
const CHASE_STOP_PADDING = 1.6;

export type GiantOptions = {
  id?: string;
  maxHealth: number;
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
  yaw?: number;
};

type GiantAnim = "idle" | "walk" | "run" | "attack" | "hit" | "death" | "cheer";

export class Giant {
  readonly mesh: Mesh;
  health: number;
  readonly maxHealth: number;
  combatActive = false;
  private dead = false;
  private celebrating = false;
  private busy = false;
  private attackAge = 0;
  private hitAt = 0;
  private hitLanded = false;
  private cooldown = 1.2;
  private prey: Knight | null = null;
  private currentAnim: GiantAnim | null = null;
  private readonly clips = new Map<GiantAnim, AnimationGroup>();
  private readonly hitClips: AnimationGroup[] = [];
  private lastSwingBy = new Map<string, number>();
  private readonly spawnX: number;
  private readonly spawnZ: number;
  private readonly spawnYaw: number;
  private readonly fullSize: number;
  private readonly runSpeed: number;
  private readonly smashDamage: number;
  private readonly smashRangeBase: number;
  private readonly smashHalfAngle: number;
  readonly sightRange: number;
  private readonly turnSpeed: number;
  private readonly windup: number;
  private readonly recovery: number;
  private readonly attackCooldown: number;
  private readonly displacement = new Vector3();
  private plantedX = Number.NaN;
  private plantedZ = Number.NaN;

  static create(scene: Scene, kit: AssetContainer, options: GiantOptions): Giant {
    return new Giant(scene, kit, options);
  }

  get alive(): boolean {
    return !this.dead;
  }

  get focus(): Knight | null {
    return this.prey;
  }

  setFocus(knight: Knight | null): void {
    this.prey = knight;
  }

  constructor(scene: Scene, kit: AssetContainer, options: GiantOptions) {
    this.maxHealth = options.maxHealth;
    this.health = options.maxHealth;
    this.fullSize = options.size;
    this.runSpeed = options.speed;
    this.smashDamage = options.damage;
    this.smashRangeBase = options.smashRange;
    this.smashHalfAngle = options.smashHalfAngle;
    this.sightRange = options.sightRange;
    this.turnSpeed = options.turnSpeed;
    this.windup = options.windup;
    this.recovery = options.recovery;
    this.attackCooldown = options.attackCooldown;
    const id = options.id ?? "giant";
    const yaw = options.yaw ?? Math.PI;
    const bodyMat = new StandardMaterial(`${id}Mat`, scene);
    bodyMat.diffuseColor = new Color3(0.45, 0.16, 0.14);
    const mesh = MeshBuilder.CreateCylinder(
      id,
      {
        height: GIANT_HEIGHT,
        diameter: GIANT_COLLISION_RADIUS * 2,
        tessellation: 16,
      },
      scene,
    );
    mesh.material = bodyMat;
    makeNonSolid(mesh);
    mesh.position.set(options.x, heightAt(options.x, options.z), options.z);
    mesh.rotation.y = yaw;
    this.mesh = mesh;
    this.spawnX = options.x;
    this.spawnZ = options.z;
    this.spawnYaw = yaw;
    this.applySize();

    const groups = attachKaykitFromContainer(
      kit,
      mesh,
      HIDDEN_GEAR,
      `${id}Holder`,
      GIANT_HEIGHT,
    );
    this.bindClips(groups);
    for (const child of mesh.getChildMeshes()) {
      makeNonSolid(child);
    }
    this.play("idle", true);
  }

  update(dt: number, knights: Knight[]): void {
    if (this.dead) {
      return;
    }
    this.plantOnGround();

    if (this.celebrating) {
      if (!this.busy) {
        this.startCheer();
      }
      return;
    }

    if (!this.combatActive) {
      if (!this.busy) {
        this.play("idle", true);
      }
      return;
    }

    if (this.cooldown > 0) {
      this.cooldown -= dt;
    }

    const target = this.prey;
    if (this.busy) {
      if (this.currentAnim === "attack") {
        this.attackAge += dt;
        if (this.attackAge >= this.hitAt && !this.hitLanded) {
          this.hitLanded = true;
          this.smash(knights);
        }
      }
      return;
    }

    if (!target) {
      this.play("idle", true);
      return;
    }

    const desired = Math.atan2(
      target.mesh.position.x - this.mesh.position.x,
      target.mesh.position.z - this.mesh.position.z,
    );
    this.mesh.rotation.y = turnToward(this.mesh.rotation.y, desired, this.turnSpeed * dt);

    const dist = horizontalDistance(
      this.mesh.position.x,
      this.mesh.position.z,
      target.mesh.position.x,
      target.mesh.position.z,
    );
    if (dist > this.chaseStop) {
      this.chase(target, dist, dt);
      return;
    }

    const inCone = isInFrontCone(
      this.mesh.position.x,
      this.mesh.position.z,
      this.mesh.rotation.y,
      target.mesh.position.x,
      target.mesh.position.z,
      this.smashRangeBase,
      this.smashHalfAngle,
    );
    if (inCone && this.cooldown <= 0) {
      this.startSmash();
      return;
    }
    this.play("idle", true);
  }

  blockingCircle(): CircleBlocker | null {
    if (this.dead) {
      return null;
    }
    return {
      x: this.mesh.position.x,
      z: this.mesh.position.z,
      radius: this.collisionRadius,
    };
  }

  setPlanarPosition(x: number, z: number): void {
    const clamped = clampToWorld(x, z);
    this.mesh.position.x = clamped.x;
    this.mesh.position.z = clamped.z;
    this.plantOnGround();
  }

  tryReceiveHits(knights: Knight[]): void {
    if (this.dead || this.celebrating) {
      return;
    }
    for (const knight of knights) {
      if (!knight.alive || !knight.striking) {
        continue;
      }
      const last = this.lastSwingBy.get(knight.mesh.name) ?? -1;
      if (last === knight.meleeSwingId) {
        continue;
      }
      if (
        !knight.inMeleeRange(
          this.mesh.position.x,
          this.mesh.position.z,
          this.collisionRadius,
        )
      ) {
        continue;
      }
      this.lastSwingBy.set(knight.mesh.name, knight.meleeSwingId);
      this.health -= knight.damage;
      if (this.health <= 0) {
        this.die();
        return;
      }
      if (!this.busy || this.currentAnim === "idle") {
        this.startHit();
      }
    }
  }

  celebrate(): void {
    if (this.dead || this.celebrating) {
      return;
    }
    this.celebrating = true;
    this.prey = null;
    this.startCheer();
  }

  stopCelebrating(): void {
    if (!this.celebrating || this.dead) {
      return;
    }
    this.celebrating = false;
    this.busy = false;
    this.play("idle", true);
  }

  reset(): void {
    this.health = this.maxHealth;
    this.dead = false;
    this.celebrating = false;
    this.busy = false;
    this.cooldown = 1;
    this.hitLanded = false;
    this.prey = null;
    this.mesh.setEnabled(true);
    this.mesh.checkCollisions = false;
    this.applySize();
    this.mesh.position.x = this.spawnX;
    this.mesh.position.z = this.spawnZ;
    this.plantOnGround();
    this.mesh.rotation.y = this.spawnYaw;
    this.lastSwingBy.clear();
    this.play("idle", true);
  }

  private get halfHeight(): number {
    return (GIANT_HEIGHT * this.mesh.scaling.y) / 2;
  }

  private get collisionRadius(): number {
    return GIANT_COLLISION_RADIUS * this.mesh.scaling.x;
  }

  private get chaseStop(): number {
    return this.collisionRadius + CHASE_STOP_PADDING;
  }

  private plantOnGround(force = false): void {
    const x = this.mesh.position.x;
    const z = this.mesh.position.z;
    if (!force && x === this.plantedX && z === this.plantedZ) {
      return;
    }
    this.plantedX = x;
    this.plantedZ = z;
    this.mesh.position.y = heightAt(x, z) + this.halfHeight;
  }

  private applySize(): void {
    const scale = this.fullSize;
    this.mesh.scaling.setAll(scale);
    const radius = GIANT_COLLISION_RADIUS * scale;
    const half = (GIANT_HEIGHT * scale) / 2;
    this.mesh.ellipsoid = new Vector3(radius, Math.max(0.15, half - 0.25 * scale), radius);
    this.mesh.ellipsoidOffset = new Vector3(0, 0.2 * scale, 0);
    this.plantOnGround(true);
  }

  distanceTo(knight: Knight): number {
    return horizontalDistance(
      this.mesh.position.x,
      this.mesh.position.z,
      knight.mesh.position.x,
      knight.mesh.position.z,
    );
  }

  private chase(target: Knight, dist: number, dt: number): void {
    const step = Math.min(this.runSpeed * dt, dist - this.chaseStop);
    const inv = 1 / dist;
    this.displacement.set(
      (target.mesh.position.x - this.mesh.position.x) * inv * step,
      0,
      (target.mesh.position.z - this.mesh.position.z) * inv * step,
    );
    this.mesh.moveWithCollisions(this.displacement);
    const clamped = clampToWorld(this.mesh.position.x, this.mesh.position.z);
    this.mesh.position.x = clamped.x;
    this.mesh.position.z = clamped.z;
    this.play("run", true);
  }

  private startCheer(): void {
    const clip = this.clips.get("cheer");
    if (!clip) {
      this.play("idle", true);
      return;
    }
    this.busy = true;
    this.playAction(clip, "cheer");
  }

  private startSmash(): void {
    const clip = this.clips.get("attack");
    if (!clip) {
      return;
    }
    this.attackAge = 0;
    this.hitAt = Math.max(this.windup, meleeHitTime(clip));
    this.hitLanded = false;
    this.cooldown = this.attackCooldown;
    this.busy = true;
    clip.speedRatio = 0.62;
    this.playAction(clip, "attack");
  }

  private smash(knights: Knight[]): void {
    for (const knight of knights) {
      if (!knight.alive) {
        continue;
      }
      if (
        isInFrontCone(
          this.mesh.position.x,
          this.mesh.position.z,
          this.mesh.rotation.y,
          knight.mesh.position.x,
          knight.mesh.position.z,
          this.smashRangeBase,
          this.smashHalfAngle,
        )
      ) {
        knight.takeDamage(this.smashDamage);
      }
    }
  }

  private startHit(): void {
    if (this.hitClips.length === 0) {
      return;
    }
    const clip = this.hitClips[Math.floor(Math.random() * this.hitClips.length)];
    this.busy = true;
    this.playAction(clip, "hit");
  }

  private die(): void {
    this.dead = true;
    this.health = 0;
    this.busy = true;
    this.mesh.checkCollisions = false;
    const clip = this.clips.get("death");
    if (clip) {
      clip.speedRatio = 0.7;
      this.playAction(clip, "death");
      return;
    }
    this.mesh.setEnabled(false);
  }

  private bindClips(groups: AnimationGroup[]): void {
    const idle = findClip(groups, "Idle");
    const walk = findClip(groups, "Walking_A");
    const run = findClip(groups, "Running_A");
    const attack = findClip(groups, "2H_Melee_Attack_Chop");
    const death = findClip(groups, "Death_A");
    if (idle) {
      this.clips.set("idle", idle);
    }
    if (walk) {
      this.clips.set("walk", walk);
    }
    if (run) {
      this.clips.set("run", run);
    } else if (walk) {
      this.clips.set("run", walk);
    }
    if (attack) {
      attack.onAnimationGroupEndObservable.add(() => {
        this.finishAction(attack, "attack");
        this.cooldown = Math.max(this.cooldown, this.recovery);
      });
      this.clips.set("attack", attack);
    }
    for (const name of HIT_CLIPS) {
      const hit = findClip(groups, name);
      if (hit) {
        hit.onAnimationGroupEndObservable.add(() => {
          this.finishAction(hit, "hit");
        });
        this.hitClips.push(hit);
      }
    }
    if (death) {
      death.onAnimationGroupEndObservable.add(() => {
        death.pause();
      });
      this.clips.set("death", death);
    }
    const cheer = findClip(groups, CHEER_CLIP);
    if (cheer) {
      cheer.onAnimationGroupEndObservable.add(() => {
        this.finishAction(cheer, "cheer");
      });
      this.clips.set("cheer", cheer);
    }
  }

  private finishAction(group: AnimationGroup, anim: GiantAnim): void {
    if (this.currentAnim !== anim) {
      return;
    }
    const playing = this.clips.get(anim);
    if (playing !== group) {
      return;
    }
    this.busy = false;
    this.currentAnim = null;
  }

  private playAction(clip: AnimationGroup, anim: GiantAnim): void {
    const previous = this.currentAnim ? this.clips.get(this.currentAnim) : undefined;
    previous?.stop();
    this.currentAnim = anim;
    this.clips.set(anim, clip);
    clip.loopAnimation = false;
    clip.reset();
    clip.play(false);
  }

  private play(anim: GiantAnim, loop: boolean): void {
    if (this.currentAnim === anim) {
      return;
    }
    const clip = this.clips.get(anim);
    if (!clip) {
      return;
    }
    const previous = this.currentAnim ? this.clips.get(this.currentAnim) : undefined;
    previous?.stop();
    clip.loopAnimation = loop;
    clip.play(loop);
    this.currentAnim = anim;
  }
}

export function assignGiantFocus(giants: readonly Giant[], knights: readonly Knight[]): void {
  const hunters = giants.filter((giant) => giant.alive);
  const alive = knights.filter((knight) => knight.alive);
  if (alive.length <= 1) {
    const only = alive[0] ?? null;
    for (const giant of hunters) {
      giant.setFocus(only);
    }
    return;
  }

  for (const giant of hunters) {
    if (!giant.focus?.alive) {
      giant.setFocus(null);
    }
  }

  const claimed = new Map<Knight, Giant>();
  for (const giant of hunters) {
    const current = giant.focus;
    if (!current) {
      continue;
    }
    const holder = claimed.get(current);
    if (!holder) {
      claimed.set(current, giant);
      continue;
    }
    if (giant.distanceTo(current) < holder.distanceTo(current)) {
      holder.setFocus(null);
      claimed.set(current, giant);
    } else {
      giant.setFocus(null);
    }
  }

  const taken = new Set(claimed.keys());
  for (const giant of hunters) {
    const available = alive.filter((knight) => knight === giant.focus || !taken.has(knight));
    const pick = nearestAliveInSight(
      available,
      giant.mesh.position.x,
      giant.mesh.position.z,
      giant.sightRange,
    );
    const previous = giant.focus;
    if (previous && pick !== previous) {
      taken.delete(previous);
    }
    giant.setFocus(pick);
    if (pick) {
      taken.add(pick);
    }
  }
}

export function blockingCircles(giants: readonly Giant[]): CircleBlocker[] {
  const circles: CircleBlocker[] = [];
  for (const giant of giants) {
    const circle = giant.blockingCircle();
    if (circle) {
      circles.push(circle);
    }
  }
  return circles;
}

export function separateGiants(giants: readonly Giant[]): void {
  for (let i = 0; i < giants.length; i++) {
    const left = giants[i];
    if (!left) {
      continue;
    }
    for (let j = i + 1; j < giants.length; j++) {
      const right = giants[j];
      if (!right) {
        continue;
      }
      const leftCircle = left.blockingCircle();
      const rightCircle = right.blockingCircle();
      if (!leftCircle || !rightCircle) {
        continue;
      }
      const split = splitCircleOverlap(leftCircle, rightCircle);
      if (!split) {
        continue;
      }
      left.setPlanarPosition(split.ax, split.az);
      right.setPlanarPosition(split.bx, split.bz);
    }
  }
}

function nearestAliveInSight(
  knights: Knight[],
  x: number,
  z: number,
  sightRange: number,
): Knight | null {
  let best: Knight | null = null;
  let bestDist = Infinity;
  for (const knight of knights) {
    if (!knight.alive) {
      continue;
    }
    const dist = horizontalDistance(knight.mesh.position.x, knight.mesh.position.z, x, z);
    if (dist > sightRange || dist >= bestDist) {
      continue;
    }
    bestDist = dist;
    best = knight;
  }
  return best;
}

function makeNonSolid(mesh: AbstractMesh): void {
  mesh.checkCollisions = false;
  mesh.isPickable = false;
  mesh.collisionGroup = 0;
  mesh.metadata = { walkable: false };
}
