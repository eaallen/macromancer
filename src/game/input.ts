export type InputState = {
  isDown: (code: string) => boolean;
  justPressed: (code: string) => boolean;
  justClicked: () => boolean;
  consumeMouse: () => { dx: number; dy: number };
  flush: () => void;
  setVirtualKey: (code: string, down: boolean) => void;
  pulseVirtualKey: (code: string) => void;
  setCanvasLook: (enabled: boolean) => void;
};

const KEY_LISTENER = { capture: true } as const;

let keySink: HTMLInputElement | null = null;

/**
 * Focus a hidden password field so macOS Chrome/Safari do not show the
 * press-and-hold accent picker while game keys are held.
 */
export function focusGameKeys(): void {
  if (!keySink) {
    const sink = document.createElement("input");
    sink.type = "password";
    sink.className = "key-sink";
    sink.tabIndex = -1;
    sink.readOnly = true;
    sink.autocomplete = "off";
    sink.spellcheck = false;
    sink.setAttribute("aria-hidden", "true");
    sink.setAttribute("autocapitalize", "off");
    sink.setAttribute("autocorrect", "off");
    sink.setAttribute("inputmode", "none");
    document.body.appendChild(sink);
    keySink = sink;
  }
  keySink.focus({ preventScroll: true });
}

export function createInput(canvas: HTMLCanvasElement): InputState {
  const keys = new Set<string>();
  const virtualKeys = new Set<string>();
  const pressed = new Set<string>();
  let mouseDX = 0;
  let mouseDY = 0;
  let dragging = false;
  let clickQueued = false;
  let canvasLook = false;
  let lookPointerId: number | null = null;

  window.addEventListener(
    "keydown",
    (event) => {
      if (isUiKeyTarget(event.target)) {
        return;
      }
      if (event.code === "Tab") {
        event.preventDefault();
      }
      if (!event.metaKey && !event.ctrlKey) {
        event.preventDefault();
      }
      if (document.activeElement !== keySink) {
        focusGameKeys();
      }
      if (!event.repeat && !keys.has(event.code) && !virtualKeys.has(event.code)) {
        pressed.add(event.code);
      }
      keys.add(event.code);
    },
    KEY_LISTENER,
  );
  window.addEventListener(
    "keyup",
    (event) => {
      keys.delete(event.code);
    },
    KEY_LISTENER,
  );
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
      focusGameKeys();
    }
  });
  canvas.addEventListener("pointerdown", (event) => {
    focusGameKeys();
    if (event.button !== 0) {
      return;
    }
    if (document.pointerLockElement === canvas) {
      clickQueued = true;
      return;
    }
    if (!canvasLook) {
      return;
    }
    dragging = true;
    lookPointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
  });
  const endLook = (event: PointerEvent): void => {
    if (lookPointerId !== null && event.pointerId !== lookPointerId) {
      return;
    }
    const capturedId = lookPointerId;
    dragging = false;
    lookPointerId = null;
    if (capturedId !== null && canvas.hasPointerCapture(capturedId)) {
      canvas.releasePointerCapture(capturedId);
    }
  };
  canvas.addEventListener("pointerup", endLook);
  canvas.addEventListener("pointercancel", endLook);
  canvas.addEventListener("lostpointercapture", endLook);
  canvas.addEventListener("pointermove", (event) => {
    const looking = document.pointerLockElement === canvas || dragging;
    if (!looking) {
      return;
    }
    mouseDX += event.movementX;
    mouseDY += event.movementY;
  });

  return {
    isDown: (code) => keys.has(code) || virtualKeys.has(code),
    justPressed: (code) => {
      if (!pressed.has(code)) {
        return false;
      }
      pressed.delete(code);
      return true;
    },
    justClicked: () => {
      const queued = clickQueued;
      clickQueued = false;
      return queued;
    },
    consumeMouse: () => {
      const dx = mouseDX;
      const dy = mouseDY;
      mouseDX = 0;
      mouseDY = 0;
      return { dx, dy };
    },
    flush: () => {
      keys.clear();
      pressed.clear();
      mouseDX = 0;
      mouseDY = 0;
      clickQueued = false;
      dragging = false;
      lookPointerId = null;
    },
    setVirtualKey: (code, down) => {
      if (down) {
        if (!virtualKeys.has(code) && !keys.has(code)) {
          pressed.add(code);
        }
        virtualKeys.add(code);
        return;
      }
      virtualKeys.delete(code);
    },
    pulseVirtualKey: (code) => {
      pressed.add(code);
    },
    setCanvasLook: (enabled) => {
      canvasLook = enabled;
      if (!enabled) {
        dragging = false;
        lookPointerId = null;
      }
    },
  };
}

/**
 * Let overlay forms (score initials, buttons, links) receive keys instead of
 * the hidden game key sink.
 */
function isUiKeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement) || target === keySink) {
    return false;
  }
  return Boolean(
    target.closest("input, textarea, select, button, a, [contenteditable='true']"),
  );
}
