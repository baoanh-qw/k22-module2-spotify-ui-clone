const tooltip = document.createElement("div");
tooltip.id = "app-tooltip";
tooltip.className = "app-tooltip";
tooltip.setAttribute("role", "tooltip");
tooltip.hidden = true;
document.body.appendChild(tooltip);

let activeTrigger = null;

function showTooltip(trigger) {
  const label = trigger.getAttribute("aria-label");

  if (!label) return;

  activeTrigger = trigger;
  tooltip.textContent = label;
  tooltip.hidden = false;
  tooltip.classList.remove("app-tooltip-below");
  trigger.setAttribute("aria-describedby", tooltip.id);

  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const horizontalPadding = 8;
  const left = Math.min(
    Math.max(
      triggerRect.left + triggerRect.width / 2,
      tooltipRect.width / 2 + horizontalPadding,
    ),
    window.innerWidth - tooltipRect.width / 2 - horizontalPadding,
  );

  tooltip.style.left = `${left}px`;

  if (triggerRect.top < tooltipRect.height + 16) {
    tooltip.classList.add("app-tooltip-below");
    tooltip.style.top = `${triggerRect.bottom + 8}px`;
  } else {
    tooltip.style.top = `${triggerRect.top - 8}px`;
  }
}

function hideTooltip(trigger) {
  if (activeTrigger !== trigger) return;

  if (trigger.getAttribute("aria-describedby") === tooltip.id) {
    trigger.removeAttribute("aria-describedby");
  }

  activeTrigger = null;
  tooltip.hidden = true;
}

document.querySelectorAll(".tooltip-trigger").forEach((trigger) => {
  trigger.addEventListener("pointerenter", () => showTooltip(trigger));
  trigger.addEventListener("pointerleave", () => hideTooltip(trigger));
  trigger.addEventListener("focus", () => showTooltip(trigger));
  trigger.addEventListener("blur", () => hideTooltip(trigger));
});

new MutationObserver((mutations) => {
  if (
    activeTrigger &&
    mutations.some(
      (mutation) =>
        mutation.target === activeTrigger && mutation.attributeName === "aria-label",
    )
  ) {
    showTooltip(activeTrigger);
  }
}).observe(document.body, {
  attributes: true,
  attributeFilter: ["aria-label"],
  subtree: true,
});
