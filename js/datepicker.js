// datepicker.js — thin wrapper around Flatpickr so every date field in
// Budgie gets the same custom-themed calendar instead of inconsistent
// native browser date inputs. Flatpickr and its monthSelect plugin are
// loaded as global scripts from index.html (same pattern as Chart.js).

function isAvailable() {
  if (typeof window.flatpickr === "function") return true;
  console.warn("Flatpickr failed to load — falling back to a plain text date field.");
  return false;
}

const baseOptions = {
  disableMobile: true, // always use our themed calendar, even on touch devices
  animate: false,
  static: true, // render inline within the sheet instead of appending to <body>
  altInput: true, // show a friendly formatted date; the original input keeps the raw value
  altInputClass: "input",
  onOpen: (selectedDates, dateStr, instance) => {
    instance.altInput?.scrollIntoView({ behavior: "smooth", block: "center" });
  },
};

/** Single-day picker. `onChange` receives a "YYYY-MM-DD" string. */
export function mountDatePicker(input, { value, onChange } = {}) {
  if (!isAvailable()) {
    input.removeAttribute("readonly");
    if (value) input.value = value;
    input.addEventListener("input", () => onChange?.(input.value));
    return null;
  }
  return window.flatpickr(input, {
    ...baseOptions,
    dateFormat: "Y-m-d",
    altFormat: "F j, Y",
    defaultDate: value || undefined,
    onChange: (selectedDates, dateStr) => onChange?.(dateStr),
  });
}

/** Month + year picker. `onChange` receives a "YYYY-MM" string. */
export function mountMonthPicker(input, { value, onChange } = {}) {
  if (!isAvailable()) {
    input.removeAttribute("readonly");
    input.placeholder = "YYYY-MM";
    if (value) input.value = value;
    input.addEventListener("input", () => onChange?.(input.value));
    return null;
  }
  return window.flatpickr(input, {
    ...baseOptions,
    dateFormat: "Y-m",
    altFormat: "F Y",
    plugins: [new window.monthSelectPlugin({ shorthand: false, dateFormat: "Y-m", altFormat: "F Y" })],
    defaultDate: value ? `${value}-01` : undefined,
    onChange: (selectedDates, dateStr) => onChange?.(dateStr),
  });
}

/** Range picker (single input, shows "start to end"). `onChange` receives
 *  two Date objects once both ends of the range are picked. */
export function mountRangePicker(input, { start, end, onChange } = {}) {
  if (!isAvailable()) {
    input.removeAttribute("readonly");
    input.placeholder = "YYYY-MM-DD to YYYY-MM-DD";
    return null;
  }
  return window.flatpickr(input, {
    ...baseOptions,
    mode: "range",
    dateFormat: "Y-m-d",
    altFormat: "M j, Y",
    defaultDate: start && end ? [start, end] : undefined,
    onChange: (selectedDates) => {
      if (selectedDates.length === 2) onChange?.(selectedDates[0], selectedDates[1]);
    },
  });
}
