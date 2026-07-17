// recurrence.js — generates the projected future occurrence dates of a
// recurring transaction within a given window. Kept separate from state.js
// since the occurrence math (month/year-end day clamping, weekly stepping,
// safety bounds) is a self-contained concern of its own.

import { parseISODate } from "./utils.js";

export const RECURRENCE_OPTIONS = ["none", "daily", "weekly", "monthly", "yearly"];

export const RECURRENCE_LABELS = {
  none: "None",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_OCCURRENCES = 2000; // safety cap — never realistically reached

/** Add N months, clamping to the last day of a shorter target month
 *  (Jan 31 + 1 month -> Feb 28/29, never rolling into March). */
function addMonthsClamped(date, months) {
  const day = date.getDate();
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfTarget = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(day, lastDayOfTarget));
  return first;
}

/** Add N years, clamping Feb 29 on non-leap target years to Feb 28. */
function addYearsClamped(date, years) {
  const target = new Date(date.getFullYear() + years, date.getMonth(), 1);
  const lastDayOfTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDayOfTarget));
  return target;
}

/**
 * Every future occurrence of a recurring transaction that falls within
 * [rangeStart, rangeEnd] (inclusive Date objects). Never includes the
 * original date itself — that's the "actual" entry, not a projection.
 */
export function occurrencesInRange(transaction, rangeStart, rangeEnd) {
  const { recurrence } = transaction;
  if (!recurrence || recurrence === "none") return [];

  const original = parseISODate(transaction.date);
  if (original > rangeEnd) return [];

  const occurrences = [];
  let guard = 0;

  if (recurrence === "daily") {
    let cursor = new Date(Math.max(original.getTime() + DAY_MS, rangeStart.getTime()));
    while (cursor <= rangeEnd && guard++ < MAX_OCCURRENCES) {
      occurrences.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + DAY_MS);
    }
    return occurrences;
  }

  if (recurrence === "weekly") {
    let cursor = new Date(original);
    if (cursor < rangeStart) {
      const weeksToSkip = Math.floor((rangeStart - cursor) / (DAY_MS * 7));
      cursor = new Date(cursor.getTime() + weeksToSkip * 7 * DAY_MS);
    }
    while (cursor <= rangeEnd && guard++ < MAX_OCCURRENCES) {
      if (cursor > original && cursor >= rangeStart) occurrences.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + 7 * DAY_MS);
    }
    return occurrences;
  }

  if (recurrence === "monthly") {
    for (let count = 1; guard++ < MAX_OCCURRENCES; count++) {
      const next = addMonthsClamped(original, count);
      if (next > rangeEnd) break;
      if (next >= rangeStart) occurrences.push(next);
    }
    return occurrences;
  }

  if (recurrence === "yearly") {
    for (let count = 1; guard++ < MAX_OCCURRENCES; count++) {
      const next = addYearsClamped(original, count);
      if (next > rangeEnd) break;
      if (next >= rangeStart) occurrences.push(next);
    }
    return occurrences;
  }

  return occurrences;
}
