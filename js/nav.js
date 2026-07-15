// nav.js — switches between the three main views. A single nav element is
// reused at every breakpoint (see layout.css), so this only ever needs to
// touch one set of buttons.

import { state } from "./state.js";
import { qsa } from "./utils.js";

export function switchView(view) {
  state.currentView = view;

  qsa(".nav-item[data-view]").forEach((btn) => {
    const active = btn.dataset.view === view;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-current", active ? "page" : "false");
  });

  qsa(".view").forEach((section) => section.classList.toggle("is-active", section.id === view));

  return view;
}
