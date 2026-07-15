// app.js — application entry point. Loads data, wires up every event
// listener via delegation (no inline onclick handlers anywhere in the
// markup), and re-renders the active view whenever state changes.

import { state, subscribe, updateCategoriesSet } from "./state.js";
import { loadFromStorage } from "./storage.js";
import { on, debounce } from "./utils.js";
import { switchView } from "./nav.js";
import { applyAppearance, openSettingsSheet } from "./settings.js";
import { renderDashboard, stepDashboardPeriod } from "./dashboard.js";
import { openPeriodPicker } from "./period.js";
import { initCategoryChartToggle, initTrendChartToggle } from "./charts.js";
import {
  renderTransactionList,
  openTransactionForm,
  handleDeleteTransaction,
  setSearchFilter,
  openFilterSheet,
} from "./transactions.js";
import {
  renderBudgets,
  openBudgetForm,
  handleDeleteBudget,
} from "./budgets.js";

const viewRenderers = {
  dashboard: renderDashboard,
  transactions: renderTransactionList,
  budgets: renderBudgets,
};

/** Re-render whichever view is currently visible. Called after any data change. */
export function renderApp() {
  const renderer = viewRenderers[state.currentView];
  if (renderer) renderer();
}

function init() {
  loadFromStorage();
  applyAppearance();
  updateCategoriesSet();
  switchView(state.currentView);

  subscribe(renderApp);

  setupNav();
  setupSettings();
  setupDashboard();
  setupTransactions();
  setupBudgets();
  setupActionDelegation();

  renderDashboard();
  renderTransactionList();
  renderBudgets();
  initCategoryChartToggle();
  initTrendChartToggle();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function setupNav() {
  on(
    document.getElementById("appNav"),
    "click",
    ".nav-item[data-view]",
    (e, target) => {
      const view = switchView(target.dataset.view);
      viewRenderers[view]?.();
    },
  );

  document
    .getElementById("quickAddBtn")
    .addEventListener("click", () => openTransactionForm());
}

function setupSettings() {
  document
    .getElementById("settingsNavBtn")
    ?.addEventListener("click", openSettingsSheet);
}

function setupDashboard() {
  document
    .getElementById("prevMonthBtn")
    .addEventListener("click", () => stepDashboardPeriod(-1));
  document
    .getElementById("nextMonthBtn")
    .addEventListener("click", () => stepDashboardPeriod(1));
  document
    .getElementById("periodTriggerBtn")
    .addEventListener("click", openPeriodPicker);

  // Simple horizontal swipe to step the period, mirroring the arrow buttons.
  const switcher = document.getElementById("monthSwitcher");
  let startX = null;
  switcher.addEventListener("pointerdown", (e) => (startX = e.clientX));
  switcher.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const delta = e.clientX - startX;
    if (Math.abs(delta) > 60) stepDashboardPeriod(delta > 0 ? -1 : 1);
    startX = null;
  });
}

function setupTransactions() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener(
    "input",
    debounce((e) => setSearchFilter(e.target.value), 150),
  );

  document
    .getElementById("filterTrigger")
    .addEventListener("click", openFilterSheet);
  document
    .getElementById("addTransactionBtn")
    .addEventListener("click", () => openTransactionForm());
}

function setupBudgets() {
  document
    .getElementById("addBudgetBtn")
    .addEventListener("click", () => openBudgetForm());
}

/** Every button that acts on a specific record uses a data-action attribute
 *  instead of an inline handler, so all of them are handled here in one place. */
function setupActionDelegation() {
  on(document.body, "click", "[data-action]", (e, target) => {
    const { action, id } = target.dataset;
    switch (action) {
      case "add-transaction":
        openTransactionForm();
        break;
      case "edit-transaction":
        openTransactionForm(id);
        break;
      case "delete-transaction":
        handleDeleteTransaction(id);
        break;
      case "add-budget":
        openBudgetForm();
        break;
      case "edit-budget":
        openBudgetForm(id);
        break;
      case "delete-budget":
        handleDeleteBudget(id);
        break;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
