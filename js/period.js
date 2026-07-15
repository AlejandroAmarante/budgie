// period.js — the "what time window am I looking at" concept behind the
// dashboard's month switcher. A period is always a concrete { start, end }
// Date range; `granularity` just remembers how it was chosen so the picker
// and the prev/next stepper know how to behave.

import { state, notify } from "./state.js";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  toISODate,
  toISOMonth,
  parseISODate,
} from "./utils.js";
import { openSheet } from "./sheet.js";
import { toast } from "./toast.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Move the period forward/backward by one unit of its own granularity.
 *  A custom range steps by its own length, so "next window of the same size". */
export function stepPeriod(period, direction) {
  const { granularity, start, end } = period;

  if (granularity === "day") {
    const d = new Date(start);
    d.setDate(d.getDate() + direction);
    return { granularity, start: startOfDay(d), end: endOfDay(d) };
  }

  if (granularity === "year") {
    const d = new Date(start);
    d.setFullYear(d.getFullYear() + direction);
    return { granularity, start: startOfYear(d), end: endOfYear(d) };
  }

  if (granularity === "range") {
    const lengthDays = Math.round((end - start) / DAY_MS) + 1;
    const shiftMs = lengthDays * DAY_MS * direction;
    return {
      granularity,
      start: new Date(start.getTime() + shiftMs),
      end: new Date(end.getTime() + shiftMs),
    };
  }

  const d = new Date(start);
  d.setMonth(d.getMonth() + direction);
  return { granularity: "month", start: startOfMonth(d), end: endOfMonth(d) };
}

export function formatPeriodLabel(period) {
  const { granularity, start, end } = period;

  if (granularity === "day") {
    return start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (granularity === "year") {
    return String(start.getFullYear());
  }
  if (granularity === "range") {
    const sameYear = start.getFullYear() === end.getFullYear();
    const startLabel = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: sameYear ? undefined : "numeric",
    });
    const endLabel = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startLabel} – ${endLabel}`;
  }
  return start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const GRANULARITIES = [
  { id: "day", label: "Day", icon: "ri-calendar-event-line" },
  { id: "month", label: "Month", icon: "ri-calendar-2-line" },
  { id: "year", label: "Year", icon: "ri-calendar-line" },
  { id: "range", label: "Range", icon: "ri-calendar-todo-line" },
];

export function openPeriodPicker() {
  let granularity = state.period.granularity;

  const container = document.createElement("div");
  container.innerHTML = `
    <div class="field">
      <span class="field-label">View by</span>
      <div class="chip-row" id="granularityChips">
        ${GRANULARITIES.map(
          (g) => `
          <button type="button" class="chip${g.id === granularity ? " is-selected" : ""}" data-granularity="${g.id}">
            <i class="${g.icon}" aria-hidden="true"></i>${g.label}
          </button>`,
        ).join("")}
      </div>
    </div>
    <div class="field" id="periodInputArea"></div>
  `;

  const { body } = openSheet({
    title: "View period",
    content: container,
    actions: [
      {
        label: "Apply",
        onClick: (closeFn) => {
          const period = readPeriodFromInputs(body, granularity);
          if (!period) return;
          state.period = period;
          notify();
          closeFn();
        },
      },
    ],
  });

  const inputArea = body.querySelector("#periodInputArea");

  function renderInputs() {
    inputArea.innerHTML = inputsMarkup(granularity, state.period);
  }
  renderInputs();

  body.querySelector("#granularityChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    granularity = chip.dataset.granularity;
    body
      .querySelectorAll("#granularityChips .chip")
      .forEach((c) => c.classList.toggle("is-selected", c === chip));
    renderInputs();
  });
}

function inputsMarkup(granularity, currentPeriod) {
  if (granularity === "day") {
    return `
      <label class="field-label" for="periodDay">Date</label>
      <input type="date" id="periodDay" class="input" value="${toISODate(currentPeriod.start)}">
    `;
  }
  if (granularity === "month") {
    return `
      <label class="field-label" for="periodMonth">Month</label>
      <input type="month" id="periodMonth" class="input" value="${toISOMonth(currentPeriod.start)}">
    `;
  }
  if (granularity === "year") {
    return `
      <label class="field-label" for="periodYear">Year</label>
      <input type="number" id="periodYear" class="input" inputmode="numeric" min="2000" max="2100" value="${currentPeriod.start.getFullYear()}">
    `;
  }
  // range
  const start = currentPeriod.start;
  const end =
    currentPeriod.granularity === "range"
      ? currentPeriod.end
      : currentPeriod.start;
  return `
    <label class="field-label" for="periodRangeStart">From</label>
    <input type="date" id="periodRangeStart" class="input" value="${toISODate(start)}" style="margin-bottom: var(--space-3)">
    <label class="field-label" for="periodRangeEnd">To</label>
    <input type="date" id="periodRangeEnd" class="input" value="${toISODate(end)}">
  `;
}

function readPeriodFromInputs(body, granularity) {
  if (granularity === "day") {
    const val = body.querySelector("#periodDay").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      toast("Enter a valid date", { icon: "ri-error-warning-line" });
      return null;
    }
    const d = parseISODate(val);
    return { granularity, start: startOfDay(d), end: endOfDay(d) };
  }

  if (granularity === "month") {
    const val = body.querySelector("#periodMonth").value; // "YYYY-MM"
    const match = /^(\d{4})-(\d{2})$/.exec(val);
    if (!match) {
      toast("Enter a valid month", { icon: "ri-error-warning-line" });
      return null;
    }
    const d = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return { granularity, start: startOfMonth(d), end: endOfMonth(d) };
  }

  if (granularity === "year") {
    const val = parseInt(body.querySelector("#periodYear").value, 10);
    if (!val || val < 1900 || val > 2200) {
      toast("Enter a valid year", { icon: "ri-error-warning-line" });
      return null;
    }
    const d = new Date(val, 0, 1);
    return { granularity, start: startOfYear(d), end: endOfYear(d) };
  }

  // range
  const startVal = body.querySelector("#periodRangeStart").value;
  const endVal = body.querySelector("#periodRangeEnd").value;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startVal) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endVal)
  ) {
    toast("Choose both a start and end date", {
      icon: "ri-error-warning-line",
    });
    return null;
  }
  const start = parseISODate(startVal);
  const end = parseISODate(endVal);
  if (start > end) {
    toast("Start date must be before the end date", {
      icon: "ri-error-warning-line",
    });
    return null;
  }
  return { granularity, start: startOfDay(start), end: endOfDay(end) };
}
