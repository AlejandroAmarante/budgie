// storage.js — localStorage persistence, import/export.
// Field names are kept identical to earlier versions of Budgie so existing
// installs keep their data across this rebuild.

import { state } from "./state.js";

const STORAGE_KEY = "budgetAppData";
const STORAGE_VERSION = 5;

const defaults = () => ({
  transactions: [],
  budgets: [],
  darkMode: false,
  chartType: "pie",
  trendChartType: "line",
  theme: "default",
});

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : defaults();
    const merged = { ...defaults(), ...data };
    Object.assign(state, merged);
    // currentMonth / currentView / categories aren't persisted fields
  } catch (e) {
    console.error("Failed to load data:", e);
    Object.assign(state, defaults());
  }
}

export function saveToStorage() {
  try {
    const data = {
      version: STORAGE_VERSION,
      transactions: state.transactions,
      budgets: state.budgets,
      darkMode: state.darkMode,
      chartType: state.chartType,
      trendChartType: state.trendChartType,
      theme: state.theme,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data:", e);
  }
}

export function exportJSON() {
  const data = {
    version: STORAGE_VERSION,
    transactions: state.transactions,
    budgets: state.budgets,
    exportDate: new Date().toISOString(),
  };
  downloadBlob(
    JSON.stringify(data, null, 2),
    "application/json",
    `budgie-export-${todayStamp()}.json`
  );
}

export function exportCSV() {
  const csv = `TRANSACTIONS\n${transactionsToCSV()}\n\nBUDGETS\n${budgetsToCSV()}`;
  downloadBlob(csv, "text/csv", `budgie-export-${todayStamp()}.csv`);
}

export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data.transactions)) {
          throw new Error("Invalid data format");
        }
        state.transactions = data.transactions;
        state.budgets = Array.isArray(data.budgets) ? data.budgets : [];
        saveToStorage();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsText(file);
  });
}

export function resetData() {
  state.transactions = [];
  state.budgets = [];
  state.categories.clear();
  saveToStorage();
}

// ---- helpers ----

function transactionsToCSV() {
  const headers = ["Date", "Type", "Category", "Amount", "Notes", "Recurring"];
  const rows = state.transactions.map((t) => [
    t.date,
    t.type,
    escapeCSV(t.category),
    t.amount,
    escapeCSV(t.notes || ""),
    t.recurring ? "Yes" : "No",
  ]);
  return [headers, ...rows].map((r) => r.join(",")).join("\n");
}

function budgetsToCSV() {
  const headers = ["Category", "Amount"];
  const rows = state.budgets.map((b) => [escapeCSV(b.category), b.amount]);
  return [headers, ...rows].map((r) => r.join(",")).join("\n");
}

function escapeCSV(value) {
  if (typeof value !== "string") return value;
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function todayStamp() {
  return new Date().toISOString().split("T")[0];
}
