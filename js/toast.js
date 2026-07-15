// toast.js — brief, non-blocking status messages. Replaces window.alert()
// for anything that isn't a destructive confirmation.

let region = null;

function getRegion() {
  if (!region) {
    region = document.createElement("div");
    region.className = "toast-region";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    document.body.appendChild(region);
  }
  return region;
}

export function toast(message, { icon = "ri-checkbox-circle-line", duration = 3200 } = {}) {
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `<i class="${icon}" aria-hidden="true"></i><span>${message}</span>`;
  getRegion().appendChild(node);

  requestAnimationFrame(() => node.classList.add("is-visible"));

  setTimeout(() => {
    node.classList.remove("is-visible");
    setTimeout(() => node.remove(), 220);
  }, duration);
}
