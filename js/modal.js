// modal.js - Modal Management Module
import { state, updateCategoriesSet } from "./state.js";
import { importJSON, resetData, exportJSON, exportCSV } from "./storage.js";
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

  const categories = Array.from(state.categories).sort();
  const categoryOptions = categories
    .map(
      (cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
    )
    .join("");

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
        <input type="text" id="txCategory" class="input" list="categoryList" required
               value="${isEdit ? escapeHtml(transaction.category) : ""}">
        <datalist id="categoryList">
          ${categoryOptions}
        </datalist>
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

  const success = saveTransaction(transactionId, {
    amount,
    type,
    category,
    date,
    notes,
    recurring,
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
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">
          <i class="ri-save-line"></i> ${isEdit ? "Update" : "Add"}
        </button>
      </div>
    </form>
  `;

  document.getElementById("budgetForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleBudgetSubmit(budgetId);
  });

  openModal();
}

function handleBudgetSubmit(budgetId) {
  const category = document.getElementById("budgetCategory").value.trim();
  const amount = parseFloat(document.getElementById("budgetAmount").value);

  const success = saveBudget(budgetId, { category, amount });

  if (success) {
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
