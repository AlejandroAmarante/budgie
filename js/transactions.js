// transactions.js - Transaction Management Module
import { state, updateCategoriesSet, generateId } from "./state.js";
import { saveToStorage } from "./storage.js";
import { formatCurrency, escapeHtml, updateFilterCategories } from "./ui.js";
import { getBudgetByCategory } from "./budgets.js";

export function renderTransactions() {
  filterTransactions();
}

export function filterTransactions() {
  const search = document
    .getElementById("searchTransactions")
    .value.toLowerCase();
  const typeFilter = document.getElementById("filterType").value;
  const categoryFilter = document.getElementById("filterCategory").value;

  let filtered = state.transactions.filter((t) => {
    const matchesSearch =
      !search ||
      t.category.toLowerCase().includes(search) ||
      (t.notes && t.notes.toLowerCase().includes(search));
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const matchesCategory =
      categoryFilter === "all" || t.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  // Sort: recurring first, then by date descending
  filtered.sort((a, b) => {
    if (a.recurring && !b.recurring) return -1;
    if (!a.recurring && b.recurring) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  const container = document.getElementById("transactionsList");

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="ri-inbox-line"></i>
        <p>No transactions found</p>
        <button class="btn btn-primary" onclick="window.budgetApp.openTransactionModal()">
          <i class="ri-add-line"></i> Add Transaction
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((t) => {
      // Always use budget icon if category matches, ignore transaction-specific icon
      const budget = getBudgetByCategory(t.category);
      let icon;
      if (budget?.icon) {
        icon = budget.icon;
      } else {
        icon =
          t.type === "income"
            ? "ri-arrow-up-circle-line"
            : "ri-arrow-down-circle-line";
      }

      return `
      <div class="transaction-item ${t.type}">
        <div class="transaction-icon">
          <i class="${icon}"></i>
        </div>
        <div class="transaction-details">
          <div class="transaction-category">
            ${escapeHtml(t.category)}
            ${
              t.recurring
                ? '<span class="transaction-recurring"><i class="ri-repeat-line"></i> Recurring</span>'
                : ""
            }
          </div>
          <div class="transaction-meta">
            ${new Date(t.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          ${
            t.notes
              ? `<div class="transaction-notes">${escapeHtml(t.notes)}</div>`
              : ""
          }
        </div>
        <div class="transaction-amount">
          ${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)}
        </div>
        <div class="transaction-actions">
          <button class="icon-btn" onclick="window.budgetApp.editTransaction('${
            t.id
          }')" title="Edit">
            <i class="ri-edit-line"></i>
          </button>
          <button class="icon-btn" onclick="window.budgetApp.deleteTransaction('${
            t.id
          }')" title="Delete">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

export function saveTransaction(transactionId, formData) {
  const { amount, type, category, date, notes, recurring, icon } = formData;

  if (!amount || amount <= 0 || !type || !category || !date) {
    alert("Please fill in all required fields");
    return false;
  }

  if (transactionId) {
    const index = state.transactions.findIndex((t) => t.id === transactionId);
    if (index !== -1) {
      state.transactions[index] = {
        ...state.transactions[index],
        amount,
        type,
        category,
        date,
        notes,
        recurring,
        icon: icon || undefined,
      };
    }
  } else {
    state.transactions.push({
      id: generateId(),
      amount,
      type,
      category,
      date,
      notes,
      recurring,
      icon: icon || undefined,
    });
  }

  saveToStorage();
  updateCategoriesSet();
  updateFilterCategories();
  return true;
}

export function deleteTransaction(id) {
  if (!confirm("Are you sure you want to delete this transaction?")) {
    return false;
  }

  state.transactions = state.transactions.filter((t) => t.id !== id);
  saveToStorage();
  updateCategoriesSet();
  updateFilterCategories();
  return true;
}

export function getTransaction(id) {
  return state.transactions.find((t) => t.id === id);
}
