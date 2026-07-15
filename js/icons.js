// icons.js — the catalog of category icons, plus a small reusable picker
// component used by both the transaction and budget forms.

export const CATEGORY_ICONS = [
  "ri-shopping-cart-line",
  "ri-restaurant-line",
  "ri-car-line",
  "ri-home-line",
  "ri-shirt-line",
  "ri-hospital-line",
  "ri-graduation-cap-line",
  "ri-flight-takeoff-line",
  "ri-movie-line",
  "ri-gamepad-line",
  "ri-wallet-line",
  "ri-gift-line",
  "ri-heart-pulse-line",
  "ri-phone-line",
  "ri-lightbulb-line",
  "ri-gas-station-line",
  "ri-tools-line",
  "ri-paint-brush-line",
  "ri-music-line",
  "ri-book-line",
  "ri-boxing-line",
  "ri-plane-line",
  "ri-parent-line",
  "ri-paw-print-line",
  "ri-bank-card-line",
  "ri-cup-line",
  "ri-folder-line",
];

export const DEFAULT_ICON = "ri-folder-line";

/**
 * Renders an icon grid into `container` and wires up selection.
 * Calls `onChange(icon)` whenever the user taps a new icon.
 */
export function mountIconPicker(container, selectedIcon, onChange) {
  container.innerHTML = CATEGORY_ICONS.map(
    (icon) => `
      <button type="button" class="icon-option${icon === selectedIcon ? " is-selected" : ""}"
              data-icon="${icon}" aria-label="${iconLabel(icon)}" aria-pressed="${icon === selectedIcon}">
        <i class="${icon}" aria-hidden="true"></i>
      </button>`
  ).join("");

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".icon-option");
    if (!btn) return;
    container.querySelectorAll(".icon-option").forEach((opt) => {
      opt.classList.toggle("is-selected", opt === btn);
      opt.setAttribute("aria-pressed", opt === btn ? "true" : "false");
    });
    onChange(btn.dataset.icon);
  });
}

function iconLabel(icon) {
  return icon.replace("ri-", "").replace(/-line|-fill/g, "").replace(/-/g, " ");
}
