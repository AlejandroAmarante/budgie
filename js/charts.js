// charts.js - Chart Rendering Module
import {
  state,
  getTransactionsForMonth,
  calculateOverallBudget,
} from "./state.js";
import { formatCurrency, generateColors } from "./ui.js";
import { saveToStorage } from "./storage.js";

const charts = {
  category: null,
  trend: null,
};

export function renderCategoryChart(monthTransactions) {
  const ctx = document.getElementById("categoryChart");
  const container = ctx.parentElement;

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
    charts.category = null;
  }

  // Check if there are any expenses at all across all time
  const hasAnyExpenses = state.transactions.some((t) => t.type === "expense");

  // Get the chart header and toggle container
  const chartCard = container.closest(".chart-card");
  const chartHeader = chartCard?.querySelector(".chart-header");
  const toggleContainer = chartHeader?.querySelector(".chart-type-toggle");

  if (!hasAnyExpenses) {
    ctx.style.display = "none";

    // Hide toggle buttons when no data - use visibility to preserve layout
    if (toggleContainer) {
      toggleContainer.style.visibility = "hidden";
      toggleContainer.style.opacity = "0";
      toggleContainer.style.pointerEvents = "none";
    }

    let emptyMessage = container.querySelector(".chart-empty-state");
    if (!emptyMessage) {
      emptyMessage = document.createElement("div");
      emptyMessage.className = "chart-empty-state";
      emptyMessage.innerHTML = `
        <i class="ri-pie-chart-line"></i>
        <p>Expenses will populate here.<br> Add expenses in the <button class="link-btn" id="goToTransactions">Transactions</button> tab</p>
      `;
      container.appendChild(emptyMessage);

      // Add click handler
      emptyMessage
        .querySelector("#goToTransactions")
        .addEventListener("click", () => {
          document.querySelector('[data-tab="transactions"]').click();
        });
    }
    emptyMessage.style.display = "flex";
    return;
  }

  // Show toggle buttons when data exists
  if (toggleContainer) {
    toggleContainer.style.visibility = "visible";
    toggleContainer.style.opacity = "1";
    toggleContainer.style.pointerEvents = "auto";
  }

  // Hide empty message and show canvas
  ctx.style.display = "block";
  const emptyMessage = container.querySelector(".chart-empty-state");
  if (emptyMessage) {
    emptyMessage.style.display = "none";
  }

  if (labels.length === 0) {
    ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height);
    return;
  }

  // Calculate total for tooltips and center text
  const total = data.reduce((sum, val) => sum + val, 0);

  // Center text plugin for doughnut chart
  const centerTextPlugin = {
    id: "centerText",
    afterDatasetsDraw(chart) {
      if (state.chartType !== "doughnut") return;

      const {
        ctx,
        chartArea: { left, top, width, height },
      } = chart;
      ctx.save();

      const centerX = left + width / 2;
      const centerY = top + height / 2;

      // Draw total label
      ctx.font = "bold 14px Poppins, sans-serif";
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--text-secondary")
        .trim();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Total", centerX, centerY - 15);

      // Draw total amount
      ctx.font = "bold 24px Poppins, sans-serif";
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--text-primary")
        .trim();
      ctx.fillText(formatCurrency(total), centerX, centerY + 10);

      ctx.restore();
    },
  };

  charts.category = new Chart(ctx, {
    type: state.chartType,
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
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed || 0;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${formatCurrency(value)} (${percentage}%)`;
            },
          },
        },
      },
    },
    plugins: [centerTextPlugin],
  });
}

export function initPieChartToggle() {
  const chartCard = document.querySelector(".chart-card.pie-chart");
  const chartHeader = chartCard.querySelector(".chart-header");

  // Check if toggle buttons already exist
  if (chartHeader.querySelector(".chart-type-toggle")) {
    return;
  }

  const toggleContainer = document.createElement("div");
  toggleContainer.className = "chart-type-toggle";

  // Check if there's any expense data to determine initial visibility
  const hasAnyExpenses = state.transactions.some((t) => t.type === "expense");

  // Set initial visibility state
  if (!hasAnyExpenses) {
    toggleContainer.style.visibility = "hidden";
    toggleContainer.style.opacity = "0";
    toggleContainer.style.pointerEvents = "none";
  }

  toggleContainer.innerHTML = `
    <button class="icon-btn chart-type-btn ${
      state.chartType === "pie" ? "active" : ""
    }" data-type="pie" title="Pie Chart">
      <i class="ri-pie-chart-fill"></i>
    </button>
    <button class="icon-btn chart-type-btn ${
      state.chartType === "doughnut" ? "active" : ""
    }" data-type="doughnut" title="Doughnut Chart">
      <i class="ri-donut-chart-fill"></i>
    </button>
  `;

  chartHeader.appendChild(toggleContainer);

  // Add click handlers
  toggleContainer.querySelectorAll(".chart-type-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const newType = btn.dataset.type;
      if (newType !== state.chartType) {
        state.chartType = newType;
        saveToStorage();

        // Update active state
        toggleContainer.querySelectorAll(".chart-type-btn").forEach((b) => {
          b.classList.remove("active");
        });
        btn.classList.add("active");

        // Re-render chart
        const monthTransactions = getTransactionsForMonth(state.currentMonth);
        renderCategoryChart(monthTransactions);
      }
    });
  });
}

export function initTrendChartToggle() {
  const chartCard = document.querySelector(".chart-card.line-chart");
  const chartHeader = chartCard.querySelector(".chart-header");

  // Check if toggle buttons already exist
  if (chartHeader.querySelector(".chart-type-toggle")) {
    return;
  }

  const toggleContainer = document.createElement("div");
  toggleContainer.className = "chart-type-toggle";

  // Check if there's any income/expense data to determine initial visibility
  const hasAnyIncomeOrExpense = state.transactions.some(
    (t) => t.type === "income" || t.type === "expense"
  );

  // Set initial visibility state
  if (!hasAnyIncomeOrExpense) {
    toggleContainer.style.visibility = "hidden";
    toggleContainer.style.opacity = "0";
    toggleContainer.style.pointerEvents = "none";
  }

  toggleContainer.innerHTML = `
    <button class="icon-btn chart-type-btn ${
      state.trendChartType === "line" ? "active" : ""
    }" data-type="line" title="Line Chart">
      <i class="ri-line-chart-line"></i>
    </button>
    <button class="icon-btn chart-type-btn ${
      state.trendChartType === "bar" ? "active" : ""
    }" data-type="bar" title="Bar Chart">
      <i class="ri-bar-chart-fill"></i>
    </button>
  `;

  chartHeader.appendChild(toggleContainer);

  // Add click handlers
  toggleContainer.querySelectorAll(".chart-type-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const newType = btn.dataset.type;
      if (newType !== state.trendChartType) {
        state.trendChartType = newType;
        saveToStorage();

        // Update active state
        toggleContainer.querySelectorAll(".chart-type-btn").forEach((b) => {
          b.classList.remove("active");
        });
        btn.classList.add("active");

        // Re-render chart
        renderTrendChart();
      }
    });
  });
}

export function renderTrendChart() {
  const ctx = document.getElementById("trendChart");
  const container = ctx.parentElement;

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  // Check if there are any income or expense transactions at all
  const hasAnyIncomeOrExpense = state.transactions.some(
    (t) => t.type === "income" || t.type === "expense"
  );

  // Get the chart header and toggle container
  const chartCard = container.closest(".chart-card");
  const chartHeader = chartCard?.querySelector(".chart-header");
  const toggleContainer = chartHeader?.querySelector(".chart-type-toggle");

  if (charts.trend) {
    charts.trend.destroy();
    charts.trend = null;
  }

  if (!hasAnyIncomeOrExpense) {
    ctx.style.display = "none";

    // Hide toggle buttons when no data - use visibility to preserve layout
    if (toggleContainer) {
      toggleContainer.style.visibility = "hidden";
      toggleContainer.style.opacity = "0";
      toggleContainer.style.pointerEvents = "none";
    }

    let emptyMessage = container.querySelector(".chart-empty-state");
    if (!emptyMessage) {
      emptyMessage = document.createElement("div");
      emptyMessage.className = "chart-empty-state";
      emptyMessage.innerHTML = `
        <i class="ri-line-chart-line"></i>
        <p>Income and expenses will populate here.<br>Add transactions in the <button class="link-btn" id="goToTransactionsFromTrend">Transactions</button> tab</p>
      `;
      container.appendChild(emptyMessage);

      // Add click handler
      emptyMessage
        .querySelector("#goToTransactionsFromTrend")
        .addEventListener("click", () => {
          document.querySelector('[data-tab="transactions"]').click();
        });
    }
    emptyMessage.style.display = "flex";
    return;
  }

  // Show toggle buttons when data exists
  if (toggleContainer) {
    toggleContainer.style.visibility = "visible";
    toggleContainer.style.opacity = "1";
    toggleContainer.style.pointerEvents = "auto";
  }

  // Hide empty message and show canvas
  ctx.style.display = "block";
  const emptyMessage = container.querySelector(".chart-empty-state");
  if (emptyMessage) {
    emptyMessage.style.display = "none";
  }

  const monthsData = [];

  // Center the current month in the chart (show 2 months before, current, 3 months after)
  for (let i = 2; i >= -2; i--) {
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

  // Determine chart type
  const chartType = state.trendChartType || "line";

  // Prepare datasets - order matters for proper layering (bottom to top)
  const datasets = [];

  if (chartType === "bar") {
    // Bar chart configuration - grouped bars
    datasets.push({
      label: "Income",
      data: monthsData.map((d) => (d.isFuture ? null : d.actualIncome)),
      backgroundColor: "rgb(16, 185, 129)",
      borderColor: "rgb(16, 185, 129)",
      borderWidth: 1,
    });

    datasets.push({
      label: "Expenses",
      data: monthsData.map((d) => (d.isFuture ? null : d.actualExpenses)),
      backgroundColor: "rgb(239, 68, 68)",
      borderColor: "rgb(239, 68, 68)",
      borderWidth: 1,
    });

    // Add projected data for future months
    if (hasFutureData) {
      datasets.push({
        label: "Projected Income",
        data: monthsData.map((d) =>
          d.isFuture ? d.actualIncome + d.projectedIncome : null
        ),
        backgroundColor: "rgba(16, 185, 129, 0.5)",
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 1,
        borderDash: [5, 5],
      });

      datasets.push({
        label: "Projected Expenses",
        data: monthsData.map((d) =>
          d.isFuture ? d.actualExpenses + d.projectedExpenses : null
        ),
        backgroundColor: "rgba(239, 68, 68, 0.5)",
        borderColor: "rgb(239, 68, 68)",
        borderWidth: 1,
        borderDash: [5, 5],
      });
    }
  } else {
    // Line chart configuration (existing logic)
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
  }

  // Add budget line if overall budget is set (works for both chart types)
  if (overallBudget > 0) {
    datasets.push({
      label: "Monthly Budget",
      data: monthsData.map(() => overallBudget),
      borderColor: "#0572ff",
      backgroundColor:
        chartType === "bar" ? "rgba(5, 114, 255, 0.2)" : "transparent",
      borderDash: [10, 5],
      borderWidth: 2.5,
      tension: 0,
      fill: false,
      pointRadius: chartType === "line" ? 0 : undefined,
      pointHoverRadius: chartType === "line" ? 0 : undefined,
      order: 0,
      type: "line", // Always render budget as line even in bar chart
    });
  }

  charts.trend = new Chart(ctx, {
    type: chartType,
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
            display: false,
            drawBorder: true,
          },
        },
      },
    },
  });
}
