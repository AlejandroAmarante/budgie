// modal.js - Modal Management Module
import { state, updateCategoriesSet } from "./state.js";
import {
  importJSON,
  resetData,
  exportJSON,
  exportCSV,
  saveToStorage,
} from "./storage.js";
import { escapeHtml, updateFilterCategories } from "./ui.js";
import {
  saveTransaction,
  getTransaction,
  deleteTransaction,
  renderTransactions,
} from "./transactions.js";
import {
  saveBudget,
  getBudget,
  deleteBudget,
  saveOverallBudget,
  renderBudgets,
} from "./budgets.js";
import { renderDashboard } from "./dashboard.js";

// Common icon options for budgets
const BUDGET_ICONS = [
  "ri-arrow-up-circle-line",
  "ri-arrow-down-circle-line",
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
  "ri-folder-line",
];

export function openModal() {
  document.getElementById("modal").classList.add("active");
}

export function closeModal() {
  document.getElementById("modal").classList.remove("active");
}

export function openTransactionModal(transactionId = null) {
  const transaction = transactionId ? getTransaction(transactionId) : null;
  const isEdit = !!transaction;

  document.getElementById("modalTitle").textContent = isEdit
    ? "Edit Transaction"
    : "Add Transaction";

  const budgets = state.budgets.sort((a, b) =>
    a.category.localeCompare(b.category)
  );
  const budgetOptions = budgets
    .map(
      (budget) => `
        <div class="budget-option" data-category="${escapeHtml(
          budget.category
        )}" data-icon="${budget.icon}">
          <i class="${budget.icon}"></i>
          <span>${escapeHtml(budget.category)}</span>
        </div>
      `
    )
    .join("");

  // Determine initial icon
  let selectedIcon = "ri-folder-line";
  if (isEdit && transaction.icon) {
    selectedIcon = transaction.icon;
  } else if (isEdit) {
    const budget = state.budgets.find(
      (b) => b.category === transaction.category
    );
    selectedIcon = budget?.icon || "ri-folder-line";
  }

  const iconGrid = BUDGET_ICONS.map(
    (icon) => `
    <div class="icon-option ${
      icon === selectedIcon ? "selected" : ""
    }" data-icon="${icon}">
      <i class="${icon}"></i>
    </div>
  `
  ).join("");

  document.getElementById("modalBody").innerHTML = `
    <form id="transactionForm">
      <div class="form-group">
        <label for="txAmount">Amount *</label>
        <input type="number" id="txAmount" class="input" step="0.01" min="0" required 
               value="${isEdit ? transaction.amount : ""}">
      </div>
      <div class="form-group">
        <label for="txType">Type *</label>
        <select id="txType" class="input" required>
          <option value="income" ${
            isEdit && transaction.type === "income" ? "selected" : ""
          }>Income</option>
          <option value="expense" ${
            isEdit && transaction.type === "expense" ? "selected" : ""
          }>Expense</option>
        </select>
      </div>
      <div class="form-group">
        <label for="txCategory">Category *</label>
        <div class="category-input-wrapper">
          <input type="text" id="txCategory" class="input" required autocomplete="off"
                 value="${isEdit ? escapeHtml(transaction.category) : ""}"
                 placeholder="Select a budget or type new category">
          <div id="budgetDropdown" class="budget-dropdown" style="display: none;">
            ${
              budgetOptions ||
              '<div class="budget-option-empty">No budgets created yet</div>'
            }
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>Icon (optional)</label>
        <input type="hidden" id="txIcon" value="${selectedIcon}">
        <div class="icon-grid">
          ${iconGrid}
        </div>
      </div>
      <div class="form-group">
        <label for="txDate">Date *</label>
        <input type="date" id="txDate" class="input" required
               value="${
                 isEdit
                   ? transaction.date
                   : new Date().toISOString().split("T")[0]
               }">
      </div>
      <div class="form-group">
        <label for="txNotes">Notes</label>
        <textarea id="txNotes" class="input">${
          isEdit ? escapeHtml(transaction.notes || "") : ""
        }</textarea>
      </div>
      <div class="form-group">
        <div class="checkbox-group">
          <input type="checkbox" id="txRecurring" ${
            isEdit && transaction.recurring ? "checked" : ""
          }>
          <label for="txRecurring">Recurring (monthly)</label>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">
          <i class="ri-save-line"></i> ${isEdit ? "Update" : "Add"}
        </button>
      </div>
    </form>
  `;

  // Setup icon selection
  const iconOptions = document.querySelectorAll(".icon-option");
  const iconInput = document.getElementById("txIcon");

  iconOptions.forEach((option) => {
    option.addEventListener("click", () => {
      iconOptions.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
      const newIcon = option.dataset.icon;
      iconInput.value = newIcon;

      // Update budget icon if category matches a budget
      const category = categoryInput.value.trim();
      const budget = state.budgets.find((b) => b.category === category);
      if (budget) {
        budget.icon = newIcon;
        saveToStorage();
      }
    });
  });

  // Setup category input dropdown behavior
  const categoryInput = document.getElementById("txCategory");
  const dropdown = document.getElementById("budgetDropdown");
  const budgetOptionEls = dropdown.querySelectorAll(".budget-option");

  categoryInput.addEventListener("focus", () => {
    if (budgetOptionEls.length > 0) {
      dropdown.style.display = "block";
      filterBudgetOptions("");
    }
  });

  categoryInput.addEventListener("input", (e) => {
    const value = e.target.value.toLowerCase();
    filterBudgetOptions(value);
    if (budgetOptionEls.length > 0) {
      dropdown.style.display = "block";
    }
  });

  categoryInput.addEventListener("blur", (e) => {
    // Delay to allow click on dropdown
    setTimeout(() => {
      dropdown.style.display = "none";
    }, 200);
  });

  budgetOptionEls.forEach((option) => {
    option.addEventListener("click", () => {
      const category = option.dataset.category;
      const icon = option.dataset.icon;
      categoryInput.value = category;
      dropdown.style.display = "none";

      // Update icon selection to match budget
      iconInput.value = icon;
      iconOptions.forEach((opt) => {
        if (opt.dataset.icon === icon) {
          iconOptions.forEach((o) => o.classList.remove("selected"));
          opt.classList.add("selected");
        }
      });
    });
  });

  function filterBudgetOptions(searchTerm) {
    budgetOptionEls.forEach((option) => {
      const category = option.dataset.category.toLowerCase();
      if (category.includes(searchTerm)) {
        option.style.display = "flex";
      } else {
        option.style.display = "none";
      }
    });
  }

  document.getElementById("transactionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleTransactionSubmit(transactionId);
  });

  openModal();
}

