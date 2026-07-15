// budgets.js — everything related to monthly category budgets: rendering
// the list, the add/edit form, and CRUD operations.

import {
  state,
  generateId,
  updateCategoriesSet,
  getTransactionsForPeriod,
  calculateOverallBudget,
  notify,
} from "./state.js";
import { saveToStorage } from "./storage.js";
import {
  formatCurrency,
  escapeHtml,
  startOfMonth,
  endOfMonth,
} from "./utils.js";
import { mountIconPicker, DEFAULT_ICON } from "./icons.js";
import { mountCategoryPicker } from "./category-picker.js";
import { openSheet, confirmDialog } from "./sheet.js";
import { toast } from "./toast.js";

export function renderBudgets() {
  // Budgets are monthly limits, so spend is always tallied for the calendar
  // month the dashboard's active period starts in — regardless of whether
  // the dashboard itself is currently showing a day, year, or custom range.
  const monthTransactions = getTransactionsForPeriod({
    start: startOfMonth(state.period.start),
    end: endOfMonth(state.period.start),
  });
  const spentByCategory = {};
  monthTransactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      spentByCategory[t.category] =
        (spentByCategory[t.category] || 0) + t.amount;
    });

  const overallEl = document.getElementById("overallBudgetValue");
  if (overallEl)
    overallEl.textContent = formatCurrency(calculateOverallBudget());

  const container = document.getElementById("budgetsList");
  if (!container) return;

  if (state.budgets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="ri-pie-chart-2-line" aria-hidden="true"></i>
        <p>No budgets yet</p>
        <span>Set a monthly limit for a category to start tracking your spending against it.</span>
        <button type="button" class="btn btn-primary" data-action="add-budget">
          <i class="ri-add-line" aria-hidden="true"></i>Add your first budget
        </button>
      </div>`;
    return;
  }

  const sorted = [...state.budgets].sort((a, b) =>
    a.category.localeCompare(b.category),
  );

  container.innerHTML = sorted
    .map((budget) => {
      const spent = spentByCategory[budget.category] || 0;
      const remaining = budget.amount - spent;
      const pct =
        budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
      const ringColor =
        pct >= 100
          ? "var(--color-expense)"
          : pct >= 80
            ? "var(--color-warning)"
            : "var(--color-primary)";

      return `
        <div class="card budget-card">
          <div class="progress-ring" style="--ring-pct:${pct}; --ring-color:${ringColor}">
            <i class="${budget.icon || DEFAULT_ICON}" aria-hidden="true"></i>
          </div>
          <div class="budget-card-main">
            <div class="budget-card-header">
              <span class="budget-card-title">${escapeHtml(budget.category)}</span>
              <span class="budget-card-amount">of ${formatCurrency(budget.amount)}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill${pct >= 100 ? " is-danger" : pct >= 80 ? " is-warning" : ""}" style="width:${pct}%"></div>
            </div>
            <div class="budget-card-stats">
              <span>Spent ${formatCurrency(spent)}</span>
              <span class="budget-card-remaining ${remaining >= 0 ? "is-positive" : "is-negative"}">
                ${remaining >= 0 ? "Remaining" : "Over"} ${formatCurrency(Math.abs(remaining))}
              </span>
            </div>
            <div class="budget-card-actions">
              <button type="button" class="icon-btn icon-btn-sm" data-action="edit-budget" data-id="${budget.id}" aria-label="Edit ${escapeHtml(budget.category)} budget">
                <i class="ri-edit-line" aria-hidden="true"></i>
              </button>
              <button type="button" class="icon-btn icon-btn-sm icon-btn-danger" data-action="delete-budget" data-id="${budget.id}" aria-label="Delete ${escapeHtml(budget.category)} budget">
                <i class="ri-delete-bin-line" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

export function openBudgetForm(budgetId = null) {
  const budget = budgetId ? getBudget(budgetId) : null;
  const isEdit = !!budget;
  let selectedIcon = budget?.icon || DEFAULT_ICON;
  let selectedCategory = budget?.category || "";

  const form = document.createElement("form");
  form.id = "budgetForm";
  form.innerHTML = `
    <div class="field">
      <label class="field-label" for="budgetCategoryPicker">Category</label>
      <div id="budgetCategoryPicker"></div>
    </div>
    <div class="field">
      <label class="field-label" for="budgetAmount">Monthly limit</label>
      <div class="amount-field amount-field-compact">
        <span class="currency-symbol">$</span>
        <input type="number" id="budgetAmount" inputmode="decimal" step="0.01" min="0" required
               placeholder="0" value="${isEdit ? budget.amount : ""}">
      </div>
    </div>
    <div class="field">
      <span class="field-label">Icon</span>
      <div class="icon-grid" id="budgetIconGrid"></div>
    </div>
  `;

  const { close, body } = openSheet({
    title: isEdit ? "Edit budget" : "New budget",
    content: form,
    actions: [
      {
        label: isEdit ? "Save changes" : "Add budget",
        onClick: () => {
          if (form.requestSubmit) form.requestSubmit();
        },
      },
    ],
  });

  const categoryPicker = mountCategoryPicker(
    body.querySelector("#budgetCategoryPicker"),
    {
      selectedCategory,
      onSelect: (category, icon) => {
        selectedCategory = category;
        if (icon) {
          selectedIcon = icon;
          mountIconPicker(
            body.querySelector("#budgetIconGrid"),
            selectedIcon,
            (icon) => (selectedIcon = icon),
          );
        }
      },
    },
  );

  mountIconPicker(
    body.querySelector("#budgetIconGrid"),
    selectedIcon,
    (icon) => (selectedIcon = icon),
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const category = categoryPicker.getValue();
    const amount = parseFloat(body.querySelector("#budgetAmount").value);
    const ok = saveBudget(budgetId, { category, amount, icon: selectedIcon });
    if (ok) {
      close();
      toast(isEdit ? "Budget updated" : "Budget added");
    }
  });
}

export function saveBudget(budgetId, { category, amount, icon }) {
  if (!category || !amount || amount <= 0) {
    toast("Please fill in a category and an amount greater than $0", {
      icon: "ri-error-warning-line",
    });
    return false;
  }

  const duplicate = state.budgets.some(
    (b) => b.category === category && b.id !== budgetId,
  );
  if (duplicate) {
    toast("A budget for this category already exists", {
      icon: "ri-error-warning-line",
    });
    return false;
  }

  if (budgetId) {
    const index = state.budgets.findIndex((b) => b.id === budgetId);
    if (index !== -1) {
      state.budgets[index] = {
        ...state.budgets[index],
        category,
        amount,
        icon: icon || DEFAULT_ICON,
      };
    }
  } else {
    state.budgets.push({
      id: generateId(),
      category,
      amount,
      icon: icon || DEFAULT_ICON,
    });
  }

  saveToStorage();
  updateCategoriesSet();
  notify();
  return true;
}

export async function handleDeleteBudget(id) {
  const budget = getBudget(id);
  if (!budget) return;
  const confirmed = await confirmDialog({
    title: "Delete this budget?",
    message: `"${budget.category}" will no longer have a monthly limit. Its transactions are kept.`,
    confirmLabel: "Delete",
    danger: true,
  });
  if (!confirmed) return;

  state.budgets = state.budgets.filter((b) => b.id !== id);
  saveToStorage();
  notify();
  toast("Budget deleted");
}

export function getBudget(id) {
  return state.budgets.find((b) => b.id === id);
}

export function getBudgetByCategory(category) {
  return state.budgets.find((b) => b.category === category);
}
