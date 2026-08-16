import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { ArcRotateCameraPointersInput } from "@babylonjs/core/Cameras/Inputs/arcRotateCameraPointersInput";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import type { Scene } from "@babylonjs/core/scene";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { loadKaykitContainer } from "./kaykitCharacter.ts";
import { Knight } from "./knight.ts";
import { Giant, assignGiantFocus, blockingCircles, separateGiants } from "./giant.ts";
import { MacroRecorder, type Macro } from "./macros.ts";
import { createHud, type Hud } from "./hud.ts";
import type { InputState } from "./input.ts";
import { isTouchPlay, type TouchControls } from "./touchControls.ts";
import { ARENA, GIANT_VICTORY_DELAY, clampToWorld, type GameMode } from "./config.ts";
import { heightAt } from "./height.ts";
import { fightScore, formatScore } from "./score.ts";
import { hideWinScoreboard, showWinScoreboard } from "./scoreboard.ts";
import type { LevelConfig } from "./level.ts";

const MANCER_CLICK_SLOP = 8;
const MANCER_CAM_FOLLOW = 4.2;
const MANCER_CAM_PAN = 48;
const MANCER_LOOK_HEIGHT = 2;

export class Game {
  mode: GameMode = "mancer";
  private readonly scene: Scene;
  private readonly canvas: HTMLCanvasElement;
  private readonly input: InputState;
  private readonly touch: TouchControls | null;
  private readonly hud: Hud;
  private player!: Knight;
  private giants: Giant[] = [];
  private readonly recorder = new MacroRecorder();
  private readonly macros: Macro[] = [];
  private selectedId: string | null = null;
  private readonly minions: Knight[] = [];
  private minionSerial = 0;
  private mancerCam!: ArcRotateCamera;
  private followedGiant: Giant | null = null;
  private mancerFollowing = true;
  private spawnMarker!: Mesh;
  private mancerPointerDown: { x: number; y: number } | null = null;
  private pathPreview: LinesMesh | null = null;
  private won = false;
  private lost = false;
  private pendingGiantWin = false;
  private loseDelay = 0;
  private started = false;
  private knightKit!: AssetContainer;
  private fightTime = 0;
  private knightDeaths = 0;
  private readonly countedDead = new Set<Knight>();
  private readonly activatedMacros = new Set<string>();
  private readonly level: LevelConfig;
  private spawnMarkerAge = 0;

  static async create(
    scene: Scene,
    canvas: HTMLCanvasElement,
    input: InputState,
    level: LevelConfig,
    touch: TouchControls | null = null,
  ): Promise<Game> {
    const game = new Game(scene, canvas, input, level, touch);
    await game.load();
    return game;
  }

  constructor(
    scene: Scene,
    canvas: HTMLCanvasElement,
    input: InputState,
    level: LevelConfig,
    touch: TouchControls | null = null,
  ) {
    this.scene = scene;
    this.canvas = canvas;
    this.input = input;
    this.level = level;
    this.touch = touch;
    this.input.setCanvasLook(false);
    this.touch?.setMode("mancer");
    this.hud = createHud();
    this.hud.onRunMacro((id) => {
      this.runMacro(id);
    });
    this.hud.onFocusGiant(() => {
      this.snapMancerToGiant();
    });
  }

