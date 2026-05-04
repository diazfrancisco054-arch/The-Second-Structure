document.addEventListener("DOMContentLoaded", () => {
  initializePinnedHeaderOffset();
  initializeNavCollapse();
  initializeToolPanels();
});

function initializeNavCollapse() {
  const stickyHeader = document.querySelector(".sticky-header");
  const toggle = document.querySelector(".nav-collapse-toggle");

  if (!stickyHeader || !toggle) return;

  toggle.addEventListener("click", () => {
    const isCollapsed = stickyHeader.classList.toggle("nav-collapsed");
    toggle.setAttribute("aria-expanded", String(!isCollapsed));
  });
}

function initializePinnedHeaderOffset() {
  const header = document.querySelector(".div1");
  const nav = document.querySelector(".div2");

  if (!header || !nav) return;

  const updatePinnedOffset = () => {
    document.documentElement.style.setProperty(
      "--pinned-header-height",
      `${header.offsetHeight}px`
    );
  };

  updatePinnedOffset();
  window.addEventListener("resize", updatePinnedOffset);
}

function initializeToolPanels() {
  const menus = Array.from(document.querySelectorAll(".tool-menu"));
  const panels = Array.from(document.querySelectorAll(".detail-panel"));
  const detailShell = document.querySelector(".tool-detail");
  const triggers = Array.from(document.querySelectorAll("[data-open-panel]"));
  const stackedBreakpoint = window.matchMedia("(max-width: 1100px)");

  function syncPanelPlacement() {
    const activeMenu = document.querySelector(".tool-menu.active");
    const activePanel = document.querySelector(".detail-panel.active");

    panels.forEach(panel => {
      if (panel.parentElement !== detailShell && panel !== activePanel) {
        detailShell?.appendChild(panel);
      }
    });

    if (!stackedBreakpoint.matches) {
      panels.forEach(panel => {
        if (panel.parentElement !== detailShell) {
          detailShell?.appendChild(panel);
        }
      });
      detailShell?.classList.toggle("is-empty", !activePanel);
      return;
    }

    if (activeMenu && activePanel) {
      activeMenu.insertAdjacentElement("afterend", activePanel);
    }

    detailShell?.classList.toggle("is-empty", !activePanel);
  }

  function openPanel(panelId) {
    const currentMenu = document.querySelector(`.tool-menu.active[data-panel="${panelId}"]`);
    const shouldClose = Boolean(currentMenu);

    panels.forEach(panel => {
      panel.classList.toggle("active", !shouldClose && panel.id === panelId);
    });

    menus.forEach(menu => {
      menu.classList.toggle("active", !shouldClose && menu.dataset.panel === panelId);
    });

    detailShell?.classList.toggle("is-empty", shouldClose);
    syncPanelPlacement();
  }

  triggers.forEach(trigger => {
    trigger.addEventListener("click", () => openPanel(trigger.dataset.openPanel));
  });

  if (typeof stackedBreakpoint.addEventListener === "function") {
    stackedBreakpoint.addEventListener("change", syncPanelPlacement);
  } else if (typeof stackedBreakpoint.addListener === "function") {
    stackedBreakpoint.addListener(syncPanelPlacement);
  }

  detailShell?.classList.toggle("is-empty", !document.querySelector(".detail-panel.active"));
  syncPanelPlacement();
}
