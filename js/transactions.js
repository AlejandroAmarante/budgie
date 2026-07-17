// transactions.js — the transaction list, search/filter, and the add/edit
// form sheet.

import { state, generateId, updateCategoriesSet, notify } from "./state.js";
import { saveToStorage } from "./storage.js";
import { formatCurrency, formatDate, escapeHtml, toISODate } from "./utils.js";
import { mountIconPicker, DEFAULT_ICON } from "./icons.js";
import { mountCategoryPicker } from "./category-picker.js";
import { openSheet, confirmDialog } from "./sheet.js";
import { toast } from "./toast.js";
import { getBudgetByCategory } from "./budgets.js";
import { RECURRENCE_OPTIONS, RECURRENCE_LABELS } from "./recurrence.js";
import { mountDatePicker } from "./datepicker.js";

const filters = { search: "", type: "all", category: "all" };

export function renderTransactionList() {
  const container = document.getElementById("transactionsList");
  if (!container) return;

  let list = state.transactions.filter((t) => {
    const matchesSearch =
      !filters.search ||
      t.category.toLowerCase().includes(filters.search) ||
      (t.notes && t.notes.toLowerCase().includes(filters.search));
    const matchesType = filters.type === "all" || t.type === filters.type;
    const matchesCategory = filters.category === "all" || t.category === filters.category;
    return matchesSearch && matchesType && matchesCategory;
  });

  list.sort((a, b) => {
    const aRecurring = a.recurrence && a.recurrence !== "none";
    const bRecurring = b.recurrence && b.recurrence !== "none";
    if (aRecurring !== bRecurring) return aRecurring ? -1 : 1;
    return new Date(b.date) - new Date(a.date);
  });

  updateFilterTrigger();

  if (list.length === 0) {
    const hasAny = state.transactions.length > 0;
    container.innerHTML = `
      <div class="empty-state">
        <i class="ri-receipt-line" aria-hidden="true"></i>
        <p>${hasAny ? "No matching transactions" : "No transactions yet"}</p>
        <span>${hasAny ? "Try a different search or filter." : "Add your first income or expense to get started."}</span>
        ${!hasAny ? '<button type="button" class="btn btn-primary" data-action="add-transaction"><i class="ri-add-line" aria-hidden="true"></i>Add a transaction</button>' : ""}
      </div>`;
    return;
  }

  container.innerHTML = list.map(renderTransactionRow).join("");
}

function renderTransactionRow(t) {
  const budget = getBudgetByCategory(t.category);
  const icon = budget?.icon || t.icon || (t.type === "income" ? "ri-arrow-up-circle-line" : "ri-arrow-down-circle-line");
  const isRecurring = t.recurrence && t.recurrence !== "none";

  return `
    <div class="transaction-row ${t.type}">
      <div class="transaction-icon"><i class="${icon}" aria-hidden="true"></i></div>
      <button type="button" class="transaction-info" data-action="edit-transaction" data-id="${t.id}"
              style="text-align:left; min-width:0;" ${t.isProjected ? "disabled" : ""}>
        <div class="transaction-category">
          ${escapeHtml(t.category)}
          ${isRecurring ? `<span class="badge badge-recurring"><i class="ri-repeat-line" aria-hidden="true"></i>${RECURRENCE_LABELS[t.recurrence]}</span>` : ""}
          ${t.isProjected ? '<span class="badge badge-recurring"><i class="ri-time-line" aria-hidden="true"></i>Projected</span>' : ""}
        </div>
        <div class="transaction-meta">${formatDate(t.date)}${t.notes ? ` · ${escapeHtml(t.notes)}` : ""}</div>
      </button>
      <div class="transaction-amount tabular-nums">${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)}</div>
      ${
        t.isProjected
          ? ""
          : `<div class="transaction-actions">
              <button type="button" class="icon-btn icon-btn-sm icon-btn-danger" data-action="delete-transaction" data-id="${t.id}" aria-label="Delete transaction">
                <i class="ri-delete-bin-line" aria-hidden="true"></i>
              </button>
            </div>`
      }
    </div>`;
}

export function setSearchFilter(value) {
  filters.search = value.toLowerCase();
  renderTransactionList();
}

export function getFilters() {
  return filters;
}