  private async load(): Promise<void> {
    const [knightKit, giantKit] = await Promise.all([
      loadKaykitContainer(this.scene, "/models/knight/Knight.glb"),
      loadKaykitContainer(this.scene, "/models/villains/Barbarian.glb"),
    ]);
    this.knightKit = knightKit;
    this.player = Knight.create(
      this.scene,
      knightKit,
      "playerKnight",
      this.level.spawn.x,
      this.level.spawn.z,
      true,
    );
    this.giants = this.level.giants.map((spec, index) =>
      Giant.create(this.scene, giantKit, {
        id: `giant${index}`,
        maxHealth: spec.hp,
        size: spec.size,
        speed: spec.speed,
        damage: spec.damage,
        smashRange: spec.smashRange,
        smashHalfAngle: spec.smashHalfAngle,
        sightRange: spec.sightRange,
        turnSpeed: spec.turnSpeed,
        windup: spec.windup,
        recovery: spec.recovery,
        attackCooldown: spec.attackCooldown,
        x: spec.x,
        z: spec.z,
        yaw: spec.yaw,
      }),
    );

    const firstGiant = this.giants[0];
    this.followedGiant = firstGiant ?? null;
    this.mancerCam = new ArcRotateCamera(
      "mancerCam",
      -Math.PI / 2,
      0.95,
      78,
      firstGiant
        ? firstGiant.mesh.position.clone()
        : new Vector3(ARENA.x, heightAt(ARENA.x, ARENA.z) + MANCER_LOOK_HEIGHT, ARENA.z),
      this.scene,
    );
    this.mancerCam.lowerRadiusLimit = 28;
    this.mancerCam.upperRadiusLimit = 150;
    this.mancerCam.lowerBetaLimit = 0.35;
    this.mancerCam.upperBetaLimit = 1.25;
    this.mancerCam.panningSensibility = 0;
    this.mancerCam.wheelPrecision = 18;
    this.mancerCam.minZ = 0.3;
    this.mancerCam.maxZ = 900;
    this.mancerCam.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    const pointers = this.mancerCam.inputs.attached.pointers;
    if (pointers instanceof ArcRotateCameraPointersInput) {
      pointers.buttons = [0];
      pointers.useNaturalPinchZoom = true;
    }

    this.player.setVisible(false);
    this.scene.activeCamera = this.mancerCam;
    this.mancerCam.attachControl(this.canvas, true);
    this.spawnMarker = createSpawnMarker(this.scene);
    this.bindMancerPicking();
  }

  beginPlay(): void {
    if (this.started) {
      return;
    }
    this.input.flush();
    this.started = true;
  }

  update(dt: number): void {
    if (!this.started) {
      return;
    }
    if (this.input.justPressed("Tab")) {
      this.toggleMode();
    }
    if (this.mode === "mancer") {
      this.handleMancerKeys();
    }

    const blockers = blockingCircles(this.giants);
    if (this.mode === "macro") {
      if (this.input.justPressed("KeyR") && !this.player.dead) {
        this.toggleRecord();
      }
      this.player.updatePlayer(dt, this.input, blockers);
      if (this.recorder.active && this.player.alive) {
        this.recorder.sample(dt, this.player.snapshot());
      }
    } else {
      this.input.consumeMouse();
    }
    for (const minion of this.minions) {
      minion.updatePlayback(dt, blockers);
    }

    const foes = this.mode === "macro" ? [this.player, ...this.minions] : this.minions;
    assignGiantFocus(this.giants, foes);
    for (const giant of this.giants) {
      giant.combatActive = !this.lost;
      giant.update(dt, foes);
      giant.tryReceiveHits(foes);
    }
    separateGiants(this.giants);
    this.updateMancerCamera(dt);
    if (this.mode === "macro" && this.player.dead) {
      if (this.recorder.active) {
        this.toggleRecord();
      }
      if (this.player.readyToRevive) {
        this.setMode("mancer");
      }
    }
    if (!this.won && !this.lost) {
      this.fightTime += dt;
      this.collectKnightDeaths();
      if (this.giants.every((giant) => !giant.alive)) {
        this.won = true;
        this.clearGiantVictoryPending();
        this.showFightOver();
      }
    }
    this.updateGiantVictory(dt, foes);

    this.refreshSpawnMarker();
    this.hud.update({
      mode: this.mode,
      recording: this.recorder.active,
      knightHealth: this.player.health,
      knightMax: this.player.maxHealth,
      knightsDeployed: this.fieldKnightCount(),
      knightsLimit: this.level.knights,
      giantHealth: this.giants.reduce((sum, giant) => sum + giant.health, 0),
      giantMax: this.giants.reduce((sum, giant) => sum + giant.maxHealth, 0),
      giantCount: this.giants.length,
      score: this.score(),
      hurtFlash: this.mode === "macro" ? this.player.hurtFlash : 0,
      macros: this.macros,
      selectedId: this.selectedId,
      showFocusGiant: this.mode === "mancer" && !this.mancerFollowing,
    });
  }

  resetFight(): void {
    for (const minion of this.minions) {
      minion.dispose();
    }
    this.minions.length = 0;
    for (const giant of this.giants) {
      giant.reset();
    }
    this.followedGiant = this.giants[0] ?? null;
    this.mancerFollowing = true;
    this.snapMancerToGiant();
    this.won = false;
    this.lost = false;
    this.pendingGiantWin = false;
    this.loseDelay = 0;
    this.fightTime = 0;
    this.knightDeaths = 0;
    this.countedDead.clear();
    this.activatedMacros.clear();
    this.player.resetToSpawn();
    hideWinScoreboard();
    setOverlayVisible("#win-overlay", false);
    setOverlayVisible("#lose-overlay", false);
    if (this.mode === "macro") {
      this.setMode("mancer");
    } else {
      this.player.setVisible(false);
    }
  }

