// budgets.js - Budget Management Module
import {
  state,
  updateCategoriesSet,
  generateId,
  getTransactionsForMonth,
  calculateOverallBudget,
} from "./state.js";
import { saveToStorage } from "./storage.js";
import { formatCurrency, escapeHtml, updateFilterCategories } from "./ui.js";

export function renderBudgets() {
  const monthTransactions = getTransactionsForMonth(state.currentMonth);
  const expenses = monthTransactions.filter((t) => t.type === "expense");

  const categoryExpenses = {};
  expenses.forEach((t) => {
    categoryExpenses[t.category] =
      (categoryExpenses[t.category] || 0) + t.amount;
  });

  // Update overall budget display
  const overallBudget = calculateOverallBudget();
  const overallBudgetDisplay = document.getElementById("overallBudgetDisplay");
  overallBudgetDisplay.textContent = formatCurrency(overallBudget);

  const container = document.getElementById("budgetsList");

  if (state.budgets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="ri-pie-chart-line"></i>
        <p>No budgets set</p>
        <button class="btn btn-primary" onclick="window.budgetApp.openBudgetModal()">
          <i class="ri-add-line"></i> Add Budget
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = state.budgets
    .map((budget) => {
      const spent = categoryExpenses[budget.category] || 0;
      const remaining = budget.amount - spent;
      const percentage = Math.min((spent / budget.amount) * 100, 100);
      const progressClass =
        percentage >= 100 ? "danger" : percentage >= 80 ? "warning" : "";

      return `
        <div class="budget-item">
          <div class="budget-header">
            <div class="budget-title">
              <i class="${budget.icon || "ri-folder-line"}"></i>
              ${escapeHtml(budget.category)}
            </div>
            <div class="budget-amount">${formatCurrency(budget.amount)}</div>
          </div>
          <div class="budget-progress">
            <div class="progress-bar">
              <div class="progress-fill ${progressClass}" style="width: ${percentage}%"></div>
            </div>
            <div class="budget-stats">
              <span class="budget-spent">Spent: ${formatCurrency(
                spent
              )} (${percentage.toFixed(1)}%)</span>
              <span class="budget-remaining ${
                remaining >= 0 ? "positive" : "negative"
              }">
                ${remaining >= 0 ? "Remaining" : "Over"}: ${formatCurrency(
        Math.abs(remaining)
      )}
              </span>
            </div>
          </div>
          <div class="budget-actions">
            <button class="btn btn-secondary" onclick="window.budgetApp.editBudget('${
              budget.id
            }')">
              <i class="ri-edit-line"></i> Edit
            </button>
            <button class="btn btn-danger" onclick="window.budgetApp.deleteBudget('${
              budget.id
            }')">
              <i class="ri-delete-bin-line"></i> Delete
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

export function saveBudget(budgetId, formData) {
  const { category, amount, icon } = formData;

  if (!category || !amount || amount <= 0) {
    alert("Please fill in all required fields");
    return false;
  }

  const existingIndex = state.budgets.findIndex(
    (b) => b.category === category && b.id !== budgetId
  );
  if (existingIndex !== -1) {
    alert("A budget for this category already exists");
    return false;
  }

  if (budgetId) {
    const index = state.budgets.findIndex((b) => b.id === budgetId);
    if (index !== -1) {
      state.budgets[index] = {
        ...state.budgets[index],
        category,
        amount,
        icon: icon || "ri-folder-line",
      };
    }
  } else {
    state.budgets.push({
      id: generateId(),
      category,
      amount,
      icon: icon || "ri-folder-line",
    });
  }

  saveToStorage();
  updateCategoriesSet();
  updateFilterCategories();

  // Update dashboard if needed
  if (state.currentTab === "dashboard") {
    const event = new CustomEvent("budgetUpdated");
    document.dispatchEvent(event);
  }

  return true;
}

export function deleteBudget(id) {
  if (!confirm("Are you sure you want to delete this budget?")) {
    return false;
  }

  state.budgets = state.budgets.filter((b) => b.id !== id);
  saveToStorage();

  // Update dashboard if needed
  if (state.currentTab === "dashboard") {
    const event = new CustomEvent("budgetUpdated");
    document.dispatchEvent(event);
  }

  return true;
}

export function getBudget(id) {
  return state.budgets.find((b) => b.id === id);
}

export function getBudgetByCategory(category) {
  return state.budgets.find((b) => b.category === category);
}