export function applyFilters({ type, category }) {
  filters.type = type;
  filters.category = category;
  renderTransactionList();
}

export function clearFilters() {
  filters.type = "all";
  filters.category = "all";
  renderTransactionList();
}

function updateFilterTrigger() {
  const trigger = document.getElementById("filterTrigger");
  if (!trigger) return;
  const active = filters.type !== "all" || filters.category !== "all";
  trigger.classList.toggle("has-filters", active);
}

// ---------- Form sheet ----------

export function openTransactionForm(transactionId = null) {
  const transaction = transactionId ? getTransaction(transactionId) : null;
  const isEdit = !!transaction;
  let type = transaction?.type || "expense";
  let selectedIcon = transaction?.icon || getBudgetByCategory(transaction?.category)?.icon || DEFAULT_ICON;
  let recurrence = transaction?.recurrence || "none";
  const initialRecurrence = recurrence;

  const form = document.createElement("form");
  form.id = "transactionForm";
  form.innerHTML = `
    <div class="segmented" id="typeSegmented" role="radiogroup" aria-label="Transaction type">
      <button type="button" data-value="expense" class="${type === "expense" ? "is-active" : ""}" role="radio" aria-checked="${type === "expense"}">
        <i class="ri-arrow-down-circle-line" aria-hidden="true"></i>Expense
      </button>
      <button type="button" data-value="income" class="${type === "income" ? "is-active" : ""}" role="radio" aria-checked="${type === "income"}">
        <i class="ri-arrow-up-circle-line" aria-hidden="true"></i>Income
      </button>
    </div>

    <div class="amount-field">
      <span class="currency-symbol">$</span>
      <input type="number" id="txAmount" inputmode="decimal" step="0.01" min="0.01" required
             placeholder="0.00" value="${isEdit ? transaction.amount : ""}" autofocus>
    </div>

    <div class="field">
      <label class="field-label" for="txCategoryPicker">Category</label>
      <div id="txCategoryPicker"></div>
    </div>

    <div class="field">
      <span class="field-label">Icon</span>
      <div class="icon-grid" id="txIconGrid"></div>
    </div>

    <div class="field">
      <label class="field-label" for="txDate">Date</label>
      <input type="text" id="txDate" class="input" readonly required
             value="${isEdit ? transaction.date : toISODate(new Date())}">
    </div>

    <div class="field">
      <label class="field-label" for="txNotes">Notes (optional)</label>
      <textarea id="txNotes" class="textarea" placeholder="Add a note…">${isEdit ? escapeHtml(transaction.notes || "") : ""}</textarea>
    </div>

    <div class="switch-row">
      <span class="switch-label"><i class="ri-repeat-line" aria-hidden="true"></i>Repeats</span>
      <button type="button" id="txRecurrence" class="chip${initialRecurrence !== "none" ? " is-selected" : ""}" data-value="${initialRecurrence}">
        <i class="ri-repeat-line" aria-hidden="true"></i><span id="txRecurrenceLabel">${RECURRENCE_LABELS[initialRecurrence]}</span>
      </button>
    </div>
  `;

  const { close, body } = openSheet({
    title: isEdit ? "Edit transaction" : "Add transaction",
    content: form,
    onDismiss: () => datePicker?.destroy(),
    actions: [
      {
        label: isEdit ? "Save changes" : "Add transaction",
        onClick: () => form.requestSubmit && form.requestSubmit(),
      },
    ],
  });

  const datePicker = mountDatePicker(body.querySelector("#txDate"), {
    value: isEdit ? transaction.date : toISODate(new Date()),
  });

  // Type segmented control
  const typeButtons = body.querySelectorAll("#typeSegmented button");
  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      type = btn.dataset.value;
      typeButtons.forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-checked", b === btn ? "true" : "false");
      });
    });
  });

  // Recurrence chip — tap to cycle through none -> daily -> weekly -> monthly -> yearly
  const recurrenceBtn = body.querySelector("#txRecurrence");
  recurrenceBtn.addEventListener("click", () => {
    const nextIndex = (RECURRENCE_OPTIONS.indexOf(recurrence) + 1) % RECURRENCE_OPTIONS.length;
    recurrence = RECURRENCE_OPTIONS[nextIndex];
    recurrenceBtn.dataset.value = recurrence;
    recurrenceBtn.classList.toggle("is-selected", recurrence !== "none");
    body.querySelector("#txRecurrenceLabel").textContent = RECURRENCE_LABELS[recurrence];
  });

  // Category + icon pickers
  const categoryPicker = mountCategoryPicker(body.querySelector("#txCategoryPicker"), {
    selectedCategory: transaction?.category || "",
    onSelect: (category, icon) => {
      if (icon) {
        selectedIcon = icon;
        mountIconPicker(body.querySelector("#txIconGrid"), selectedIcon, (icon) => (selectedIcon = icon));
      }
    },
  });
  mountIconPicker(body.querySelector("#txIconGrid"), selectedIcon, (icon) => (selectedIcon = icon));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      amount: parseFloat(body.querySelector("#txAmount").value),
      type,
      category: categoryPicker.getValue(),
      date: body.querySelector("#txDate").value,
      notes: body.querySelector("#txNotes").value.trim(),
      recurrence,
      icon: selectedIcon,
    };
    const ok = saveTransaction(transactionId, data);
    if (ok) {
      close();
      toast(isEdit ? "Transaction updated" : `${data.type === "income" ? "Income" : "Expense"} added`);
    }
  });
}