function handleTransactionSubmit(transactionId) {
  const amount = parseFloat(document.getElementById("txAmount").value);
  const type = document.getElementById("txType").value;
  const category = document.getElementById("txCategory").value.trim();
  const date = document.getElementById("txDate").value;
  const notes = document.getElementById("txNotes").value.trim();
  const recurring = document.getElementById("txRecurring").checked;
  const icon = document.getElementById("txIcon").value;

  const success = saveTransaction(transactionId, {
    amount,
    type,
    category,
    date,
    notes,
    recurring,
    icon,
  });

  if (success) {
    closeModal();
    if (state.currentTab === "dashboard") {
      renderDashboard();
    } else if (state.currentTab === "transactions") {
      renderTransactions();
    }
  }
}

export function openBudgetModal(budgetId = null) {
  const budget = budgetId ? getBudget(budgetId) : null;
  const isEdit = !!budget;

  document.getElementById("modalTitle").textContent = isEdit
    ? "Edit Budget"
    : "Add Budget";

  const categories = Array.from(state.categories).sort();
  const categoryOptions = categories
    .map(
      (cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
    )
    .join("");

  const selectedIcon = budget?.icon || "ri-folder-line";

  const iconGrid = BUDGET_ICONS.map(
    (icon) => `
    <div class="icon-option ${
      icon === selectedIcon ? "selected" : ""
    }" data-icon="${icon}">
      <i class="${icon}"></i>
    </div>
  `
  ).join("");

  document.getElementById("modalBody").innerHTML = `
    <form id="budgetForm">
      <div class="form-group">
        <label for="budgetCategory">Category *</label>
        <input type="text" id="budgetCategory" class="input" list="budgetCategoryList" required
               value="${isEdit ? escapeHtml(budget.category) : ""}">
        <datalist id="budgetCategoryList">
          ${categoryOptions}
        </datalist>
      </div>
      <div class="form-group">
        <label for="budgetAmount">Monthly Budget Amount *</label>
        <input type="number" id="budgetAmount" class="input" step="0.01" min="0" required
               value="${isEdit ? budget.amount : ""}">
      </div>
      <div class="form-group">
        <label>Icon *</label>
        <input type="hidden" id="budgetIcon" value="${selectedIcon}">
        <div class="icon-grid">
          ${iconGrid}
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">
          <i class="ri-save-line"></i> ${isEdit ? "Update" : "Add"}
        </button>
      </div>
    </form>
  `;

  // Setup icon selection
  const iconOptions = document.querySelectorAll(".icon-option");
  const iconInput = document.getElementById("budgetIcon");

  iconOptions.forEach((option) => {
    option.addEventListener("click", () => {
      iconOptions.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
      iconInput.value = option.dataset.icon;
    });
  });

  document.getElementById("budgetForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleBudgetSubmit(budgetId);
  });

  openModal();
}

