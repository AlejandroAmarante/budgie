// state.js - State Management Module
export const state = {
  transactions: [],
  budgets: [],
  darkMode: false,
  theme: "default",
  currentMonth: new Date(),
  currentTab: "dashboard",
  categories: new Set(),
  chartType: "pie", // For category chart (pie/doughnut)
  trendChartType: "line", // For trend chart (line/bar)
};

export function updateCategoriesSet() {
  state.categories.clear();
  state.transactions.forEach((t) => {
    if (t.category) state.categories.add(t.category);
  });
  state.budgets.forEach((b) => {
    if (b.category) state.categories.add(b.category);
  });
}

export function getTransactionsForMonth(date) {
  const monthStr = `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
  // Get actual transactions for this month (including recurring ones in their original month)
  const actualTransactions = state.transactions.filter((t) =>
    t.date.startsWith(monthStr)
  );
  // Find recurring transactions that should be projected into this month
  const projectedTransactions = [];
  const recurringTransactions = state.transactions.filter((t) => t.recurring);
  recurringTransactions.forEach((recurring) => {
    // If the recurring transaction's original date is in this month, it's already included in actualTransactions
    if (recurring.date.startsWith(monthStr)) {
      return;
    }
    const recurringDate = new Date(recurring.date);
    const viewingDate = new Date(date);
    // Only project if the viewing month is after the recurring start month
    const recurringStartMonth = new Date(
      recurringDate.getFullYear(),
      recurringDate.getMonth(),
      1
    );
    const viewingMonth = new Date(
      viewingDate.getFullYear(),
      viewingDate.getMonth(),
      1
    );
    if (viewingMonth > recurringStartMonth) {
      // Create a projected instance (not saved to storage, just for display)
      projectedTransactions.push({
        ...recurring,
        id: `projected-${recurring.id}-${monthStr}`,
        date: `${monthStr}-01`,
        isProjected: true,
      });
    }
  });
  return [...actualTransactions, ...projectedTransactions];
}

export function calculateOverallBudget() {
  return state.budgets.reduce((total, budget) => total + budget.amount, 0);
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
