import type { GameMode } from "./config.ts";
import type { Macro } from "./macros.ts";
import { formatScore } from "./score.ts";
import { isTouchPlay } from "./touchControls.ts";

export type Hud = {
  update: (state: {
    mode: GameMode;
    recording: boolean;
    knightHealth: number;
    knightMax: number;
    knightsDeployed: number;
    knightsLimit: number;
    giantHealth: number;
    giantMax: number;
    giantCount: number;
    score: number;
    hurtFlash: number;
    macros: Macro[];
    selectedId: string | null;
    showFocusGiant: boolean;
  }) => void;
  onRunMacro: (handler: (id: string) => void) => void;
  onFocusGiant: (handler: () => void) => void;
};

export function createHud(): Hud {
  const modeEl = requireEl("#mode-badge");
  const knightEl = requireEl("#knight-hp");
  const knightPoolEl = requireEl("#knight-pool");
  const scoreEl = requireEl("#score");
  const giantFill = requireEl("#giant-hp-fill");
  const giantText = requireEl("#giant-hp-text");
  const recEl = requireEl("#recording-pip");
  const listEl = requireEl("#macro-list");
  const hintEl = requireEl("#macro-hint");
  const helpEl = requireEl("#help");
  const hurtEl = requireEl("#hurt-flash");
  const hudEl = requireEl("#hud");
  const focusGiantBtn = document.createElement("button");
  focusGiantBtn.type = "button";
  focusGiantBtn.id = "focus-giant";
  focusGiantBtn.className = "hidden";
  focusGiantBtn.textContent = isTouchPlay() ? "Focus giant" : "Focus giant · G";
  hudEl.append(focusGiantBtn);
  let runHandler: ((id: string) => void) | null = null;
  let focusHandler: (() => void) | null = null;
  let renderedKey = "";

  focusGiantBtn.addEventListener("click", () => {
    focusHandler?.();
  });

  return {
    onRunMacro(handler) {
      runHandler = handler;
    },
    onFocusGiant(handler) {
      focusHandler = handler;
    },
    update(state) {
      modeEl.textContent = state.mode === "macro" ? "MACRO" : "MANCER";
      knightEl.textContent = `Knight HP ${Math.max(0, state.knightHealth)}/${state.knightMax}`;
      knightEl.style.display = state.mode === "macro" ? "block" : "none";
      const outOfKnights = state.knightsDeployed >= state.knightsLimit;
      knightPoolEl.textContent = `Knights ${state.knightsDeployed}/${state.knightsLimit}`;
      knightPoolEl.classList.toggle("depleted", outOfKnights);
      scoreEl.textContent = `Score ${formatScore(state.score)}`;
      const ratio = Math.max(0, state.giantHealth) / state.giantMax;
      giantFill.style.transform = `scaleX(${ratio})`;
      giantText.textContent = `${Math.max(0, Math.ceil(state.giantHealth))} / ${state.giantMax}`;
      recEl.classList.toggle("hidden", !state.recording);
      focusGiantBtn.classList.toggle("hidden", !state.showFocusGiant);
      hurtEl.style.opacity = String(state.hurtFlash);
      helpEl.textContent = touchHelp(state.mode, outOfKnights);
      hintEl.textContent =
        state.mode === "macro"
          ? state.recording
            ? "Recording the path. Other knights keep fighting on their own."
            : state.giantCount > 1
              ? "The giants will chase you. Other knights keep fighting."
              : "The giant will chase you. Other knights keep fighting."
          : state.macros.length === 0
            ? isTouchPlay()
              ? "Tap where you want your knight to start. That begins a new macro."
              : "Click where you want your knight to start. That begins a new macro."
            : outOfKnights
              ? `All ${state.knightsLimit} knights are on the field.`
              : isTouchPlay()
                ? "Tap the ground to start another knight, or send a saved macro from the list."
                : "Click the ground to start another knight, or send a saved macro with Space.";

      const key = `${state.macros.map((macro) => macro.id).join(",")}|${state.selectedId}`;
      if (key === renderedKey) {
        return;
      }
      renderedKey = key;
      listEl.replaceChildren();
      if (state.macros.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "None saved";
        empty.style.opacity = "0.7";
        listEl.append(empty);
        return;
      }
      for (const macro of state.macros) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "macro-btn";
        if (macro.id === state.selectedId) {
          button.classList.add("selected");
        }
        button.textContent = `${macro.name}  ${macro.duration.toFixed(1)}s`;
        button.addEventListener("click", () => {
          runHandler?.(macro.id);
        });
        listEl.append(button);
      }
    },
  };
}

function requireEl(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) {
    throw new Error(`HUD markup is missing ${selector}.`);
  }
  return el;
}

function touchHelp(mode: GameMode, outOfKnights: boolean): string {
  if (!isTouchPlay()) {
    if (mode === "macro") {
      return "WASD move · Shift run · J / click attack · R record · Tab mancer";
    }
    return outOfKnights
      ? "No knights left to send · WASD look around · Left-drag orbit"
      : "Click the ground to start a knight · WASD look around · Left-drag orbit · Space run selected";
  }
  if (mode === "macro") {
    return "Stick move · drag look · Attack / Jump / tap Sprint to run";
  }
  return outOfKnights
    ? "No knights left to send · drag to orbit · pinch to zoom"
    : "Tap the ground to start a knight · drag to orbit · pinch to zoom";
}
