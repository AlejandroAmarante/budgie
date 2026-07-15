// dashboard.js — the at-a-glance overview: period switcher, summary stats,
// budget warnings, and the two charts (rendered by charts.js).

import {
  state,
  getTransactionsForPeriod,
  calculateOverallBudget,
} from "./state.js";
import {
  formatCurrency,
  escapeHtml,
  qs,
  startOfMonth,
  endOfMonth,
} from "./utils.js";
import { stepPeriod, formatPeriodLabel } from "./period.js";
import { renderCategoryChart, renderTrendChart } from "./charts.js";

export function renderDashboard() {
  const period = state.period;
  qs("#currentMonthLabel").textContent = formatPeriodLabel(period);

  const periodTransactions = getTransactionsForPeriod(period);
  const isFuture = period.start > new Date();

  const totalIncome = sumByType(periodTransactions, "income");
  const totalExpenses = sumByType(periodTransactions, "expense");
  const balance = totalIncome - totalExpenses;
  const overallBudget = calculateOverallBudget();

  qs("#incomeLabel").textContent = isFuture ? "Projected income" : "Income";
  qs("#expenseLabel").textContent = isFuture
    ? "Projected expenses"
    : "Expenses";
  qs("#balanceLabel").textContent = isFuture ? "Projected balance" : "Balance";

  qs("#statIncome").textContent = formatCurrency(totalIncome);
  qs("#statExpenses").textContent = formatCurrency(totalExpenses);
  qs("#statBalance").textContent = formatCurrency(balance);
  qs("#statBudget").textContent = formatCurrency(overallBudget);

  // Budgets are inherently monthly limits, so warnings always compare
  // against the calendar month the period starts in — even if you're
  // viewing a single day, a year, or a custom range above.
  const monthTransactions = getTransactionsForPeriod({
    start: startOfMonth(period.start),
    end: endOfMonth(period.start),
  });
  renderBudgetWarnings(
    monthTransactions.filter((t) => !t.isProjected),
    overallBudget,
  );

  renderCategoryChart(periodTransactions);
  renderTrendChart();
}

export function stepDashboardPeriod(direction) {
  state.period = stepPeriod(state.period, direction);
  renderDashboard();
}

function sumByType(transactions, type) {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0);
}

function renderBudgetWarnings(transactions, overallBudget) {
  const container = qs("#budgetWarnings");
  if (!container) return;

  const expenses = transactions.filter((t) => t.type === "expense");
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const spentByCategory = {};
  expenses.forEach((t) => {
    spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
  });

  const warnings = [];
  if (overallBudget > 0 && totalExpenses > overallBudget) {
    warnings.push({
      title: "Overall budget exceeded",
      text: `You've spent ${formatCurrency(totalExpenses)} of your ${formatCurrency(overallBudget)} budget.`,
    });
  }
  state.budgets.forEach((budget) => {
    const spent = spentByCategory[budget.category] || 0;
    if (spent > budget.amount) {
      warnings.push({
        title: `${budget.category} budget exceeded`,
        text: `You've spent ${formatCurrency(spent)} of your ${formatCurrency(budget.amount)} budget.`,
      });
    }
  });

  container.innerHTML = warnings
    .map(
      (w) => `
      <div class="alert">
        <i class="ri-alert-line" aria-hidden="true"></i>
        <div>
          <div class="alert-title">${escapeHtml(w.title)}</div>
          <div class="alert-text">${escapeHtml(w.text)}</div>
        </div>
      </div>`,
    )
    .join("");
}
