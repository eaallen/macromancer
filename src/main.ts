import "./style.css";
import { Engine } from "@babylonjs/core/Engines/engine";
import "@babylonjs/core/Collisions/collisionCoordinator";
import "@babylonjs/core/Culling/ray";
import "@babylonjs/core/Materials/PBR/pbrBaseMaterial";
import "@babylonjs/core/Shaders/postprocess.vertex";
import "@babylonjs/core/Shaders/ShadersInclude/helperFunctions";
import "@babylonjs/core/Shaders/rgbdDecode.fragment";
import { createScene } from "./game/createScene.ts";
import { createTerrain } from "./game/createTerrain.ts";
import { createWorld } from "./game/world.ts";
import { createInput, focusGameKeys } from "./game/input.ts";
import { createTouchControls, isTouchPlay } from "./game/touchControls.ts";
import { Game } from "./game/game.ts";
import { loadPageLevel } from "./game/level.ts";
import { ensurePlayer } from "./game/leaderboard.ts";
import { addHowItWasMadeLink } from "./game/siteNav.ts";
import { initAnalytics } from "./firebase.ts";

const level = loadPageLevel();
addHowItWasMadeLink();
void initAnalytics();

const foundCanvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!foundCanvas) {
  throw new Error("Game canvas was not found.");
}
const canvas: HTMLCanvasElement = foundCanvas;

const foundOverlay = document.querySelector<HTMLElement>("#start-overlay");
const foundStart = document.querySelector<HTMLButtonElement>("#start-button");
const foundReset = document.querySelector<HTMLButtonElement>("#reset-button");
const foundRetry = document.querySelector<HTMLButtonElement>("#retry-button");
if (!foundOverlay || !foundStart || !foundReset || !foundRetry) {
  throw new Error("Menu markup is missing.");
}
const overlay: HTMLElement = foundOverlay;
const startButton: HTMLButtonElement = foundStart;
const resetButton: HTMLButtonElement = foundReset;
const retryButton: HTMLButtonElement = foundRetry;

const engine = new Engine(canvas, !isTouchPlay());
if (isTouchPlay()) {
  // Phones pay more while the camera follows a running giant; render below
  // native DPR and skip MSAA to keep fill-rate under control.
  engine.setHardwareScalingLevel(Math.max(1.25, window.devicePixelRatio * 0.75));
}
const scene = createScene(engine, level.vibe);
createTerrain(scene, level.vibe);
const input = createInput(canvas);
const touch = isTouchPlay() ? createTouchControls(input) : null;
let game: Game | null = null;

function hideOverlay(): void {
  overlay.classList.add("hidden");
}

function tryPointerLock(): void {
  if (isTouchPlay() || game?.mode !== "macro") {
    return;
  }
  void Promise.resolve(canvas.requestPointerLock()).then(
    () => {
      focusGameKeys();
    },
    () => {
      focusGameKeys();
    },
  );
}

startButton.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (!game) {
    return;
  }
  hideOverlay();
  document.querySelector("#hud")?.classList.remove("hidden");
  game.beginPlay();
  tryPointerLock();
});
canvas.addEventListener("click", tryPointerLock);
function resetFight(): void {
  game?.resetFight();
}
resetButton.addEventListener("click", resetFight);
retryButton.addEventListener("click", resetFight);

async function start(): Promise<void> {
  void ensurePlayer().catch(() => {});
  await createWorld(scene, level);
  game = await Game.create(scene, canvas, input, level, touch);
  startButton.disabled = false;
  startButton.textContent = level.copy.startCta;
  engine.runRenderLoop(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    game?.update(dt);
    scene.render();
  });
}

void start();

window.addEventListener("resize", () => {
  engine.resize();
});
