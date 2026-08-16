import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { Scene } from "@babylonjs/core/scene";
import {
  attachKaykitFromContainer,
  CHARACTER_HEIGHT,
  CHEER_CLIP,
  findClip,
  HIT_CLIPS,
} from "./kaykitCharacter.ts";
import {
  horizontalDistance,
  isInMeleeReach,
  meleeHitTime,
  pushOutOfCircle,
  type CircleBlocker,
} from "./combat.ts";
import { heightAt } from "./height.ts";
import type { InputState } from "./input.ts";
import {
  ARENA,
  clampToWorld,
  KNIGHT_DAMAGE,
  KNIGHT_MAX_HP,
  KNIGHT_MELEE_RANGE,
  KNIGHT_REVIVE_DELAY,
  KNIGHT_REVIVE_INVULN,
  KNIGHT_RUN,
  KNIGHT_WALK,
  SPAWN,
  SPAWN_YAW,
} from "./config.ts";
import type { Macro, MacroFrame } from "./macros.ts";

const GRAVITY = 22;
const JUMP_SPEED = 8;
const MOUSE_SENSITIVITY = 0.0024;
const CAMERA_DISTANCE = 7.2;
const CAMERA_HEIGHT = 1.45;
const CAMERA_PITCH = 0.12;
const CAPSULE_HALF = CHARACTER_HEIGHT / 2;
const STEP_HEIGHT = 0.7;
const INVULN_TIME = 0.55;
const HIDDEN_GEAR = new Set([
  "1H_Sword_Offhand",
  "Badge_Shield",
  "Rectangle_Shield",
  "Spike_Shield",
  "2H_Sword",
]);
const MELEE_ATTACKS = [
  "1H_Melee_Attack_Chop",
  "1H_Melee_Attack_Slice_Diagonal",
  "1H_Melee_Attack_Slice_Horizontal",
  "1H_Melee_Attack_Stab",
] as const;

type Locomotion = "idle" | "walk" | "run" | "jump";

function clipNameFor(locomotion: Locomotion): string {
  switch (locomotion) {
    case "idle":
      return "Idle";
    case "walk":
      return "Walking_A";
    case "run":
      return "Running_A";
    case "jump":
      return "Jump_Idle";
    default: {
      const _never: never = locomotion;
      return _never;
    }
  }
}

export class Knight {
  readonly mesh: Mesh;
  readonly camera: UniversalCamera | null;
  yaw = SPAWN_YAW;
  pitch = CAMERA_PITCH;
  health = KNIGHT_MAX_HP;
  readonly maxHealth = KNIGHT_MAX_HP;
  readonly damage = KNIGHT_DAMAGE;
  hurtFlash = 0;
  striking = false;
  meleeSwingId = 0;
  dead = false;
  private verticalVelocity = 0;
  private jumping = false;
  private invuln = 0;
  private reviveIn = 0;
  private busy = false;
  private awaitingStrike = false;
  private attackAge = 0;
  private hitAt = 0;
  private currentLocomotion: Locomotion | null = null;
  private activeAction: AnimationGroup | null = null;
  private readonly clips = new Map<Locomotion, AnimationGroup>();
  private readonly meleeClips: AnimationGroup[] = [];
  private readonly hitClips: AnimationGroup[] = [];
  private deathClip: AnimationGroup | null = null;
  private cheerClip: AnimationGroup | null = null;
  private cheering = false;
  private readonly look = new Vector3();
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly move = new Vector3();
  private readonly target = new Vector3();
  private readonly desiredCamera = new Vector3();
  private playback: { macro: Macro; t: number } | null = null;

  static create(
    scene: Scene,
    kit: AssetContainer,
    id: string,
    x: number,
    z: number,
    withCamera: boolean,
  ): Knight {
    return new Knight(scene, kit, id, x, z, withCamera);
  }

