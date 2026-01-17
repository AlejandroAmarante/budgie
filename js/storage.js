// storage.js - Storage Management Module
import { state } from "./state.js";

const STORAGE_VERSION = 4; // Incremented version for theme support
const STORAGE_KEY = "budgetAppData";

export function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.version !== STORAGE_VERSION) {
        migrateData(data);
      } else {
        state.transactions = data.transactions || [];
        state.budgets = data.budgets || [];
        state.darkMode = data.darkMode || false;
        state.chartType = data.chartType || "pie";
        state.trendChartType = data.trendChartType || "line";
        state.theme = data.theme || "default";
      }
    }
  } catch (e) {
    console.error("Failed to load data:", e);
    state.transactions = [];
    state.budgets = [];
    state.darkMode = false;
    state.chartType = "pie";
    state.trendChartType = "line";
    state.theme = "default";
  }
}

function migrateData(data) {
  state.transactions = data.transactions || [];
  state.budgets = data.budgets || [];
  state.darkMode = data.darkMode || false;
  state.chartType = data.chartType || "pie";
  state.trendChartType = data.trendChartType || "line";
  state.theme = data.theme || "default";
  saveToStorage();
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
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `budget-data-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV() {
  const transactionsCSV = generateTransactionsCSV();
  const budgetsCSV = generateBudgetsCSV();
  const csv = `TRANSACTIONS\n${transactionsCSV}\n\nBUDGETS\n${budgetsCSV}`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `budget-data-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function generateTransactionsCSV() {
  const headers = ["Date", "Type", "Category", "Amount", "Notes", "Recurring"];
  const rows = state.transactions.map((t) => [
    t.date,
    t.type,
    escapeCSV(t.category),
    t.amount,
    escapeCSV(t.notes || ""),
    t.recurring ? "Yes" : "No",
  ]);
  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

function generateBudgetsCSV() {
  const headers = ["Category", "Amount"];
  const rows = state.budgets.map((b) => [escapeCSV(b.category), b.amount]);
  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

function escapeCSV(str) {
  if (typeof str !== "string") return str;
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.transactions || !Array.isArray(data.transactions)) {
          throw new Error("Invalid data format");
        }
        state.transactions = data.transactions;
        state.budgets = data.budgets || [];
        saveToStorage();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}

export function resetData() {
  state.transactions = [];
  state.budgets = [];
  state.categories.clear();
  saveToStorage();
}