  private updateGiantVictory(dt: number, foes: Knight[]): void {
    if (this.won || this.lost || this.mode === "macro") {
      return;
    }
    if (this.allKnightsLost(foes)) {
      if (!this.pendingGiantWin) {
        this.pendingGiantWin = true;
        this.loseDelay = GIANT_VICTORY_DELAY;
        for (const giant of this.giants) {
          giant.celebrate();
        }
      }
      this.loseDelay -= dt;
      if (this.loseDelay <= 0) {
        this.lost = true;
        this.showFightOver();
      }
      return;
    }
    this.clearGiantVictoryPending();
  }

  private allKnightsLost(foes: Knight[]): boolean {
    return !this.canDeployKnight() && foes.length > 0 && foes.every((knight) => !knight.alive);
  }

  private showFightOver(): void {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
    const score = this.score();
    const title = document.querySelector("#win-title");
    const body = document.querySelector("#win-body");
    if (title) {
      title.textContent = this.lost ? this.level.copy.loseTitle : this.level.copy.winTitle;
    }
    if (body) {
      body.textContent = this.lost ? this.level.copy.loseBody : this.level.copy.winBody;
    }
    setWinScore(score);
    const next = document.querySelector("#next-level");
    if (next) {
      next.classList.toggle("hidden", this.lost || !this.level.next);
    }
    setOverlayVisible("#win-overlay", true);
    setOverlayVisible("#lose-overlay", false);
    if (this.lost) {
      hideWinScoreboard();
    } else {
      showWinScoreboard(score);
    }
  }

  private clearGiantVictoryPending(): void {
    if (!this.pendingGiantWin) {
      return;
    }
    this.pendingGiantWin = false;
    this.loseDelay = 0;
    for (const giant of this.giants) {
      giant.stopCelebrating();
    }
  }

  private toggleMode(): void {
    if (this.mode === "macro") {
      this.setMode("mancer");
    }
  }

  private updateMancerCamera(dt: number): void {
    if (this.mode !== "mancer") {
      return;
    }
    if (this.tryMancerPan(dt)) {
      return;
    }
    if (!this.mancerFollowing) {
      return;
    }
    const giant = this.followSubject();
    if (!giant) {
      return;
    }
    const look = giant.mesh.position;
    const target = this.mancerCam.target;
    const blend = 1 - Math.exp(-MANCER_CAM_FOLLOW * dt);
    target.x += (look.x - target.x) * blend;
    target.y += (look.y - target.y) * blend;
    target.z += (look.z - target.z) * blend;
  }

  private tryMancerPan(dt: number): boolean {
    let x = 0;
    let z = 0;
    if (this.input.isDown("KeyD") || this.input.isDown("ArrowRight")) {
      x += 1;
    }
    if (this.input.isDown("KeyA") || this.input.isDown("ArrowLeft")) {
      x -= 1;
    }
    if (this.input.isDown("KeyW") || this.input.isDown("ArrowUp")) {
      z += 1;
    }
    if (this.input.isDown("KeyS") || this.input.isDown("ArrowDown")) {
      z -= 1;
    }
    if (x === 0 && z === 0) {
      return false;
    }
    this.mancerFollowing = false;
    const len = Math.hypot(x, z);
    const alpha = this.mancerCam.alpha;
    const fx = -Math.cos(alpha);
    const fz = -Math.sin(alpha);
    const rx = -Math.sin(alpha);
    const rz = Math.cos(alpha);
    const step = (MANCER_CAM_PAN * dt) / len;
    const target = this.mancerCam.target;
    target.x += (rx * x + fx * z) * step;
    target.z += (rz * x + fz * z) * step;
    const clamped = clampToWorld(target.x, target.z);
    target.x = clamped.x;
    target.z = clamped.z;
    target.y = heightAt(target.x, target.z) + MANCER_LOOK_HEIGHT;
    return true;
  }