  constructor(
    scene: Scene,
    kit: AssetContainer,
    id: string,
    x: number,
    z: number,
    withCamera: boolean,
  ) {
    const bodyMat = new StandardMaterial(`${id}Mat`, scene);
    bodyMat.diffuseColor = new Color3(0.82, 0.42, 0.22);
    const mesh = MeshBuilder.CreateCapsule(
      id,
      { height: CHARACTER_HEIGHT, radius: 0.38, tessellation: 8, subdivisions: 2 },
      scene,
    );
    mesh.material = bodyMat;
    mesh.ellipsoid = new Vector3(0.42, 0.9, 0.42);
    mesh.checkCollisions = true;
    mesh.isPickable = false;
    mesh.metadata = { walkable: false };
    mesh.position.set(x, heightAt(x, z) + CAPSULE_HALF, z);
    mesh.rotation.y = this.yaw;
    this.mesh = mesh;

    if (withCamera) {
      const camera = new UniversalCamera("macroCam", new Vector3(0, 8, -10), scene);
      camera.minZ = 0.12;
      camera.maxZ = 900;
      camera.inertia = 0;
      camera.inputs.clear();
      this.camera = camera;
      this.updateCamera();
    } else {
      this.camera = null;
    }

    const groups = attachKaykitFromContainer(
      kit,
      mesh,
      HIDDEN_GEAR,
      `${id}Holder`,
    );
    this.bindClips(groups);
    this.playLocomotion("idle");
  }

  get alive(): boolean {
    return !this.dead;
  }

  get readyToRevive(): boolean {
    return this.dead && this.reviveIn <= 0;
  }

  snapshot(): MacroFrame {
    return {
      t: 0,
      x: this.mesh.position.x,
      y: this.mesh.position.y,
      z: this.mesh.position.z,
      yaw: this.mesh.rotation.y,
      moving: this.currentLocomotion === "walk" || this.currentLocomotion === "run",
      sprinting: this.currentLocomotion === "run",
    };
  }

  beginPlayback(macro: Macro): void {
    this.playback = { macro, t: 0 };
    const first = macro.frames[0];
    if (first) {
      this.mesh.position.set(first.x, first.y, first.z);
      this.mesh.rotation.y = first.yaw;
      this.yaw = first.yaw;
    }
  }

  updatePlayer(dt: number, input: InputState, blockers: readonly CircleBlocker[] = []): void {
    if (this.dead) {
      this.tickDowned(dt, input);
      return;
    }
    this.tickStatus(dt);
    const mouse = input.consumeMouse();
    this.yaw += mouse.dx * MOUSE_SENSITIVITY;
    this.pitch = Math.min(0.85, Math.max(-0.35, this.pitch + mouse.dy * MOUSE_SENSITIVITY));
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    this.move.set(0, 0, 0);
    if (input.isDown("KeyW")) {
      this.move.addInPlace(this.forward);
    }
    if (input.isDown("KeyS")) {
      this.move.subtractInPlace(this.forward);
    }
    if (input.isDown("KeyD")) {
      this.move.addInPlace(this.right);
    }
    if (input.isDown("KeyA")) {
      this.move.subtractInPlace(this.right);
    }

    const grounded = this.isGrounded();
    if (this.jumping) {
      this.verticalVelocity -= GRAVITY * dt;
      if (this.verticalVelocity <= 0 && grounded) {
        this.jumping = false;
        this.verticalVelocity = 0;
      }
    } else if (grounded) {
      if (input.isDown("Space")) {
        this.verticalVelocity = JUMP_SPEED;
        this.jumping = true;
      }
    } else {
      this.verticalVelocity -= GRAVITY * dt;
    }

    const moving = this.move.lengthSquared() > 0;
    const sprinting = input.isDown("ShiftLeft") || input.isDown("ShiftRight");
    if (moving) {
      this.mesh.rotation.y = Math.atan2(this.move.x, this.move.z);
      this.move.normalize();
      this.move.scaleInPlace((sprinting ? KNIGHT_RUN : KNIGHT_WALK) * dt);
    }
    this.move.y = this.verticalVelocity * dt;
    const startX = this.mesh.position.x;
    const startZ = this.mesh.position.z;
    const wantX = this.move.x;
    const wantZ = this.move.z;
    this.mesh.moveWithCollisions(this.move);
    this.tryStepUp(startX, startZ, wantX, wantZ);
    const clamped = clampToWorld(this.mesh.position.x, this.mesh.position.z);
    this.mesh.position.x = clamped.x;
    this.mesh.position.z = clamped.z;
    this.separateFrom(blockers);
    if (!this.jumping) {
      this.stickToGround();
    }

    if (input.justPressed("KeyJ") || input.justClicked()) {
      this.tryMelee();
    }
    this.updateStrike(dt);
    if (!this.busy) {
      this.playLocomotion(this.pickLocomotion(this.jumping, moving, sprinting));
    }
    this.updateCamera();
  }

