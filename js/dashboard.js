// dashboard.js - Dashboard Rendering Module
import { state, getTransactionsForMonth } from "./state.js";
import { formatCurrency, escapeHtml } from "./ui.js";
import { renderCategoryChart, renderTrendChart } from "./charts.js";

export function renderDashboard() {
  const monthYear = state.currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  document.getElementById("currentMonth").textContent = monthYear;

  const monthTransactions = getTransactionsForMonth(state.currentMonth);

  // Determine if viewing a future month
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  const viewingYearMonth = `${state.currentMonth.getFullYear()}-${String(
    state.currentMonth.getMonth() + 1
  ).padStart(2, "0")}`;
  const isFuture = viewingYearMonth > currentYearMonth;

  // Calculate totals including projected transactions
  const totalIncome = monthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  // Update labels based on whether we're viewing future or current/past
  const incomeLabel = document.querySelector(
    ".card-content.income .card-label"
  );
  const expensesLabel = document.querySelector(
    ".card-content.expense .card-label"
  );
  const balanceLabel = document.querySelector(
    ".card-content.balance .card-label"
  );

  if (isFuture) {
    incomeLabel.textContent = "Projected Income";
    expensesLabel.textContent = "Projected Expenses";
    balanceLabel.textContent = "Projected Balance";
  } else {
    incomeLabel.textContent = "Total Income";
    expensesLabel.textContent = "Total Expenses";
    balanceLabel.textContent = "Balance";
  }

  document.getElementById("totalIncome").textContent =
    formatCurrency(totalIncome);
  document.getElementById("totalExpenses").textContent =
    formatCurrency(totalExpenses);
  document.getElementById("balance").textContent = formatCurrency(balance);

  // Update budget display
  document.getElementById("budget").textContent = state.overallBudget
    ? formatCurrency(state.overallBudget)
    : "$0.00";

  // Filter out projected transactions for budget warnings (only warn on actual spending)
  const actualTransactions = monthTransactions.filter((t) => !t.isProjected);
  renderBudgetWarnings(actualTransactions);

  renderCategoryChart(monthTransactions);
  renderTrendChart();
}

export function changeMonth(direction) {
  const newDate = new Date(state.currentMonth);
  newDate.setMonth(newDate.getMonth() + direction);
  state.currentMonth = newDate;
  renderDashboard();
}

function renderBudgetWarnings(monthTransactions) {
  const container = document.getElementById("budgetWarnings");
  container.innerHTML = "";

  const expenses = monthTransactions.filter((t) => t.type === "expense");
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

  if (state.overallBudget && totalExpenses > state.overallBudget) {
    const warning = createWarningElement(
      "Overall Budget Exceeded",
      `You've spent ${formatCurrency(totalExpenses)} of your ${formatCurrency(
        state.overallBudget
      )} budget.`
    );
    container.appendChild(warning);
  }

  const categoryExpenses = {};
  expenses.forEach((t) => {
    categoryExpenses[t.category] =
      (categoryExpenses[t.category] || 0) + t.amount;
  });

  state.budgets.forEach((budget) => {
    const spent = categoryExpenses[budget.category] || 0;
    if (spent > budget.amount) {
      const warning = createWarningElement(
        `${budget.category} Budget Exceeded`,
        `You've spent ${formatCurrency(spent)} of your ${formatCurrency(
          budget.amount
        )} budget.`
      );
      container.appendChild(warning);
    }
  });
}

function createWarningElement(title, text) {
  const div = document.createElement("div");
  div.className = "warning";
  div.innerHTML = `
    <i class="ri-alert-line"></i>
    <div class="warning-content">
      <div class="warning-title">${escapeHtml(title)}</div>
      <div class="warning-text">${escapeHtml(text)}</div>
    </div>
  `;
  return div;
}
