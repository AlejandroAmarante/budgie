// ui.js - UI Utilities Module
import { state } from "./state.js";
import { saveToStorage } from "./storage.js";

export function applyDarkMode() {
  if (state.darkMode) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.querySelector("#darkModeToggle i").className = "ri-sun-line";
  } else {
    document.documentElement.removeAttribute("data-theme");
    document.querySelector("#darkModeToggle i").className = "ri-moon-line";
  }
}

export function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  applyDarkMode();
  saveToStorage();
  return state.darkMode;
}

export function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === tabName);
  });
  state.currentTab = tabName;
  return tabName;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function generateColors(count) {
  const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#6366f1",
  ];

  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}

export function updateFilterCategories() {
  const select = document.getElementById("filterCategory");
  const currentValue = select.value;
  select.innerHTML = '<option value="all">All Categories</option>';

  Array.from(state.categories)
    .sort()
    .forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });

  if (Array.from(state.categories).includes(currentValue)) {
    select.value = currentValue;
  }
}