  updatePlayback(dt: number, targets: readonly CircleBlocker[] = []): void {
    if (this.dead) {
      return;
    }
    this.tickStatus(dt);
    const tape = this.playback;
    let moving = false;
    let sprinting = false;
    if (tape) {
      tape.t += dt;
      const frame = sampleMacro(tape.macro, tape.t);
      this.mesh.position.x = frame.x;
      this.mesh.position.z = frame.z;
      this.mesh.rotation.y = frame.yaw;
      this.yaw = frame.yaw;
      moving = frame.moving;
      sprinting = frame.sprinting;
      if (tape.t >= tape.macro.duration) {
        this.playback = null;
      }
    }
    this.stickToGround();
    this.autoMelee(targets);
    this.updateStrike(dt);
    if (this.cheering && moving) {
      this.stopCheer();
    }
    if (!this.busy) {
      if (!moving) {
        this.tryCheer();
      } else {
        this.playLocomotion(this.pickLocomotion(false, moving, sprinting));
      }
    }
  }

  takeDamage(amount: number): void {
    if (this.dead || this.invuln > 0) {
      return;
    }
    this.health -= amount;
    this.invuln = INVULN_TIME;
    this.hurtFlash = 1;
    if (this.health <= 0) {
      this.die();
      return;
    }
    this.playHit();
  }

  placeAt(x: number, z: number, blockers: readonly CircleBlocker[] = []): void {
    this.restoreLiving(0);
    const clamped = clampToWorld(x, z);
    this.mesh.position.set(
      clamped.x,
      heightAt(clamped.x, clamped.z) + CAPSULE_HALF,
      clamped.z,
    );
    this.separateFrom(blockers);
    this.stickToGround();
    this.yaw = Math.atan2(ARENA.x - this.mesh.position.x, ARENA.z - this.mesh.position.z);
    this.pitch = CAMERA_PITCH;
    this.mesh.rotation.y = this.yaw;
    this.playLocomotion("idle");
    this.updateCamera();
  }

  resetToSpawn(): void {
    this.placeAt(SPAWN.x, SPAWN.z);
  }

  setVisible(visible: boolean): void {
    this.mesh.setEnabled(visible);
    this.mesh.checkCollisions = visible;
  }

  dispose(): void {
    this.mesh.dispose();
  }

  inMeleeRange(x: number, z: number, targetRadius = 0): boolean {
    return (
      !this.dead &&
      this.striking &&
      isInMeleeReach(
        this.mesh.position.x,
        this.mesh.position.z,
        this.mesh.rotation.y,
        x,
        z,
        KNIGHT_MELEE_RANGE + targetRadius,
      )
    );
  }

  private bindClips(groups: AnimationGroup[]): void {
    for (const locomotion of ["idle", "walk", "run", "jump"] as const) {
      const group = findClip(groups, clipNameFor(locomotion));
      if (group) {
        this.clips.set(locomotion, group);
      }
    }
    for (const name of MELEE_ATTACKS) {
      const group = findClip(groups, name);
      if (group) {
        group.onAnimationGroupEndObservable.add(() => {
          this.finishAction(group);
        });
        this.meleeClips.push(group);
      }
    }
    for (const name of HIT_CLIPS) {
      const group = findClip(groups, name);
      if (group) {
        group.onAnimationGroupEndObservable.add(() => {
          this.finishAction(group);
        });
        this.hitClips.push(group);
      }
    }
    const death = findClip(groups, "Death_A") ?? findClip(groups, "Death_B");
    if (death) {
      death.onAnimationGroupEndObservable.add(() => {
        death.pause();
      });
      this.deathClip = death;
    }
    const cheer = findClip(groups, CHEER_CLIP);
    if (cheer) {
      cheer.onAnimationGroupEndObservable.add(() => {
        this.finishAction(cheer);
      });
      this.cheerClip = cheer;
    }
  }

  private pickLocomotion(airborne: boolean, moving: boolean, sprinting: boolean): Locomotion {
    if (airborne) {
      return "jump";
    }
    if (!moving) {
      return "idle";
    }
    if (sprinting) {
      return "run";
    }
    return "walk";
  }