function handleBudgetSubmit(budgetId) {
  const category = document.getElementById("budgetCategory").value.trim();
  const amount = parseFloat(document.getElementById("budgetAmount").value);
  const icon = document.getElementById("budgetIcon").value;

  const success = saveBudget(budgetId, { category, amount, icon });

  if (success) {
    // Update all transactions with this category to use the new icon
    state.transactions.forEach((t) => {
      if (t.category === category) {
        delete t.icon; // Remove transaction-specific icon so it inherits from budget
      }
    });
    saveToStorage();

    closeModal();
    if (state.currentTab === "dashboard") {
      renderDashboard();
    } else if (state.currentTab === "budgets") {
      renderBudgets();
    }
  }
}

export function openSettings() {
  document.getElementById("modalTitle").textContent = "Settings";
  document.getElementById("modalBody").innerHTML = `
    <div class="settings-section">
      <h4><i class="ri-download-line"></i> Import Data</h4>
      <div class="settings-actions">
        <input type="file" id="importFile" accept=".json" style="display: none;">
        <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">
          <i class="ri-upload-line"></i> Import from JSON
        </button>
      </div>
    </div>
    <div class="settings-section">
      <h4><i class="ri-upload-line"></i> Export Data</h4>
      <div class="settings-actions">
        <button class="btn btn-secondary" onclick="window.budgetApp.exportJSON()">
          <i class="ri-file-download-line"></i> Export as JSON
        </button>
        <button class="btn btn-secondary" onclick="window.budgetApp.exportCSV()">
          <i class="ri-file-download-line"></i> Export as CSV
        </button>
      </div>
    </div>
    <div class="settings-section">
      <h4><i class="ri-delete-bin-line"></i> Reset Data</h4>
      <div class="settings-actions">
        <button class="btn btn-danger" onclick="window.budgetApp.resetData()">
          <i class="ri-delete-bin-line"></i> Reset All Data
        </button>
      </div>
    </div>
  `;

  document
    .getElementById("importFile")
    .addEventListener("change", handleImport);
  openModal();
}

async function handleImport() {
  const file = document.getElementById("importFile").files[0];
  if (!file) return;

  try {
    await importJSON(file);
    updateCategoriesSet();
    updateFilterCategories();
    closeModal();

    renderDashboard();
    renderTransactions();
    renderBudgets();

    alert("Data imported successfully!");
  } catch (error) {
    alert("Failed to import data. Please check the file format.");
    console.error("Import error:", error);
  }
}

export function handleResetData() {
  if (
    !confirm(
      "Are you sure you want to reset all data? This action cannot be undone."
    )
  ) {
    return;
  }

  resetData();
  updateFilterCategories();
  closeModal();

  renderDashboard();
  renderTransactions();
  renderBudgets();
}

export function handleSaveOverallBudget() {
  const value = document.getElementById("overallBudget").value;
  const success = saveOverallBudget(value);

  if (success) {
    if (state.currentTab === "dashboard") {
      renderDashboard();
    } else if (state.currentTab === "budgets") {
      renderBudgets();
    }
  }
}

// Public API functions
export function editTransaction(id) {
  openTransactionModal(id);
}

export function handleDeleteTransaction(id) {
  const success = deleteTransaction(id);
  if (success) {
    if (state.currentTab === "dashboard") {
      renderDashboard();
    } else if (state.currentTab === "transactions") {
      renderTransactions();
    }
  }
}

export function editBudget(id) {
  openBudgetModal(id);
}

export function handleDeleteBudget(id) {
  const success = deleteBudget(id);
  if (success) {
    if (state.currentTab === "dashboard") {
      renderDashboard();
    } else if (state.currentTab === "budgets") {
      renderBudgets();
    }
  }
}
