// sheet.js — a single reusable bottom-sheet component used for every form,
// the settings panel, the filter panel, and confirmation dialogs. On wider
// screens the exact same markup renders as a centered modal (see
// components.css) so there is only one implementation to maintain.

let activeSheet = null;

/**
 * Opens a sheet.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {HTMLElement|string} opts.content
 * @param {Array<{label:string, variant?:string, onClick:Function}>} [opts.actions]
 * @param {boolean} [opts.small]
 * @returns {{ close: Function, body: HTMLElement }}
 */
export function openSheet({ title, content, actions, small = false, onDismiss }) {
  closeSheet(); // only one at a time

  const previouslyFocused = document.activeElement;

  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.innerHTML = `
    <div class="sheet${small ? " sheet-sm" : ""}" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
      <div class="sheet-drag-zone">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-header">
          <h2 id="sheetTitle">${title}</h2>
          <button type="button" class="icon-btn" data-sheet-close aria-label="Close">
            <i class="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div class="sheet-body"></div>
    </div>
  `;

  const sheetEl = backdrop.querySelector(".sheet");
  const body = backdrop.querySelector(".sheet-body");

  if (typeof content === "string") {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }

  if (actions && actions.length) {
    const footer = document.createElement("div");
    footer.className = "sheet-footer";
    actions.forEach((action) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn ${action.variant === "danger" ? "btn-danger" : action.variant === "secondary" ? "btn-secondary" : "btn-primary"}`;
      btn.textContent = action.label;
      btn.addEventListener("click", () => action.onClick(close));
      footer.appendChild(btn);
    });
    sheetEl.appendChild(footer);
  }

  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";

  requestAnimationFrame(() => {
    backdrop.classList.add("is-open");
    sheetEl.classList.add("is-open");
  });

  function close() {
    if (activeSheet !== api) return;
    backdrop.classList.remove("is-open");
    sheetEl.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => backdrop.remove(), 260);
    document.removeEventListener("keydown", onKeydown);
    if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    activeSheet = null;
    onDismiss?.();
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector("[data-sheet-close]").addEventListener("click", close);

  function onKeydown(e) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "Tab") trapFocus(e, sheetEl);
  }
  document.addEventListener("keydown", onKeydown);

  setupDragToDismiss(sheetEl, backdrop.querySelector(".sheet-drag-zone"), close);

  // Focus the first useful field for keyboard/screen-reader users — prefer
  // a text input over a button so data entry can start immediately.
  requestAnimationFrame(() => {
    const field = sheetEl.querySelector("input, textarea, select");
    const fallback = sheetEl.querySelector("button:not([data-sheet-close])") || sheetEl.querySelector("[data-sheet-close]");
    (field || fallback)?.focus({ preventScroll: true });
  });

  const api = { close, body, element: sheetEl };
  activeSheet = api;
  return api;
}

export function closeSheet() {
  activeSheet?.close();
}

function trapFocus(e, container) {
  const focusables = qsFocusable(container);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function qsFocusable(container) {
  return Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((elm) => !elm.disabled && elm.offsetParent !== null);
}

function setupDragToDismiss(sheetEl, dragZone, close) {
  let startY = 0;
  let currentY = 0;
  let dragging = false;

  dragZone.addEventListener("pointerdown", (e) => {
    if (e.target.closest("[data-sheet-close]")) return; // let the close button handle its own click
    dragging = true;
    startY = e.clientY;
    sheetEl.classList.add("is-dragging");
    dragZone.setPointerCapture(e.pointerId);
  });

  dragZone.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    currentY = Math.max(0, e.clientY - startY);
    sheetEl.style.transform = `translateY(${currentY}px)`;
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    sheetEl.classList.remove("is-dragging");
    sheetEl.style.transform = "";
    if (currentY > 110) {
      close();
    }
    currentY = 0;
  }

  dragZone.addEventListener("pointerup", endDrag);
  dragZone.addEventListener("pointercancel", endDrag);
}

/** Promise-based confirmation dialog, replacing window.confirm(). */
export function confirmDialog({ title = "Are you sure?", message, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    openSheet({
      title,
      content: `<p style="color:var(--color-text-secondary)">${message}</p>`,
      small: true,
      onDismiss: () => settle(false),
      actions: [
        {
          label: "Cancel",
          variant: "secondary",
          onClick: (closeFn) => {
            settle(false);
            closeFn();
          },
        },
        {
          label: confirmLabel,
          variant: danger ? "danger" : "primary",
          onClick: (closeFn) => {
            settle(true);
            closeFn();
          },
        },
      ],
    });
  });
}
