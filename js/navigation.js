// navigation.js - Mobile Navigation Handler
import { switchTab } from "./ui.js";
import { renderDashboard } from "./dashboard.js";
import { renderTransactions } from "./transactions.js";
import { renderBudgets } from "./budgets.js";

const mobileNav = document.getElementById("mobileNav");
const mobileNavOverlay = document.getElementById("mobileNavOverlay");

function openMobileNav() {
  mobileNav?.classList.add("active");
  mobileNavOverlay?.classList.add("active");
}

function closeMobileNav() {
  mobileNav?.classList.remove("active");
  mobileNavOverlay?.classList.remove("active");
}

function handleMobileTabClick(btn) {
  const tab = btn.dataset.tab;

  // Update mobile buttons
  document.querySelectorAll(".mobile-tab-btn").forEach((b) => {
    b.classList.remove("active");
  });
  btn.classList.add("active");

  // Update desktop buttons and switch tab
  const tabName = switchTab(tab);

  // Render appropriate content
  if (tabName === "dashboard") {
    renderDashboard();
  } else if (tabName === "transactions") {
    renderTransactions();
  } else if (tabName === "budgets") {
    renderBudgets();
  }

  // Close mobile menu
  closeMobileNav();
}

function updateMobileDarkModeText() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const mobileDarkModeBtn = document.getElementById("mobileDarkModeToggle");

  if (mobileDarkModeBtn) {
    if (isDark) {
      mobileDarkModeBtn.innerHTML = '<i class="ri-sun-line"></i> Light Mode';
    } else {
      mobileDarkModeBtn.innerHTML = '<i class="ri-moon-line"></i> Dark Mode';
    }
  }
}

export function setupMobileNavigation() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const closeMobileNavBtn = document.querySelector(".close-mobile-nav");
  const mobileTabBtns = document.querySelectorAll(".mobile-tab-btn[data-tab]");

  hamburgerBtn?.addEventListener("click", openMobileNav);
  closeMobileNavBtn?.addEventListener("click", closeMobileNav);
  mobileNavOverlay?.addEventListener("click", closeMobileNav);

  mobileTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => handleMobileTabClick(btn));
  });

  // Set initial text
  updateMobileDarkModeText();
}

export function setupMobileActions(
  toggleDarkModeCallback,
  openSettingsCallback
) {
  const mobileDarkModeToggle = document.getElementById("mobileDarkModeToggle");
  const mobileSettingsBtn = document.getElementById("mobileSettingsBtn");

  mobileDarkModeToggle?.addEventListener("click", () => {
    toggleDarkModeCallback();
    updateMobileDarkModeText();
    closeMobileNav();
  });

  mobileSettingsBtn?.addEventListener("click", () => {
    openSettingsCallback();
    closeMobileNav();
  });
}