  private autoMelee(targets: readonly CircleBlocker[]): void {
    let best: CircleBlocker | null = null;
    let bestDist = Infinity;
    for (const target of targets) {
      const dist = horizontalDistance(
        this.mesh.position.x,
        this.mesh.position.z,
        target.x,
        target.z,
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = target;
      }
    }
    if (!best) {
      return;
    }
    const inRange = this.withinMeleeDistance(best);
    if (inRange || this.awaitingStrike || this.striking) {
      this.faceToward(best.x, best.z);
    }
    if (inRange) {
      this.tryMelee();
    }
  }

  private withinMeleeDistance(target: CircleBlocker): boolean {
    const dist = horizontalDistance(
      this.mesh.position.x,
      this.mesh.position.z,
      target.x,
      target.z,
    );
    return dist <= KNIGHT_MELEE_RANGE + target.radius && dist >= 0.05;
  }

  private faceToward(x: number, z: number): void {
    this.yaw = Math.atan2(x - this.mesh.position.x, z - this.mesh.position.z);
    this.mesh.rotation.y = this.yaw;
  }

  private tryMelee(): void {
    if ((this.busy && !this.cheering) || this.meleeClips.length === 0) {
      return;
    }
    const clip = this.meleeClips[Math.floor(Math.random() * this.meleeClips.length)];
    if (!clip) {
      return;
    }
    this.playAction(clip);
    this.striking = false;
    this.awaitingStrike = true;
    this.attackAge = 0;
    this.hitAt = meleeHitTime(clip);
    this.meleeSwingId += 1;
  }

  private updateStrike(dt: number): void {
    if (!this.awaitingStrike) {
      return;
    }
    this.attackAge += dt;
    if (this.attackAge >= this.hitAt) {
      this.striking = true;
      this.awaitingStrike = false;
    }
  }

  private clearStrike(): void {
    this.striking = false;
    this.awaitingStrike = false;
  }

  private tryCheer(): void {
    if (this.busy) {
      return;
    }
    const clip = this.cheerClip;
    if (!clip) {
      this.playLocomotion("idle");
      return;
    }
    this.playAction(clip);
    this.cheering = true;
  }

  private stopCheer(): void {
    if (!this.cheering) {
      return;
    }
    this.cheering = false;
    this.busy = false;
    this.activeAction?.stop();
    this.activeAction = null;
  }

  private playHit(): void {
    if (this.hitClips.length === 0) {
      return;
    }
    const clip = this.hitClips[Math.floor(Math.random() * this.hitClips.length)];
    if (!clip) {
      return;
    }
    this.clearStrike();
    this.playAction(clip);
  }

  private tickDowned(dt: number, input: InputState): void {
    const mouse = input.consumeMouse();
    this.yaw += mouse.dx * MOUSE_SENSITIVITY;
    this.pitch = Math.min(0.85, Math.max(-0.35, this.pitch + mouse.dy * MOUSE_SENSITIVITY));
    this.reviveIn -= dt;
    this.updateCamera();
  }

  reviveInPlace(blockers: readonly CircleBlocker[]): void {
    this.restoreLiving(KNIGHT_REVIVE_INVULN);
    this.separateFrom(blockers);
    this.stickToGround();
    this.playLocomotion("idle");
  }

  private restoreLiving(invuln: number): void {
    this.health = KNIGHT_MAX_HP;
    this.dead = false;
    this.invuln = invuln;
    this.hurtFlash = 0;
    this.jumping = false;
    this.verticalVelocity = 0;
    this.busy = false;
    this.cheering = false;
    this.reviveIn = 0;
    this.clearStrike();
    this.activeAction?.stop();
    this.activeAction = null;
    this.currentLocomotion = null;
    this.mesh.setEnabled(true);
    this.mesh.checkCollisions = true;
  }

  private die(): void {
    this.dead = true;
    this.health = 0;
    this.reviveIn = KNIGHT_REVIVE_DELAY;
    this.mesh.checkCollisions = false;
    this.clearStrike();
    const clip = this.deathClip;
    if (clip) {
      this.playAction(clip);
      return;
    }
    this.mesh.setEnabled(false);
  }

  private playAction(clip: AnimationGroup): void {
    const previousMove = this.currentLocomotion ? this.clips.get(this.currentLocomotion) : undefined;
    this.currentLocomotion = null;
    this.cheering = false;
    this.busy = true;
    this.activeAction?.stop();
    previousMove?.stop();
    this.activeAction = clip;
    clip.loopAnimation = false;
    clip.reset();
    clip.play(false);
  }

