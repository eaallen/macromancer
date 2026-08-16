import type { GameMode } from "./config.ts";
import type { InputState } from "./input.ts";

const STICK_RADIUS = 56;
const STICK_DEADZONE = 0.28;
const MOVE_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD"] as const;

type HoldCode = "Space";
type ToggleCode = "ShiftLeft";
type TouchAction =
  | { kind: "pulse"; code: string }
  | { kind: "hold"; code: HoldCode }
  | { kind: "toggle"; code: ToggleCode };

export type TouchControls = {
  setMode: (mode: GameMode) => void;
  release: () => void;
};

/**
 * True when the primary pointer is coarse (phones and tablets), so we show
 * on-screen controls instead of relying on a keyboard and pointer lock.
 */
export function isTouchPlay(): boolean {
  if (window.matchMedia("(pointer: coarse)").matches) {
    return true;
  }
  return "ontouchstart" in window && window.matchMedia("(hover: none)").matches;
}

export function createTouchControls(input: InputState): TouchControls {
  document.body.classList.add("touch-play");
  document.body.dataset.gameMode = "mancer";
  applyTouchStartCopy();

  const hud = document.querySelector("#hud");
  if (!hud) {
    throw new Error("HUD markup is missing #hud.");
  }

  const root = document.createElement("div");
  root.id = "touch-controls";
  root.innerHTML = `
    <div id="touch-stick-zone">
      <div class="touch-stick" id="touch-stick">
        <div class="touch-stick-ring"></div>
        <div class="touch-stick-knob"></div>
      </div>
    </div>
    <div id="touch-actions">
      <button type="button" class="touch-btn" data-pulse="KeyR" draggable="false">Record</button>
      <button type="button" class="touch-btn" data-pulse="Tab" draggable="false">Overview</button>
      <button type="button" class="touch-btn" data-toggle="ShiftLeft" aria-pressed="false" draggable="false">Sprint</button>
      <button type="button" class="touch-btn" data-hold="Space" draggable="false">Jump</button>
      <button type="button" class="touch-btn touch-btn-attack" data-pulse="KeyJ" draggable="false">Attack</button>
    </div>
  `;
  hud.append(root);

  const zone = root.querySelector("#touch-stick-zone");
  const stick = root.querySelector("#touch-stick");
  const knob = root.querySelector(".touch-stick-knob");
  const actions = root.querySelector("#touch-actions");
  if (
    !(zone instanceof HTMLElement) ||
    !(stick instanceof HTMLElement) ||
    !(knob instanceof HTMLElement) ||
    !(actions instanceof HTMLElement)
  ) {
    throw new Error("Touch control markup failed to mount.");
  }

  let stickPointer: number | null = null;
  let originX = 0;
  let originY = 0;
  const holds = new Map<number, HoldCode>();
  const toggles = new Set<ToggleCode>();

  const setMove = (nx: number, ny: number): void => {
    input.setVirtualKey("KeyW", ny < -STICK_DEADZONE);
    input.setVirtualKey("KeyS", ny > STICK_DEADZONE);
    input.setVirtualKey("KeyA", nx < -STICK_DEADZONE);
    input.setVirtualKey("KeyD", nx > STICK_DEADZONE);
  };

  const clearMove = (): void => {
    for (const code of MOVE_KEYS) {
      input.setVirtualKey(code, false);
    }
  };

  const restStick = (): void => {
    stick.classList.remove("active");
    stick.style.left = "";
    stick.style.top = "";
    knob.style.transform = "";
    clearMove();
    stickPointer = null;
  };

  const placeStick = (clientX: number, clientY: number): void => {
    const bounds = zone.getBoundingClientRect();
    stick.style.left = `${clientX - bounds.left}px`;
    stick.style.top = `${clientY - bounds.top}px`;
    stick.classList.add("active");
  };

  zone.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || stickPointer !== null) {
      return;
    }
    event.preventDefault();
    stickPointer = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    placeStick(originX, originY);
    knob.style.transform = "translate(-50%, -50%)";
    zone.setPointerCapture(event.pointerId);
  });

  const endStick = (event: PointerEvent): void => {
    if (event.pointerId !== stickPointer) {
      return;
    }
    restStick();
  };

  zone.addEventListener("pointermove", (event) => {
    if (event.pointerId !== stickPointer) {
      return;
    }
    event.preventDefault();
    const dx = event.clientX - originX;
    const dy = event.clientY - originY;
    const dist = Math.hypot(dx, dy);
    const clamped = dist > STICK_RADIUS ? STICK_RADIUS / dist : 1;
    const cx = dx * clamped;
    const cy = dy * clamped;
    knob.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`;
    const nx = cx / STICK_RADIUS;
    const ny = cy / STICK_RADIUS;
    setMove(nx, ny);
  });
  zone.addEventListener("pointerup", endStick);
  zone.addEventListener("pointercancel", endStick);
  zone.addEventListener("lostpointercapture", endStick);
  suppressOsCallout(zone);

  const releaseHolds = (): void => {
    for (const code of holds.values()) {
      input.setVirtualKey(code, false);
    }
    holds.clear();
    for (const code of toggles) {
      input.setVirtualKey(code, false);
    }
    toggles.clear();
    actions.querySelectorAll(".held").forEach((btn) => {
      btn.classList.remove("held");
      if (btn instanceof HTMLElement && btn.dataset.toggle) {
        btn.setAttribute("aria-pressed", "false");
      }
    });
  };

  const release = (): void => {
    restStick();
    releaseHolds();
  };

  actions.addEventListener("pointerdown", (event) => {
    const btn =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-pulse], [data-hold], [data-toggle]")
        : null;
    if (!btn) {
      return;
    }
    const action = readTouchAction(btn);
    if (!action) {
      return;
    }
    event.preventDefault();
    switch (action.kind) {
      case "pulse":
        input.pulseVirtualKey(action.code);
        return;
      case "hold":
        holds.set(event.pointerId, action.code);
        input.setVirtualKey(action.code, true);
        btn.classList.add("held");
        btn.setPointerCapture(event.pointerId);
        return;
      case "toggle": {
        const on = !toggles.has(action.code);
        if (on) {
          toggles.add(action.code);
          input.setVirtualKey(action.code, true);
          btn.classList.add("held");
        } else {
          toggles.delete(action.code);
          input.setVirtualKey(action.code, false);
          btn.classList.remove("held");
        }
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        return;
      }
      default: {
        const _never: never = action;
        return _never;
      }
    }
  });

  const endHold = (event: PointerEvent): void => {
    const code = holds.get(event.pointerId);
    if (!code) {
      return;
    }
    holds.delete(event.pointerId);
    input.setVirtualKey(code, false);
    actions.querySelector(`[data-hold="${code}"]`)?.classList.remove("held");
  };
  actions.addEventListener("pointerup", endHold);
  actions.addEventListener("pointercancel", endHold);
  actions.addEventListener("lostpointercapture", endHold);
  suppressOsCallout(actions);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      release();
    }
  });

  return {
    setMode(mode) {
      document.body.dataset.gameMode = mode;
      root.dataset.mode = mode;
      releaseHolds();
    },
    release,
  };
}

function applyTouchStartCopy(): void {
  const list = document.querySelector("#start-overlay ul");
  if (!list) {
    return;
  }
  list.replaceChildren(
    item("Mancer — tap the field to place your knight and start a macro"),
    item("Macro — play the knight; Overview returns to the map"),
    item("Left stick moves · drag to look · Attack, Jump, tap Sprint to run, Record"),
  );
}

function item(text: string): HTMLLIElement {
  const li = document.createElement("li");
  li.textContent = text;
  return li;
}

function readTouchAction(btn: HTMLElement): TouchAction | null {
  const pulse = btn.dataset.pulse;
  if (pulse) {
    return { kind: "pulse", code: pulse };
  }
  const hold = btn.dataset.hold;
  if (hold === "Space") {
    return { kind: "hold", code: hold };
  }
  const toggle = btn.dataset.toggle;
  if (toggle === "ShiftLeft") {
    return { kind: "toggle", code: toggle };
  }
  return null;
}

/**
 * iOS Safari treats a held button as text: copy/paste/callout. Block that so
 * Jump still works as a hold, and Sprint is not stolen by the system menu.
 */
function suppressOsCallout(el: HTMLElement): void {
  const block = (event: Event): void => {
    event.preventDefault();
  };
  el.addEventListener("contextmenu", block);
  el.addEventListener("selectstart", block);
  el.addEventListener("dragstart", block);
  el.addEventListener("touchstart", block, { passive: false });
}
