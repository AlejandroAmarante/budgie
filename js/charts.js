// charts.js — Chart.js wiring for the two dashboard charts. Kept separate
// from dashboard.js since chart configuration is a large, self-contained
// concern of its own.

import { state, getTransactionsForMonth, calculateOverallBudget, monthKey } from "./state.js";
import { formatCurrency, generateColors, cssVar } from "./utils.js";
import { saveToStorage } from "./storage.js";

const charts = { category: null, trend: null };

export function renderCategoryChart(monthTransactions) {
  const canvas = document.getElementById("categoryChart");
  const wrap = canvas.closest(".chart-canvas-wrap");
  const emptyState = wrap.querySelector(".chart-empty-state");

  const totals = {};
  monthTransactions
    .filter((t) => t.type === "expense")
    .forEach((t) => (totals[t.category] = (totals[t.category] || 0) + t.amount));

  const labels = Object.keys(totals).sort();
  const data = labels.map((cat) => totals[cat]);

  charts.category?.destroy();
  charts.category = null;

  const hasAnyExpenses = state.transactions.some((t) => t.type === "expense");
  toggleChartEmptyState(wrap, canvas, emptyState, hasAnyExpenses, "categoryChartToggle");

  if (!hasAnyExpenses || labels.length === 0) return;

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
      renderCategoryChart(getTransactionsForMonth(state.currentMonth));
    });
  });
}

export function renderTrendChart() {
  const canvas = document.getElementById("trendChart");
  const wrap = canvas.closest(".chart-canvas-wrap");
  const emptyState = wrap.querySelector(".chart-empty-state");

  const hasAny = state.transactions.some((t) => t.type === "income" || t.type === "expense");
  charts.trend?.destroy();
  charts.trend = null;
  toggleChartEmptyState(wrap, canvas, emptyState, hasAny, "trendChartToggle");
  if (!hasAny) return;

  const currentYearMonth = monthKey(new Date());
  const monthsData = [];
  for (let i = 2; i >= -2; i--) {
    const date = new Date(state.currentMonth);
    date.setMonth(date.getMonth() - i);
    const yearMonth = monthKey(date);
    const isFuture = yearMonth > currentYearMonth;
    const transactions = getTransactionsForMonth(date);
    const actual = transactions.filter((t) => !t.isProjected);
    const projected = transactions.filter((t) => t.isProjected);

    monthsData.push({
      month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      actualIncome: sum(actual, "income"),
      actualExpenses: sum(actual, "expense"),
      projectedIncome: isFuture ? sum(projected, "income") : 0,
      projectedExpenses: isFuture ? sum(projected, "expense") : 0,
      isFuture,
    });
  }

  const overallBudget = calculateOverallBudget();
  const allValues = monthsData.flatMap((d) => [d.actualIncome, d.actualExpenses, d.projectedIncome, d.projectedExpenses]);
  if (overallBudget > 0) allValues.push(overallBudget);
  const suggestedMax = Math.max(...allValues, 0) * 1.25 || 100;

  const lastActualIndex = monthsData.findIndex((d) => d.isFuture) - 1;
  const hasActualData = lastActualIndex >= 0;
  const hasFutureData = monthsData.some((d) => d.isFuture && (d.projectedIncome > 0 || d.projectedExpenses > 0));
  const chartType = state.trendChartType;
  const datasets = [];

  const incomeColor = "rgb(47, 174, 96)";
  const expenseColor = "rgb(228, 87, 61)";
  const budgetColor = "rgb(61, 127, 228)";

  if (chartType === "bar") {
    datasets.push(barDataset("Income", monthsData.map((d) => (d.isFuture ? null : d.actualIncome)), incomeColor));
    datasets.push(barDataset("Expenses", monthsData.map((d) => (d.isFuture ? null : d.actualExpenses)), expenseColor));
    if (hasFutureData) {
      datasets.push(barDataset("Projected Income", monthsData.map((d) => (d.isFuture ? d.actualIncome + d.projectedIncome : null)), incomeColor, true));
      datasets.push(barDataset("Projected Expenses", monthsData.map((d) => (d.isFuture ? d.actualExpenses + d.projectedExpenses : null)), expenseColor, true));
    }
  } else {
    if (hasFutureData) {
      datasets.push(
        lineDataset("Projected Expenses", monthsData.map((d, idx) => (hasActualData && idx === lastActualIndex ? d.actualExpenses : d.isFuture ? d.actualExpenses + d.projectedExpenses : null)), expenseColor, true, 2)
      );
      datasets.push(
        lineDataset("Projected Income", monthsData.map((d, idx) => (hasActualData && idx === lastActualIndex ? d.actualIncome : d.isFuture ? d.actualIncome + d.projectedIncome : null)), incomeColor, true, 1)
      );
    }
    datasets.push(lineDataset("Expenses", monthsData.map((d) => (d.isFuture ? null : d.actualExpenses)), expenseColor, false, 4));
    datasets.push(lineDataset("Income", monthsData.map((d) => (d.isFuture ? null : d.actualIncome)), incomeColor, false, 3));
  }

  if (overallBudget > 0) {
    datasets.push({
      label: "Monthly Budget",
      data: monthsData.map(() => overallBudget),
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
    data: { labels: monthsData.map((d) => d.month), datasets },
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

function toggleChartEmptyState(wrap, canvas, emptyState, hasData, toggleId) {
  const toggle = document.getElementById(toggleId);
  canvas.style.display = hasData ? "block" : "none";
  if (emptyState) emptyState.style.display = hasData ? "none" : "flex";
  if (toggle) toggle.style.visibility = hasData ? "visible" : "hidden";
}
