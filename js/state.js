// state.js — single source of truth for app data + a tiny pub/sub layer.
// Any module can call `notify()` after mutating `state` and every
// subscriber (usually a view's render function) re-runs automatically.
// This replaces the old pattern of manually chaining render calls after
// every mutation site.

import { startOfMonth, endOfMonth, toISODate, parseISODate } from "./utils.js";

export const state = {
  transactions: [],
  budgets: [],
  darkMode: false,
  theme: "default",
  // The active viewing window for the dashboard. `granularity` drives how
  // the picker/stepper behave; `start`/`end` are always concrete Dates and
  // are what every filter actually reads, regardless of granularity.
  period: {
    granularity: "month",
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  },
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
  state.transactions.forEach(
    (t) => t.category && state.categories.add(t.category),
  );
  state.budgets.forEach((b) => b.category && state.categories.add(b.category));
}

/**
 * Returns every transaction that falls within `period.start`..`period.end`
 * (inclusive), including "virtual" projected instances of recurring
 * transactions for any month the period overlaps, provided that month is
 * after the recurring transaction's own original month.
 */
export function getTransactionsForPeriod(period) {
  const { start, end } = period;
  const startStr = toISODate(start);
  const endStr = toISODate(end);

  const actual = state.transactions.filter(
    (t) => t.date >= startStr && t.date <= endStr,
  );

  const projected = [];
  const recurring = state.transactions.filter((t) => t.recurring);
  if (recurring.length) {
    const cursor = startOfMonth(start);
    const lastMonth = startOfMonth(end);
    while (cursor <= lastMonth) {
      const mStr = monthKey(cursor);
      const projectedDateStr = `${mStr}-01`;
      if (projectedDateStr >= startStr && projectedDateStr <= endStr) {
        recurring.forEach((t) => {
          if (t.date.startsWith(mStr)) return; // an actual entry already covers this month
          const recurringMonthStart = startOfMonth(parseISODate(t.date));
          if (cursor <= recurringMonthStart) return; // only project into later months
          projected.push({
            ...t,
            id: `projected-${t.id}-${mStr}`,
            date: projectedDateStr,
            isProjected: true,
          });
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

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