  private snapMancerToGiant(): void {
    this.mancerFollowing = true;
    const giant = this.followSubject();
    if (!giant) {
      return;
    }
    this.mancerCam.target.copyFrom(giant.mesh.position);
  }

  private followSubject(): Giant | null {
    if (this.followedGiant?.alive) {
      return this.followedGiant;
    }
    const next =
      this.giants.find((giant) => giant.alive) ?? this.giants[0] ?? null;
    this.followedGiant = next;
    return next;
  }

  private setMode(next: GameMode): void {
    if (next === this.mode) {
      return;
    }
    if (this.mode === "macro" && this.recorder.active) {
      this.toggleRecord();
    }
    this.mode = next;
    switch (next) {
      case "macro":
        this.mancerCam.detachControl();
        this.player.setVisible(true);
        if (this.player.camera) {
          this.scene.activeCamera = this.player.camera;
        }
        this.input.setCanvasLook(true);
        this.touch?.setMode("macro");
        if (!isTouchPlay()) {
          void Promise.resolve(this.canvas.requestPointerLock()).catch(() => {});
        }
        this.clearPathPreview();
        this.spawnMarker.setEnabled(false);
        break;
      case "mancer":
        if (this.player.dead) {
          this.player.reviveInPlace(blockingCircles(this.giants));
        }
        this.input.setCanvasLook(false);
        this.touch?.setMode("mancer");
        if (document.pointerLockElement === this.canvas) {
          document.exitPointerLock();
        }
        this.player.setVisible(false);
        this.scene.activeCamera = this.mancerCam;
        this.mancerCam.attachControl(this.canvas, true);
        this.refreshPathPreview();
        break;
      default: {
        const _never: never = next;
        return _never;
      }
    }
  }

  private toggleRecord(): void {
    if (this.recorder.active) {
      const macro = this.recorder.stop();
      if (macro) {
        this.macros.push(macro);
        this.selectedId = macro.id;
        this.noteActivatedMacro(macro.id);
      }
      return;
    }
    this.startRecording();
  }

  private startRecording(): void {
    if (this.recorder.active) {
      return;
    }
    this.recorder.start();
    this.recorder.sample(0, this.player.snapshot());
  }

  private bindMancerPicking(): void {
    this.scene.onPointerObservable.add((info) => {
      if (!this.started || this.mode !== "mancer") {
        this.mancerPointerDown = null;
        return;
      }
      const event = info.event;
      if (!isPrimaryPointer(event)) {
        return;
      }
      if (info.type === PointerEventTypes.POINTERDOWN) {
        this.mancerPointerDown = { x: this.scene.pointerX, y: this.scene.pointerY };
        return;
      }
      if (info.type === PointerEventTypes.POINTERUP) {
        const start = this.mancerPointerDown;
        this.mancerPointerDown = null;
        if (!start) {
          return;
        }
        const dx = this.scene.pointerX - start.x;
        const dy = this.scene.pointerY - start.y;
        const slop = isTouchPlay() ? 24 : MANCER_CLICK_SLOP;
        if (dx * dx + dy * dy > slop * slop) {
          return;
        }
        this.tryBeginMacroAtPointer();
      }
    });
  }

  private tryBeginMacroAtPointer(): void {
    if (this.won || this.lost || !this.canDeployKnight()) {
      return;
    }
    const point = this.pickWalkablePoint();
    if (!point) {
      return;
    }
    this.clearGiantVictoryPending();
    this.player.placeAt(point.x, point.z, blockingCircles(this.giants));
    this.setMode("macro");
    this.input.flush();
    this.startRecording();
  }

