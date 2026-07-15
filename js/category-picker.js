// category-picker.js — a tappable chip list of existing budget categories
// plus a "New category" chip that reveals a text field. Used by both the
// transaction and budget forms so category selection behaves identically
// everywhere in the app.

import { state } from "./state.js";
import { escapeHtml } from "./utils.js";
import { DEFAULT_ICON } from "./icons.js";

/**
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {string} opts.selectedCategory
 * @param {Function} opts.onSelect - (category:string, icon:string|null) => void
 *        icon is provided only when an existing budget category was tapped.
 */
export function mountCategoryPicker(container, { selectedCategory = "", onSelect }) {
  const categories = state.budgets
    .map((b) => ({ category: b.category, icon: b.icon || DEFAULT_ICON }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const isCustom = selectedCategory && !categories.some((c) => c.category === selectedCategory);

  container.innerHTML = `
    <div class="chip-row" data-role="chip-row">
      ${categories
        .map(
          (c) => `
        <button type="button" class="chip${c.category === selectedCategory ? " is-selected" : ""}"
                data-category="${escapeHtml(c.category)}" data-icon="${c.icon}">
          <i class="${c.icon}" aria-hidden="true"></i>${escapeHtml(c.category)}
        </button>`
        )
        .join("")}
      <button type="button" class="chip chip-dashed" data-role="new-category">
        <i class="ri-add-line" aria-hidden="true"></i>New
      </button>
    </div>
    <input type="text" class="input" data-role="category-input" name="category"
           placeholder="Category name" autocomplete="off" required
           style="margin-top: var(--space-3); ${isCustom || categories.length === 0 ? "" : "display:none;"}"
           value="${escapeHtml(isCustom ? selectedCategory : "")}">
  `;

  const input = container.querySelector('[data-role="category-input"]');
  const chipRow = container.querySelector('[data-role="chip-row"]');

  chipRow.addEventListener("click", (e) => {
    const newBtn = e.target.closest('[data-role="new-category"]');
    const chip = e.target.closest(".chip:not([data-role])");

    if (newBtn) {
      chipRow.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-selected"));
      input.style.display = "";
      input.value = "";
      input.focus();
      onSelect("", null);
      return;
    }

    if (chip) {
      chipRow.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-selected"));
      chip.classList.add("is-selected");
      input.style.display = "none";
      input.value = chip.dataset.category;
      onSelect(chip.dataset.category, chip.dataset.icon);
    }
  });

  input.addEventListener("input", () => onSelect(input.value.trim(), null));

  return {
    getValue: () => input.value.trim() || chipRow.querySelector(".chip.is-selected")?.dataset.category || "",
  };
}
