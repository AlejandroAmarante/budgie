// settings.js — the settings sheet: appearance (dark mode + color theme),
// data import/export, and reset.

import { state, notify, updateCategoriesSet } from "./state.js";
import { saveToStorage, exportJSON, exportCSV, importJSON, resetData } from "./storage.js";
import { openSheet, confirmDialog } from "./sheet.js";
import { toast } from "./toast.js";

const THEMES = [
  { id: "default", label: "Budgie", color: "#2fae60" },
  { id: "pink", label: "Pink", color: "#e0508b" },
  { id: "ocean", label: "Ocean", color: "#0f8bc7" },
  { id: "forest", label: "Forest", color: "#1f9d51" },
  { id: "sunset", label: "Sunset", color: "#e2650f" },
];

export function applyAppearance() {
  document.documentElement.setAttribute("data-theme", state.theme);
  document.documentElement.setAttribute("data-color-scheme", state.darkMode ? "dark" : "light");
}

export function openSettingsSheet() {
  const content = document.createElement("div");
  content.innerHTML = `
    <div class="settings-group">
      <div class="settings-group-title">Appearance</div>
      <button type="button" class="settings-row" id="darkModeRow" ${state.theme !== "default" ? "disabled" : ""}>
        <i class="ri-moon-line" aria-hidden="true"></i>
        <span class="settings-row-label">Dark mode</span>
        <span class="switch${state.darkMode ? " is-on" : ""}" id="darkModeSwitch" role="switch" aria-checked="${state.darkMode}"></span>
      </button>
      <div class="theme-grid" id="themeGrid" style="margin-top:var(--space-4)">
        ${THEMES.map(
          (t) => `
          <button type="button" class="theme-swatch${state.theme === t.id ? " is-selected" : ""}" data-theme-id="${t.id}" aria-label="${t.label} theme">
            <span class="theme-swatch-circle" style="background:${t.color}"><i class="ri-check-line" aria-hidden="true"></i></span>
            <span>${t.label}</span>
          </button>`
        ).join("")}
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">Your data</div>
      <button type="button" class="settings-row" id="exportJsonBtn">
        <i class="ri-file-download-line" aria-hidden="true"></i>
        <span class="settings-row-label">Export as JSON</span>
        <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
      </button>
      <button type="button" class="settings-row" id="exportCsvBtn">
        <i class="ri-file-download-line" aria-hidden="true"></i>
        <span class="settings-row-label">Export as CSV</span>
        <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
      </button>
      <button type="button" class="settings-row" id="importBtn">
        <i class="ri-file-upload-line" aria-hidden="true"></i>
        <span class="settings-row-label">Import from JSON</span>
        <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
      </button>
      <input type="file" id="importFileInput" accept=".json" class="visually-hidden">
    </div>

    <div class="settings-group">
      <div class="settings-group-title">Danger zone</div>
      <button type="button" class="settings-row is-danger" id="resetDataBtn">
        <i class="ri-delete-bin-line" aria-hidden="true"></i>
        <span class="settings-row-label">Reset all data</span>
      </button>
    </div>
  `;

  const { close, body } = openSheet({ title: "Settings", content });

  const darkModeRow = body.querySelector("#darkModeRow");
  darkModeRow.addEventListener("click", () => {
    if (state.theme !== "default") return;
    state.darkMode = !state.darkMode;
    body.querySelector("#darkModeSwitch").classList.toggle("is-on", state.darkMode);
    body.querySelector("#darkModeSwitch").setAttribute("aria-checked", state.darkMode);
    applyAppearance();
    saveToStorage();
    notify();
  });

  body.querySelectorAll("#themeGrid .theme-swatch").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.theme = btn.dataset.themeId;
      applyAppearance();
      saveToStorage();
      body.querySelectorAll("#themeGrid .theme-swatch").forEach((b) => b.classList.toggle("is-selected", b === btn));
      darkModeRow.disabled = state.theme !== "default";
      notify();
    });
  });

  body.querySelector("#exportJsonBtn").addEventListener("click", () => {
    exportJSON();
    toast("Exported as JSON");
  });
  body.querySelector("#exportCsvBtn").addEventListener("click", () => {
    exportCSV();
    toast("Exported as CSV");
  });

  const fileInput = body.querySelector("#importFileInput");
  body.querySelector("#importBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      await importJSON(file);
      updateCategoriesSet();
      notify();
      close();
      toast("Data imported successfully");
    } catch (err) {
      console.error("Import error:", err);
      toast("Couldn't import that file — check the format and try again", { icon: "ri-error-warning-line" });
    }
  });

  body.querySelector("#resetDataBtn").addEventListener("click", async () => {
    const confirmed = await confirmDialog({
      title: "Reset all data?",
      message: "Every transaction and budget will be permanently deleted. This can't be undone.",
      confirmLabel: "Reset everything",
      danger: true,
    });
    if (!confirmed) return;
    resetData();
    notify();
    close();
    toast("All data has been reset");
  });
}
