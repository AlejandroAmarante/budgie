// utils.js — small, dependency-free helpers shared across modules.

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Parse a "YYYY-MM-DD" string as a local date, never UTC — avoids the
 *  classic off-by-one-day bug that shows up for anyone west of UTC. */
export function parseISODate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toISOMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDate(dateStr) {
  return parseISODate(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---- Period boundaries (local time, inclusive start/end of day) ----

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

export function endOfYear(date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

export function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

export function on(element, event, selectorOrHandler, maybeHandler) {
  if (typeof selectorOrHandler === "function") {
    element.addEventListener(event, selectorOrHandler);
    return;
  }
  element.addEventListener(event, (e) => {
    const target = e.target.closest(selectorOrHandler);
    if (target && element.contains(target)) maybeHandler(e, target);
  });
}

const CHART_PALETTE = [
  "#2fae60",
  "#3d7fe4",
  "#eeab26",
  "#e4573d",
  "#8a63d2",
  "#2fb6b0",
  "#d4569b",
  "#7a9c2e",
  "#e2903f",
  "#5b7fd6",
];

export function generateColors(count) {
  return Array.from({ length: count }, (_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);
}

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
