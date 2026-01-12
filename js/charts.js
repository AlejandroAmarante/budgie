// charts.js - Chart Rendering Module
import {
  state,
  getTransactionsForMonth,
  calculateOverallBudget,
} from "./state.js";
import { formatCurrency, generateColors } from "./ui.js";

const charts = {
  category: null,
  trend: null,
};

export function renderCategoryChart(monthTransactions) {
  const ctx = document.getElementById("categoryChart");

  // Include both actual and projected expenses
  const expenses = monthTransactions.filter((t) => t.type === "expense");
  const categoryTotals = {};

  expenses.forEach((t) => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(categoryTotals).sort();
  const data = labels.map((cat) => categoryTotals[cat]);

  if (charts.category) {
    charts.category.destroy();
  }

  if (labels.length === 0) {
    ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height);
    return;
  }

  charts.category = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: generateColors(labels.length),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue("--text-primary")
              .trim(),
            font: {
              family: "'Poppins', sans-serif",
            },
          },
        },
      },
    },
  });
}

export function renderTrendChart() {
  const ctx = document.getElementById("trendChart");

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const monthsData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(state.currentMonth);
    date.setMonth(date.getMonth() - i);
    const monthStr = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    const yearMonth = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    const transactions = getTransactionsForMonth(date);

    // Filter out projected transactions for actual data
    const actualTransactions = transactions.filter((t) => !t.isProjected);
    const projectedTransactions = transactions.filter((t) => t.isProjected);

    const actualIncome = actualTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const actualExpenses = actualTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const projectedIncome = projectedTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const projectedExpenses = projectedTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Determine if this month is in the future
    const isFuture = yearMonth > currentYearMonth;

    monthsData.push({
      month: monthStr,
      actualIncome,
      actualExpenses,
      projectedIncome: isFuture ? projectedIncome : 0,
      projectedExpenses: isFuture ? projectedExpenses : 0,
      isFuture,
    });
  }

  if (charts.trend) {
    charts.trend.destroy();
  }

  // Get calculated overall budget
  const overallBudget = calculateOverallBudget();

  // Calculate max value and add 25% breathing room
  const allValues = monthsData.flatMap((d) => [
    d.actualIncome,
    d.actualExpenses,
    d.projectedIncome,
    d.projectedExpenses,
  ]);

  // Include budget in max calculation if it exists
  if (overallBudget > 0) {
    allValues.push(overallBudget);
  }

  const maxValue = Math.max(...allValues, 0);
  const suggestedMax = maxValue > 0 ? maxValue * 1.25 : 100;

  // Get the last actual data point index to connect the lines
  let lastActualIndex = monthsData.findIndex((d) => d.isFuture) - 1;

  // If all months are in the future, there's no actual data to connect from
  const hasActualData = lastActualIndex >= 0;

  const hasFutureData = monthsData.some(
    (d) => d.isFuture && (d.projectedIncome > 0 || d.projectedExpenses > 0)
  );

  // Prepare datasets - order matters for proper layering (bottom to top)
  const datasets = [];

  // First add projected datasets (bottom layer) if they exist
  if (hasFutureData) {
    datasets.push({
      label: "Projected Expenses",
      data: monthsData.map((d, idx) => {
        // If we have actual data, connect from the last actual month
        if (hasActualData && idx === lastActualIndex) return d.actualExpenses;
        // Show projected expenses for future months
        return d.isFuture ? d.actualExpenses + d.projectedExpenses : null;
      }),
      borderColor: "rgb(239, 68, 68)",
      backgroundColor: "transparent",
      borderDash: [5, 5],
      borderWidth: 2,
      tension: 0.4,
      fill: false,
      spanGaps: true,
      order: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointBackgroundColor: "transparent",
      pointBorderColor: "rgb(239, 68, 68)",
      pointBorderWidth: 2,
    });

    datasets.push({
      label: "Projected Income",
      data: monthsData.map((d, idx) => {
        // If we have actual data, connect from the last actual month
        if (hasActualData && idx === lastActualIndex) return d.actualIncome;
        // Show projected income for future months
        return d.isFuture ? d.actualIncome + d.projectedIncome : null;
      }),
      borderColor: "rgb(16, 185, 129)",
      backgroundColor: "transparent",
      borderDash: [5, 5],
      borderWidth: 2,
      tension: 0.4,
      fill: false,
      spanGaps: true,
      order: 1,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointBackgroundColor: "transparent",
      pointBorderColor: "rgb(16, 185, 129)",
      pointBorderWidth: 2,
    });
  }

  // Then add actual datasets (top layer)
  datasets.push({
    label: "Expenses",
    data: monthsData.map((d) => (d.isFuture ? null : d.actualExpenses)),
    borderColor: "rgb(239, 68, 68)",
    backgroundColor: "rgb(239, 68, 68)",
    borderWidth: 2,
    tension: 0.4,
    fill: false,
    spanGaps: false,
    order: 4,
    pointRadius: 5,
    pointHoverRadius: 7,
    pointBackgroundColor: "rgb(239, 68, 68)",
    pointBorderColor: "rgb(239, 68, 68)",
  });

  datasets.push({
    label: "Income",
    data: monthsData.map((d) => (d.isFuture ? null : d.actualIncome)),
    borderColor: "rgb(16, 185, 129)",
    backgroundColor: "rgb(16, 185, 129)",
    borderWidth: 2,
    tension: 0.4,
    fill: false,
    spanGaps: false,
    order: 3,
    pointRadius: 5,
    pointHoverRadius: 7,
    pointBackgroundColor: "rgb(16, 185, 129)",
    pointBorderColor: "rgb(16, 185, 129)",
  });

  // Add budget line if overall budget is set
  if (overallBudget > 0) {
    datasets.push({
      label: "Monthly Budget",
      data: monthsData.map(() => overallBudget),
      borderColor: "#0572ff",
      backgroundColor: "transparent",
      borderDash: [10, 5],
      borderWidth: 2.5,
      tension: 0,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0,
      order: 0,
    });
  }

  charts.trend = new Chart(ctx, {
    type: "line",
    data: {
      labels: monthsData.map((d) => d.month),
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      layout: {
        padding: {
          left: 5,
          right: 5,
          top: 10,
          bottom: 5,
        },
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue("--text-primary")
              .trim(),
            font: {
              family: "'Poppins', sans-serif",
            },
            padding: 15,
            generateLabels: (chart) => {
              const original =
                Chart.defaults.plugins.legend.labels.generateLabels(chart);
              // Filter out projected datasets and reorder remaining
              const order = ["Income", "Expenses", "Monthly Budget"];
              return original
                .filter((label) => !label.text.includes("Projected"))
                .sort((a, b) => {
                  const aIndex = order.indexOf(a.text);
                  const bIndex = order.indexOf(b.text);
                  return aIndex - bIndex;
                })
                .map((label) => {
                  // Add dashed line indicator for budget
                  if (label.text === "Monthly Budget") {
                    label.lineDash = [10, 5];
                  }
                  return label;
                });
            },
          },
        },
        filler: {
          propagate: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += formatCurrency(context.parsed.y);
              }
              return label;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: suggestedMax,
          ticks: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue("--text-secondary")
              .trim(),
            callback: (value) => formatCurrency(value),
            font: {
              family: "'Poppins', sans-serif",
            },
            padding: 10,
          },
          grid: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue("--border")
              .trim(),
            drawBorder: true,
          },
        },
        x: {
          ticks: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue("--text-secondary")
              .trim(),
            font: {
              family: "'Poppins', sans-serif",
            },
            maxRotation: 0,
            minRotation: 0,
            padding: 10,
          },
          grid: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue("--border")
              .trim(),
            drawBorder: true,
            offset: false,
          },
        },
      },
    },
  });
}
