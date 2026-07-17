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
} from "./utils.js";
import { openSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { mountDatePicker, mountMonthPicker, mountRangePicker } from "./datepicker.js";

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
    return { granularity, start: new Date(start.getTime() + shiftMs), end: new Date(end.getTime() + shiftMs) };
  }

  const d = new Date(start);
  d.setMonth(d.getMonth() + direction);
  return { granularity: "month", start: startOfMonth(d), end: endOfMonth(d) };
}

export function formatPeriodLabel(period) {
  const { granularity, start, end } = period;

  if (granularity === "day") {
    return start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
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
    const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  let activePicker = null;
  // Range mode's two dates arrive together via one flatpickr instance, so
  // they're tracked here rather than re-read from an input at Apply time.
  const rangeDraft = {
    start: state.period.start,
    end: state.period.granularity === "range" ? state.period.end : state.period.start,
  };

  const container = document.createElement("div");
  container.innerHTML = `
    <div class="field">
      <span class="field-label">View by</span>
      <div class="chip-row" id="granularityChips">
        ${GRANULARITIES.map(
          (g) => `
          <button type="button" class="chip${g.id === granularity ? " is-selected" : ""}" data-granularity="${g.id}">
            <i class="${g.icon}" aria-hidden="true"></i>${g.label}
          </button>`
        ).join("")}
      </div>
    </div>
    <div class="field" id="periodInputArea"></div>
  `;

  const { body } = openSheet({
    title: "View period",
    content: container,
    onDismiss: () => activePicker?.destroy(),
    actions: [
      {
        label: "Apply",
        onClick: (closeFn) => {
          const period = readPeriod(body, granularity, rangeDraft);
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
    activePicker?.destroy();
    activePicker = null;
    inputArea.innerHTML = inputsMarkup(granularity);
    activePicker = mountPicker(granularity, body, state.period, rangeDraft);
  }
  renderInputs();

  body.querySelector("#granularityChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    granularity = chip.dataset.granularity;
    body.querySelectorAll("#granularityChips .chip").forEach((c) => c.classList.toggle("is-selected", c === chip));
    renderInputs();
  });
}

function inputsMarkup(granularity) {
  if (granularity === "day") {
    return `
      <label class="field-label" for="periodDay">Date</label>
      <input type="text" id="periodDay" class="input" readonly>
    `;
  }
  if (granularity === "month") {
    return `
      <label class="field-label" for="periodMonth">Month</label>
      <input type="text" id="periodMonth" class="input" readonly>
    `;
  }
  if (granularity === "year") {
    return `
      <label class="field-label" for="periodYear">Year</label>
      <input type="number" id="periodYear" class="input" inputmode="numeric" min="1900" max="2200" value="${state.period.start.getFullYear()}">
    `;
  }
  // range
  return `
    <label class="field-label" for="periodRange">Date range</label>
    <input type="text" id="periodRange" class="input" readonly placeholder="Select a start and end date">
  `;
}

function mountPicker(granularity, body, currentPeriod, rangeDraft) {
  if (granularity === "day") {
    return mountDatePicker(body.querySelector("#periodDay"), { value: toISODate(currentPeriod.start) });
  }
  if (granularity === "month") {
    return mountMonthPicker(body.querySelector("#periodMonth"), {
      value: `${currentPeriod.start.getFullYear()}-${String(currentPeriod.start.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  if (granularity === "year") {
    return null; // plain number input, no calendar needed
  }
  // range
  return mountRangePicker(body.querySelector("#periodRange"), {
    start: rangeDraft.start,
    end: rangeDraft.end,
    onChange: (start, end) => {
      rangeDraft.start = start;
      rangeDraft.end = end;
    },
  });
}

function readPeriod(body, granularity, rangeDraft) {
  if (granularity === "day") {
    const val = body.querySelector("#periodDay").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      toast("Choose a date", { icon: "ri-error-warning-line" });
      return null;
    }
    const [y, m, d] = val.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return { granularity, start: startOfDay(date), end: endOfDay(date) };
  }

  if (granularity === "month") {
    const val = body.querySelector("#periodMonth").value; // "YYYY-MM"
    const match = /^(\d{4})-(\d{2})$/.exec(val);
    if (!match) {
      toast("Choose a month", { icon: "ri-error-warning-line" });
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
  if (!rangeDraft.start || !rangeDraft.end) {
    toast("Choose a start and end date", { icon: "ri-error-warning-line" });
    return null;
  }
  if (rangeDraft.start > rangeDraft.end) {
    toast("Start date must be before the end date", { icon: "ri-error-warning-line" });
    return null;
  }
  return { granularity, start: startOfDay(rangeDraft.start), end: endOfDay(rangeDraft.end) };
}
