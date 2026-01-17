// main.js - Application Entry Point
import { state, updateCategoriesSet } from "./state.js";
import {
  loadFromStorage,
  exportJSON,
  exportCSV,
  saveToStorage,
} from "./storage.js";
import {
  applyDarkMode,
  toggleDarkMode,
  switchTab,
  updateFilterCategories,
} from "./ui.js";
import { renderDashboard, changeMonth } from "./dashboard.js";
import { renderTransactions, filterTransactions } from "./transactions.js";
import { renderBudgets } from "./budgets.js";
import {
  openTransactionModal,
  openBudgetModal,
  openSettings,
  closeModal,
  editTransaction,
  handleDeleteTransaction,
  editBudget,
  handleDeleteBudget,
  handleResetData,
  applyTheme,
} from "./modal.js";
import { setupMobileNavigation, setupMobileActions } from "./navigation.js";
import { initPieChartToggle, initTrendChartToggle } from "./charts.js";

function initApp() {
  loadFromStorage();
  applyTheme(state.theme); // Apply saved theme
  applyDarkMode();
  setupEventListeners();
  setupMobileNavigation();
  setupMobileActions(() => {
    // Only toggle dark mode if using default theme
    if (state.theme === "default") {
      toggleDarkMode();
      if (state.currentTab === "dashboard") {
        renderDashboard();
      }
    }
  }, openSettings);
  updateCategoriesSet();
  renderDashboard();
  renderTransactions();
  renderBudgets();
  updateFilterCategories();
  // Initialize chart type toggle buttons
  initPieChartToggle();
  initTrendChartToggle();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function setupEventListeners() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = switchTab(btn.dataset.tab);
      if (tabName === "dashboard") {
        renderDashboard();
      } else if (tabName === "transactions") {
        renderTransactions();
      } else if (tabName === "budgets") {
        renderBudgets();
      }
    });
  });

  document.getElementById("darkModeToggle").addEventListener("click", () => {
    // Only allow dark mode toggle if using default theme
    if (state.theme === "default") {
      state.darkMode = !state.darkMode;
      document.body.setAttribute(
        "data-theme",
        state.darkMode ? "dark" : "light"
      );
      const icon = document.querySelector("#darkModeToggle i");
      icon.className = state.darkMode ? "ri-sun-line" : "ri-moon-line";
      saveToStorage();
      if (state.currentTab === "dashboard") {
        renderDashboard();
      }
    }
  });

  document
    .getElementById("settingsBtn")
    .addEventListener("click", openSettings);
  document
    .getElementById("prevMonth")
    .addEventListener("click", () => changeMonth(-1));
  document
    .getElementById("nextMonth")
    .addEventListener("click", () => changeMonth(1));
  document
    .getElementById("addTransactionBtn")
    .addEventListener("click", () => openTransactionModal());
  document
    .getElementById("addBudgetBtn")
    .addEventListener("click", () => openBudgetModal());
  document
    .getElementById("searchTransactions")
    .addEventListener("input", filterTransactions);
  document
    .getElementById("filterType")
    .addEventListener("change", filterTransactions);
  document
    .getElementById("filterCategory")
    .addEventListener("change", filterTransactions);
  document.querySelector(".close-modal").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });
}

// Export public API
window.budgetApp = {
  openTransactionModal,
  editTransaction,
  deleteTransaction: handleDeleteTransaction,
  openBudgetModal,
  editBudget,
  deleteBudget: handleDeleteBudget,
  exportJSON,
  exportCSV,
  resetData: handleResetData,
  closeModal,
  applyTheme,
};

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