  private pickWalkablePoint(): Vector3 | null {
    const hit = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (mesh) => mesh.isEnabled() && mesh.metadata?.walkable === true,
    );
    if (!hit?.hit || !hit.pickedPoint) {
      return null;
    }
    return hit.pickedPoint;
  }

  private refreshSpawnMarker(): void {
    if (
      this.mode !== "mancer" ||
      !this.started ||
      this.won ||
      this.lost ||
      !this.canDeployKnight()
    ) {
      this.spawnMarker.setEnabled(false);
      return;
    }
    // Picking every frame is costly on mobile while the giant (and camera) move.
    this.spawnMarkerAge += 1;
    const throttle = isTouchPlay() ? 2 : 1;
    if (this.spawnMarker.isEnabled() && this.spawnMarkerAge % throttle !== 0) {
      const pulse = 1 + Math.sin(performance.now() / 220) * 0.08;
      this.spawnMarker.scaling.setAll(pulse);
      return;
    }
    const point = this.pickWalkablePoint();
    if (!point) {
      this.spawnMarker.setEnabled(false);
      return;
    }
    const pulse = 1 + Math.sin(performance.now() / 220) * 0.08;
    this.spawnMarker.position.set(point.x, point.y + 0.08, point.z);
    this.spawnMarker.scaling.setAll(pulse);
    this.spawnMarker.setEnabled(true);
  }

  private handleMancerKeys(): void {
    if (this.input.justPressed("KeyG")) {
      this.snapMancerToGiant();
    }
    if (this.input.justPressed("Space")) {
      this.runMacro(this.selectedId);
    }
    for (let i = 1; i <= 9; i++) {
      if (!this.input.justPressed(`Digit${i}`)) {
        continue;
      }
      const macro = this.macros[i - 1];
      if (macro) {
        this.runMacro(macro.id);
      }
    }
  }

  private runMacro(id: string | null): void {
    if (this.won || this.lost) {
      return;
    }
    const macro = this.macros.find((item) => item.id === id);
    if (!macro) {
      return;
    }
    this.selectedId = macro.id;
    this.refreshPathPreview();
    if (!this.canDeployKnight()) {
      return;
    }
    const first = macro.frames[0];
    const x = first?.x ?? 0;
    const z = first?.z ?? 0;
    this.minionSerial += 1;
    const minion = Knight.create(
      this.scene,
      this.knightKit,
      `minion${this.minionSerial}`,
      x,
      z,
      false,
    );
    minion.beginPlayback(macro);
    this.minions.push(minion);
    this.noteActivatedMacro(macro.id);
  }

  private fieldKnightCount(): number {
    return this.minions.length + (this.mode === "macro" ? 1 : 0);
  }

  private canDeployKnight(): boolean {
    return this.fieldKnightCount() < this.level.knights;
  }

  private score(): number {
    if (this.lost) {
      return 0;
    }
    return fightScore(this.fightTime, this.knightDeaths, this.activatedMacros.size);
  }

  private noteActivatedMacro(id: string): void {
    this.activatedMacros.add(id);
  }

  private collectKnightDeaths(): void {
    for (const knight of [this.player, ...this.minions]) {
      if (knight.dead) {
        if (!this.countedDead.has(knight)) {
          this.countedDead.add(knight);
          this.knightDeaths += 1;
        }
      } else {
        this.countedDead.delete(knight);
      }
    }
  }

  private refreshPathPreview(): void {
    this.clearPathPreview();
    if (this.mode !== "mancer") {
      return;
    }
    const macro = this.macros.find((item) => item.id === this.selectedId);
    if (!macro || macro.frames.length < 2) {
      return;
    }
    const points = macro.frames.map(
      (frame) => new Vector3(frame.x, frame.y + 0.25, frame.z),
    );
    const line = MeshBuilder.CreateLines("macroPath", { points }, this.scene);
    line.color = new Color3(0.9, 0.72, 0.28);
    line.isPickable = false;
    this.pathPreview = line;
  }

  private clearPathPreview(): void {
    this.pathPreview?.dispose();
    this.pathPreview = null;
  }
}

function createSpawnMarker(scene: Scene): Mesh {
  const marker = MeshBuilder.CreateDisc("spawnMarker", { radius: 1.15, tessellation: 32 }, scene);
  marker.rotation.x = Math.PI / 2;
  marker.isPickable = false;
  const material = new StandardMaterial("spawnMarkerMat", scene);
  material.diffuseColor = new Color3(0.9, 0.72, 0.28);
  material.emissiveColor = new Color3(0.55, 0.4, 0.12);
  material.specularColor = new Color3(0, 0, 0);
  material.alpha = 0.72;
  material.backFaceCulling = false;
  marker.material = material;
  marker.setEnabled(false);
  return marker;
}

function setOverlayVisible(selector: string, visible: boolean): void {
  document.querySelector(selector)?.classList.toggle("hidden", !visible);
}

function isPrimaryPointer(event: { button: number; pointerType?: string }): boolean {
  return event.button === 0 || event.pointerType === "touch";
}

function setWinScore(score: number): void {
  const el = document.querySelector("#win-score");
  if (el) {
    el.textContent = `Score ${formatScore(score)}`;
  }
}
