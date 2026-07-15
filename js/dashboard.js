// dashboard.js — the at-a-glance overview: month switcher, summary stats,
// budget warnings, and the two charts (rendered by charts.js).

import { state, getTransactionsForMonth, calculateOverallBudget, monthKey } from "./state.js";
import { formatCurrency, escapeHtml, qs } from "./utils.js";
import { renderCategoryChart, renderTrendChart } from "./charts.js";

export function renderDashboard() {
  const monthLabel = state.currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  qs("#currentMonthLabel").textContent = monthLabel;

  const monthTransactions = getTransactionsForMonth(state.currentMonth);
  const isFuture = monthKey(state.currentMonth) > monthKey(new Date());

  const totalIncome = sumByType(monthTransactions, "income");
  const totalExpenses = sumByType(monthTransactions, "expense");
  const balance = totalIncome - totalExpenses;
  const overallBudget = calculateOverallBudget();

  qs("#incomeLabel").textContent = isFuture ? "Projected income" : "Income";
  qs("#expenseLabel").textContent = isFuture ? "Projected expenses" : "Expenses";
  qs("#balanceLabel").textContent = isFuture ? "Projected balance" : "Balance";

  qs("#statIncome").textContent = formatCurrency(totalIncome);
  qs("#statExpenses").textContent = formatCurrency(totalExpenses);
  qs("#statBalance").textContent = formatCurrency(balance);
  qs("#statBudget").textContent = formatCurrency(overallBudget);

  renderBudgetWarnings(monthTransactions.filter((t) => !t.isProjected), overallBudget);
  renderCategoryChart(monthTransactions);
  renderTrendChart();
}

export function changeMonth(direction) {
  const next = new Date(state.currentMonth);
  next.setMonth(next.getMonth() + direction);
  state.currentMonth = next;
  renderDashboard();
}

function sumByType(transactions, type) {
  return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0);
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
      </div>`
    )
    .join("");
}