export function saveTransaction(transactionId, data) {
  const { amount, type, category, date } = data;
  if (!amount || amount <= 0 || !type || !category || !date) {
    toast("Please fill in an amount, category, and date", { icon: "ri-error-warning-line" });
    return false;
  }

  if (transactionId) {
    const index = state.transactions.findIndex((t) => t.id === transactionId);
    if (index !== -1) state.transactions[index] = { ...state.transactions[index], ...data };
  } else {
    state.transactions.push({ id: generateId(), ...data });
  }

  saveToStorage();
  updateCategoriesSet();
  notify();
  return true;
}

export async function handleDeleteTransaction(id) {
  const confirmed = await confirmDialog({
    title: "Delete this transaction?",
    message: "This can't be undone.",
    confirmLabel: "Delete",
    danger: true,
  });
  if (!confirmed) return;

  state.transactions = state.transactions.filter((t) => t.id !== id);
  saveToStorage();
  updateCategoriesSet();
  notify();
  toast("Transaction deleted");
}

export function getTransaction(id) {
  return state.transactions.find((t) => t.id === id);
}

// ---------- Filter sheet ----------

export function openFilterSheet() {
  const form = document.createElement("div");
  let type = filters.type;
  let category = filters.category;

  const categories = Array.from(state.categories).sort();

  form.innerHTML = `
    <div class="filter-group">
      <div class="filter-group-label">Type</div>
      <div class="segmented" id="filterTypeSegmented">
        <button type="button" data-value="all" class="${type === "all" ? "is-active" : ""}">All</button>
        <button type="button" data-value="income" class="${type === "income" ? "is-active" : ""}">Income</button>
        <button type="button" data-value="expense" class="${type === "expense" ? "is-active" : ""}">Expense</button>
      </div>
    </div>
    <div class="filter-group">
      <div class="filter-group-label">Category</div>
      <div class="chip-row" id="filterCategoryChips">
        <button type="button" class="chip${category === "all" ? " is-selected" : ""}" data-category="all">All categories</button>
        ${categories
          .map(
            (c) => `<button type="button" class="chip${category === c ? " is-selected" : ""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
          )
          .join("")}
      </div>
    </div>
  `;

  const { body } = openSheet({
    title: "Filter transactions",
    content: form,
    actions: [
      { label: "Clear filters", variant: "secondary", onClick: (closeFn) => { clearFilters(); closeFn(); } },
      { label: "Apply", onClick: (closeFn) => { applyFilters({ type, category }); closeFn(); } },
    ],
  });

  body.querySelectorAll("#filterTypeSegmented button").forEach((btn) => {
    btn.addEventListener("click", () => {
      type = btn.dataset.value;
      body.querySelectorAll("#filterTypeSegmented button").forEach((b) => b.classList.toggle("is-active", b === btn));
    });
  });

  body.querySelector("#filterCategoryChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    category = chip.dataset.category;
    body.querySelectorAll("#filterCategoryChips .chip").forEach((c) => c.classList.toggle("is-selected", c === chip));
  });
}