  private finishAction(group: AnimationGroup): void {
    if (this.dead || this.activeAction !== group) {
      return;
    }
    this.activeAction = null;
    this.busy = false;
    this.cheering = false;
    this.clearStrike();
  }

  private playLocomotion(next: Locomotion): void {
    if (this.currentLocomotion === next) {
      return;
    }
    const group = this.clips.get(next);
    if (!group) {
      return;
    }
    const previous = this.currentLocomotion ? this.clips.get(this.currentLocomotion) : undefined;
    previous?.stop();
    group.play(true);
    this.currentLocomotion = next;
  }

  private tickStatus(dt: number): void {
    if (this.invuln > 0) {
      this.invuln -= dt;
    }
    if (this.hurtFlash > 0) {
      this.hurtFlash = Math.max(0, this.hurtFlash - dt / 0.4);
    }
  }

  private separateFrom(blockers: readonly CircleBlocker[]): void {
    for (const blocker of blockers) {
      const next = pushOutOfCircle(
        this.mesh.position.x,
        this.mesh.position.z,
        this.mesh.ellipsoid.x,
        blocker.x,
        blocker.z,
        blocker.radius,
      );
      this.mesh.position.x = next.x;
      this.mesh.position.z = next.z;
    }
  }

  private tryStepUp(startX: number, startZ: number, wantX: number, wantZ: number): void {
    if (this.jumping || (wantX === 0 && wantZ === 0)) {
      return;
    }
    const gotX = this.mesh.position.x - startX;
    const gotZ = this.mesh.position.z - startZ;
    const wantSq = wantX * wantX + wantZ * wantZ;
    if (gotX * wantX + gotZ * wantZ >= 0.35 * wantSq) {
      return;
    }
    this.mesh.position.y += STEP_HEIGHT;
    this.move.set(wantX - gotX, 0, wantZ - gotZ);
    this.mesh.moveWithCollisions(this.move);
  }

  private groundY(): number {
    return heightAt(this.mesh.position.x, this.mesh.position.z);
  }

  private isGrounded(): boolean {
    if (this.jumping && this.verticalVelocity > 0) {
      return false;
    }
    return this.mesh.position.y - CAPSULE_HALF <= this.groundY() + 0.4;
  }

  private stickToGround(): void {
    this.mesh.position.y = this.groundY() + CAPSULE_HALF;
    this.verticalVelocity = 0;
  }

  updateCamera(): void {
    const camera = this.camera;
    if (!camera) {
      return;
    }
    const cosPitch = Math.cos(this.pitch);
    this.look.set(
      Math.sin(this.yaw) * cosPitch,
      -Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch,
    );
    this.target.set(
      this.mesh.position.x,
      this.mesh.position.y + CAMERA_HEIGHT,
      this.mesh.position.z,
    );
    this.look.scaleToRef(-CAMERA_DISTANCE, this.desiredCamera);
    this.desiredCamera.addInPlace(this.target);
    camera.position.copyFrom(this.desiredCamera);
    camera.setTarget(this.target);
  }
}

function sampleMacro(macro: Macro, t: number): MacroFrame {
  const frames = macro.frames;
  if (frames.length === 0) {
    return { t, x: 0, y: 1, z: 0, yaw: 0, moving: false, sprinting: false };
  }
  const first = frames[0];
  if (!first) {
    return { t, x: 0, y: 1, z: 0, yaw: 0, moving: false, sprinting: false };
  }
  if (t <= first.t) {
    return first;
  }
  const last = frames[frames.length - 1];
  if (!last || t >= last.t) {
    return last ?? first;
  }
  let i = 1;
  while (i < frames.length && (frames[i]?.t ?? 0) < t) {
    i += 1;
  }
  const b = frames[i];
  const a = frames[i - 1];
  if (!a || !b) {
    return last;
  }
  const u = (t - a.t) / Math.max(0.0001, b.t - a.t);
  return {
    t,
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    z: a.z + (b.z - a.z) * u,
    yaw: a.yaw + shortestAngle(a.yaw, b.yaw) * u,
    moving: u < 0.5 ? a.moving : b.moving,
    sprinting: u < 0.5 ? a.sprinting : b.sprinting,
  };
}

function shortestAngle(from: number, to: number): number {
  let diff = to - from;
  while (diff > Math.PI) {
    diff -= Math.PI * 2;
  }
  while (diff < -Math.PI) {
    diff += Math.PI * 2;
  }
  return diff;
}
