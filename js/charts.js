// charts.js — Chart.js wiring for the two dashboard charts. Kept separate
// from dashboard.js since chart configuration is a large, self-contained
// concern of its own.

import { state, getTransactionsForPeriod, calculateOverallBudget } from "./state.js";
import {
  formatCurrency,
  generateColors,
  cssVar,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "./utils.js";
import { saveToStorage } from "./storage.js";

const charts = { category: null, trend: null };
const DAY_MS = 24 * 60 * 60 * 1000;

export function renderCategoryChart(periodTransactions) {
  const canvas = document.getElementById("categoryChart");
  const wrap = canvas.closest(".chart-canvas-wrap");
  const emptyState = wrap.querySelector(".chart-empty-state");

  const totals = {};
  periodTransactions
    .filter((t) => t.type === "expense")
    .forEach((t) => (totals[t.category] = (totals[t.category] || 0) + t.amount));

  const labels = Object.keys(totals).sort();
  const data = labels.map((cat) => totals[cat]);

  charts.category?.destroy();
  charts.category = null;

  const hasDataInPeriod = labels.length > 0;
  const everHasExpenses = state.transactions.some((t) => t.type === "expense");
  toggleChartEmptyState(wrap, canvas, emptyState, hasDataInPeriod, everHasExpenses, "categoryChartToggle");

  if (!hasDataInPeriod) return;

  const total = data.reduce((sum, v) => sum + v, 0);

  const centerTextPlugin = {
    id: "centerText",
    afterDatasetsDraw(chart) {
      if (state.chartType !== "doughnut") return;
      const { ctx, chartArea } = chart;
      const cx = chartArea.left + chartArea.width / 2;
      const cy = chartArea.top + chartArea.height / 2;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "600 13px Inter, sans-serif";
      ctx.fillStyle = cssVar("--color-text-secondary");
      ctx.fillText("Total", cx, cy - 14);
      ctx.font = "700 22px Quicksand, sans-serif";
      ctx.fillStyle = cssVar("--color-text");
      ctx.fillText(formatCurrency(total), cx, cy + 10);
      ctx.restore();
    },
  };

  charts.category = new Chart(canvas, {
    type: state.chartType,
    data: { labels, datasets: [{ data, backgroundColor: generateColors(labels.length), borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: state.chartType === "doughnut" ? "68%" : undefined,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: cssVar("--color-text"), font: { family: "Inter" }, padding: 14, boxWidth: 10 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)} (${((ctx.parsed / total) * 100).toFixed(1)}%)`,
          },
        },
      },
    },
    plugins: [centerTextPlugin],
  });
}

export function initCategoryChartToggle() {
  const chartCard = document.querySelector(".chart-card.category-chart");
  const container = chartCard.querySelector(".chart-header .segmented-icon-slot");
  if (container.dataset.mounted) return;
  container.dataset.mounted = "true";

  container.innerHTML = `
    <div class="segmented-icon" id="categoryChartToggle">
      <button type="button" data-type="pie" class="${state.chartType === "pie" ? "is-active" : ""}" title="Pie chart" aria-label="Pie chart">
        <i class="ri-pie-chart-fill" aria-hidden="true"></i>
      </button>
      <button type="button" data-type="doughnut" class="${state.chartType === "doughnut" ? "is-active" : ""}" title="Doughnut chart" aria-label="Doughnut chart">
        <i class="ri-donut-chart-fill" aria-hidden="true"></i>
      </button>
    </div>`;

  container.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.type === state.chartType) return;
      state.chartType = btn.dataset.type;
      saveToStorage();
      container.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderCategoryChart(getTransactionsForPeriod(state.period));
    });
  });
}

/**
 * Builds the trend chart's x-axis buckets for the active period.
 * Day/month/year granularities show 5 buckets of that same unit, centered
 * on the selection (useful surrounding context). A custom range shows
 * *only* that range — bucketed by day if it's a month or shorter, by
 * month otherwise, since the person already chose those exact bounds.
 */
function buildTrendBuckets(period) {
  const { granularity, start, end } = period;
  const today = new Date();
  const bucket = (label, bucketStart, bucketEnd) => ({
    label,
    start: bucketStart,
    end: bucketEnd,
    isFuture: bucketStart > today,
  });

  if (granularity === "range") {
    const totalDays = Math.round((endOfDay(end) - startOfDay(start)) / DAY_MS) + 1;
    const buckets = [];
    if (totalDays <= 31) {
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        buckets.push(bucket(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), startOfDay(d), endOfDay(d)));
      }
    } else {
      const cursor = startOfMonth(start);
      const lastMonth = startOfMonth(end);
      while (cursor <= lastMonth) {
        buckets.push(
          bucket(cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" }), startOfMonth(cursor), endOfMonth(cursor))
        );
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }
    return buckets;
  }

  const buckets = [];
  for (let i = -2; i <= 2; i++) {
    if (granularity === "day") {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      buckets.push(bucket(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), startOfDay(d), endOfDay(d)));
    } else if (granularity === "year") {
      const d = new Date(start.getFullYear() + i, 0, 1);
      buckets.push(bucket(String(d.getFullYear()), startOfYear(d), endOfYear(d)));
    } else {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      buckets.push(bucket(d.toLocaleDateString("en-US", { month: "short", year: "numeric" }), startOfMonth(d), endOfMonth(d)));
    }
  }
  return buckets;
}

export function renderTrendChart() {
  const canvas = document.getElementById("trendChart");
  const wrap = canvas.closest(".chart-canvas-wrap");
  const emptyState = wrap.querySelector(".chart-empty-state");

  const buckets = buildTrendBuckets(state.period).map((b) => {
    const transactions = getTransactionsForPeriod({ start: b.start, end: b.end });
    const actual = transactions.filter((t) => !t.isProjected);
    const projected = transactions.filter((t) => t.isProjected);
    return {
      ...b,
      actualIncome: sum(actual, "income"),
      actualExpenses: sum(actual, "expense"),
      projectedIncome: b.isFuture ? sum(projected, "income") : 0,
      projectedExpenses: b.isFuture ? sum(projected, "expense") : 0,
    };
  });

  const hasDataInPeriod = buckets.some(
    (b) => b.actualIncome || b.actualExpenses || b.projectedIncome || b.projectedExpenses
  );
  const everHasData = state.transactions.length > 0;

  charts.trend?.destroy();
  charts.trend = null;
  toggleChartEmptyState(wrap, canvas, emptyState, hasDataInPeriod, everHasData, "trendChartToggle");
  if (!hasDataInPeriod) return;

  const overallBudget = calculateOverallBudget();
  const allValues = buckets.flatMap((d) => [d.actualIncome, d.actualExpenses, d.projectedIncome, d.projectedExpenses]);
  if (overallBudget > 0) allValues.push(overallBudget);
  const suggestedMax = Math.max(...allValues, 0) * 1.25 || 100;

  const lastActualIndex = buckets.findIndex((d) => d.isFuture) - 1;
  const hasActualData = lastActualIndex >= 0;
  const hasFutureData = buckets.some((d) => d.isFuture && (d.projectedIncome > 0 || d.projectedExpenses > 0));
  const chartType = state.trendChartType;
  const datasets = [];

  const incomeColor = "rgb(47, 174, 96)";
  const expenseColor = "rgb(228, 87, 61)";
  const budgetColor = "rgb(61, 127, 228)";

  if (chartType === "bar") {
    datasets.push(barDataset("Income", buckets.map((d) => (d.isFuture ? null : d.actualIncome)), incomeColor));
    datasets.push(barDataset("Expenses", buckets.map((d) => (d.isFuture ? null : d.actualExpenses)), expenseColor));
    if (hasFutureData) {
      datasets.push(barDataset("Projected Income", buckets.map((d) => (d.isFuture ? d.actualIncome + d.projectedIncome : null)), incomeColor, true));
      datasets.push(barDataset("Projected Expenses", buckets.map((d) => (d.isFuture ? d.actualExpenses + d.projectedExpenses : null)), expenseColor, true));
    }
  } else {
    if (hasFutureData) {
      datasets.push(
        lineDataset("Projected Expenses", buckets.map((d, idx) => (hasActualData && idx === lastActualIndex ? d.actualExpenses : d.isFuture ? d.actualExpenses + d.projectedExpenses : null)), expenseColor, true, 2)
      );
      datasets.push(
        lineDataset("Projected Income", buckets.map((d, idx) => (hasActualData && idx === lastActualIndex ? d.actualIncome : d.isFuture ? d.actualIncome + d.projectedIncome : null)), incomeColor, true, 1)
      );
    }
    datasets.push(lineDataset("Expenses", buckets.map((d) => (d.isFuture ? null : d.actualExpenses)), expenseColor, false, 4));
    datasets.push(lineDataset("Income", buckets.map((d) => (d.isFuture ? null : d.actualIncome)), incomeColor, false, 3));
  }

  if (overallBudget > 0) {
    datasets.push({
      label: "Monthly Budget",
      data: buckets.map(() => overallBudget),
      borderColor: budgetColor,
      backgroundColor: chartType === "bar" ? "rgba(61,127,228,0.2)" : "transparent",
      borderDash: [8, 5],
      borderWidth: 2.5,
      tension: 0,
      fill: false,
      pointRadius: chartType === "line" ? 0 : undefined,
      order: 0,
      type: "line",
    });
  }

  charts.trend = new Chart(canvas, {
    type: chartType,
    data: { labels: buckets.map((d) => d.label), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: cssVar("--color-text"),
            font: { family: "Inter" },
            padding: 14,
            boxWidth: 10,
            generateLabels: (chart) => {
              const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              const order = ["Income", "Expenses", "Monthly Budget"];
              return original
                .filter((l) => !l.text.includes("Projected"))
                .sort((a, b) => order.indexOf(a.text) - order.indexOf(b.text))
                .map((l) => (l.text === "Monthly Budget" ? { ...l, lineDash: [8, 5] } : l));
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y !== null ? formatCurrency(ctx.parsed.y) : "—"}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax,
          ticks: { color: cssVar("--color-text-secondary"), callback: (v) => formatCurrency(v), font: { family: "Inter" } },
          grid: { color: cssVar("--color-border") },
        },
        x: {
          ticks: { color: cssVar("--color-text-secondary"), font: { family: "Inter" }, maxRotation: 0 },
          grid: { display: false },
        },
      },
    },
  });
}

export function initTrendChartToggle() {
  const chartCard = document.querySelector(".chart-card.trend-chart");
  const container = chartCard.querySelector(".chart-header .segmented-icon-slot");
  if (container.dataset.mounted) return;
  container.dataset.mounted = "true";

  container.innerHTML = `
    <div class="segmented-icon" id="trendChartToggle">
      <button type="button" data-type="line" class="${state.trendChartType === "line" ? "is-active" : ""}" title="Line chart" aria-label="Line chart">
        <i class="ri-line-chart-line" aria-hidden="true"></i>
      </button>
      <button type="button" data-type="bar" class="${state.trendChartType === "bar" ? "is-active" : ""}" title="Bar chart" aria-label="Bar chart">
        <i class="ri-bar-chart-fill" aria-hidden="true"></i>
      </button>
    </div>`;

  container.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.type === state.trendChartType) return;
      state.trendChartType = btn.dataset.type;
      saveToStorage();
      container.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderTrendChart();
    });
  });
}

// ---- helpers ----

function sum(transactions, type) {
  return transactions.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
}

function barDataset(label, data, color, projected = false) {
  return {
    label,
    data,
    backgroundColor: projected ? color.replace("rgb", "rgba").replace(")", ",0.5)") : color,
    borderColor: color,
    borderWidth: 1,
    borderDash: projected ? [5, 5] : undefined,
  };
}

function lineDataset(label, data, color, projected, order) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: projected ? "transparent" : color,
    borderDash: projected ? [5, 5] : undefined,
    borderWidth: 2,
    tension: 0.4,
    fill: false,
    spanGaps: projected,
    order,
    pointRadius: projected ? 5 : 5,
    pointHoverRadius: 7,
    pointBackgroundColor: projected ? "transparent" : color,
    pointBorderColor: color,
    pointBorderWidth: projected ? 2 : 0,
  };
}

function toggleChartEmptyState(wrap, canvas, emptyState, hasData, everHasData, toggleId) {
  const toggle = document.getElementById(toggleId);
  canvas.style.display = hasData ? "block" : "none";
  if (emptyState) {
    emptyState.style.display = hasData ? "none" : "flex";
    const message = emptyState.querySelector(".chart-empty-message");
    if (message && !hasData) {
      message.textContent = everHasData
        ? "Try selecting a different date range."
        : "Add a transaction to see data for this period.";
    }
  }
  if (toggle) toggle.style.visibility = hasData ? "visible" : "hidden";
}
