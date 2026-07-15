// state.js — single source of truth for app data + a tiny pub/sub layer.
// Any module can call `notify()` after mutating `state` and every
// subscriber (usually a view's render function) re-runs automatically.
// This replaces the old pattern of manually chaining render calls after
// every mutation site.

export const state = {
  transactions: [],
  budgets: [],
  darkMode: false,
  theme: "default",
  currentMonth: new Date(),
  currentView: "dashboard",
  categories: new Set(),
  chartType: "pie", // category chart: pie | doughnut
  trendChartType: "line", // trend chart: line | bar
};

const listeners = new Set();

/** Subscribe to state changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Tell every subscriber that state has changed. */
export function notify() {
  listeners.forEach((fn) => fn());
}

export function updateCategoriesSet() {
  state.categories.clear();
  state.transactions.forEach((t) => t.category && state.categories.add(t.category));
  state.budgets.forEach((b) => b.category && state.categories.add(b.category));
}

/**
 * Returns all transactions that belong in the given month, including
 * "virtual" projected instances of recurring transactions that started
 * in an earlier month.
 */
export function getTransactionsForMonth(date) {
  const monthStr = monthKey(date);
  const actual = state.transactions.filter((t) => t.date.startsWith(monthStr));

  const projected = [];
  state.transactions
    .filter((t) => t.recurring && !t.date.startsWith(monthStr))
    .forEach((recurring) => {
      const recurringMonth = new Date(recurring.date);
      const startOfRecurring = new Date(
        recurringMonth.getFullYear(),
        recurringMonth.getMonth(),
        1
      );
      const startOfViewing = new Date(date.getFullYear(), date.getMonth(), 1);
      if (startOfViewing > startOfRecurring) {
        projected.push({
          ...recurring,
          id: `projected-${recurring.id}-${monthStr}`,
          date: `${monthStr}-01`,
          isProjected: true,
        });
      }
    });

  return [...actual, ...projected];
}

export function calculateOverallBudget() {
  return state.budgets.reduce((total, b) => total + b.amount, 0);
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
