import type { GameMode } from "./config.ts";
import type { InputState } from "./input.ts";

const STICK_RADIUS = 56;
const STICK_DEADZONE = 0.28;
const MOVE_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD"] as const;

type HoldCode = "Space" | "ShiftLeft";

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
      <button type="button" class="touch-btn" data-pulse="KeyR">Record</button>
      <button type="button" class="touch-btn" data-pulse="Tab">Overview</button>
      <button type="button" class="touch-btn" data-hold="ShiftLeft">Sprint</button>
      <button type="button" class="touch-btn" data-hold="Space">Jump</button>
      <button type="button" class="touch-btn touch-btn-attack" data-pulse="KeyJ">Attack</button>
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
  zone.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  const releaseHolds = (): void => {
    for (const code of holds.values()) {
      input.setVirtualKey(code, false);
    }
    holds.clear();
    actions.querySelectorAll(".held").forEach((btn) => {
      btn.classList.remove("held");
    });
  };

  const release = (): void => {
    restStick();
    releaseHolds();
  };

  actions.addEventListener("pointerdown", (event) => {
    const btn =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-pulse], [data-hold]")
        : null;
    if (!btn) {
      return;
    }
    const pulse = btn.dataset.pulse;
    const hold = btn.dataset.hold;
    event.preventDefault();
    if (pulse) {
      input.pulseVirtualKey(pulse);
      return;
    }
    if (hold !== "Space" && hold !== "ShiftLeft") {
      return;
    }
    holds.set(event.pointerId, hold);
    input.setVirtualKey(hold, true);
    btn.classList.add("held");
    btn.setPointerCapture(event.pointerId);
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
  actions.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

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
    item("Left stick moves · drag to look · Attack, Jump, Sprint, Record"),
  );
}

function item(text: string): HTMLLIElement {
  const li = document.createElement("li");
  li.textContent = text;
  return li;
}
