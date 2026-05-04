const zoningDocuments = [
  {
    city: "Philadelphia, PA",
    title: "Zoning Code Quick Guide",
    format: "PDF",
    focus: "Base districts, use tables, and permit paths",
    summary: "A quick-reference zoning guide covering residential, mixed-use, and industrial districts plus permit paths.",
    tags: ["base districts", "use table", "permits", "residential"],
    pdfUrl: "https://www.phila.gov/media/20260213170558/ZONING-QUICK-GUIDE_feb-2026.pdf",
    sourceUrl: "https://www.phila.gov/documents/zoning-code-information-manual-quick-guide/",
    sourceLabel: "City of Philadelphia"
  },
  {
    city: "Pittsburgh, PA",
    title: "Original Zoning Code Text",
    format: "PDF",
    focus: "Code text used alongside current fair-housing amendments",
    summary: "A downloadable zoning code text reference that helps trace the baseline rules behind ongoing amendment work.",
    tags: ["code text", "amendments", "housing", "reuse"],
    pdfUrl: "https://engage.pittsburghpa.gov/download_file/9512/1749",
    sourceUrl: "https://engage.pittsburghpa.gov/fair-housing-amendments",
    sourceLabel: "City of Pittsburgh"
  },
  {
    city: "Detroit, MI",
    title: "Chapter 61 Zoning Ordinance",
    format: "PDF",
    focus: "Zoning ordinance reference for land use and redevelopment review",
    summary: "A city ordinance PDF useful for checking zoning requirements during neighborhood reinvestment and adaptive reuse planning.",
    tags: ["ordinance", "land use", "redevelopment", "detroit"],
    pdfUrl: "https://detroitmi.gov/Portals/0/docs/BSEE%2520-%2520Zoning/Ch61.pdf",
    sourceUrl: "https://detroitmi.gov/document/ch-61-zoning-ordinance-august-7-2019",
    sourceLabel: "City of Detroit"
  },
  {
    city: "Buffalo, NY",
    title: "Unified Development Ordinance",
    format: "PDF",
    focus: "Green Code districts, frontage, and development standards",
    summary: "Buffalo's Unified Development Ordinance for district rules, frontage standards, and neighborhood-scale redevelopment guidance.",
    tags: ["green code", "frontage", "districts", "development"],
    pdfUrl: "https://www.buffalony.gov/DocumentCenter/View/12313/Unified-Development-Ordinance-Updated-092023",
    sourceUrl: "https://www.buffalony.gov/390/City-Zoning-Ordinances-Districts",
    sourceLabel: "City of Buffalo"
  },
  {
    city: "Cleveland, OH",
    title: "Zoning Use Table",
    format: "PDF",
    focus: "Allowed uses by zoning district",
    summary: "A district-by-district use table that is helpful for quickly checking whether residential or mixed-use programs fit a zone.",
    tags: ["use table", "districts", "allowed uses", "cleveland"],
    pdfUrl: "https://planning.clevelandohio.gov/zoning/pdf/2018-Zoning-Table.pdf",
    sourceUrl: "https://planning.clevelandohio.gov/zoning/index.php",
    sourceLabel: "Cleveland City Planning Commission"
  },
  {
    city: "Baltimore, MD",
    title: "Zoning Code Modifications Ordinance 25-015",
    format: "PDF",
    focus: "Recent zoning text changes affecting Article 32",
    summary: "A recent Baltimore ordinance PDF showing how zoning text changes are documented and published for official review.",
    tags: ["article 32", "modifications", "ordinance", "baltimore"],
    pdfUrl: "https://codes.baltimorecity.gov/us/md/cities/baltimore/ordinances/2025/enacted/25-015.pdf",
    sourceUrl: "https://codes.baltimorecity.gov/us/md/cities/baltimore/ordinances/2025/25-015",
    sourceLabel: "City of Baltimore Law Library"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  initializePinnedHeaderOffset();
  initializeNavCollapse();
  initializeToolPanels();
  initializeZoningLibrary();
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

    if (!shouldClose && panelId === "zoning-panel") {
      requestAnimationFrame(() => {
        document.getElementById("zoningSearchInput")?.focus();
      });
    }
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

function initializeZoningLibrary() {
  const searchInput = document.getElementById("zoningSearchInput");
  const resultsContainer = document.getElementById("zoningResults");
  const resultCount = document.getElementById("zoningResultCount");

  if (!searchInput || !resultsContainer || !resultCount) return;

  const searchableDocuments = zoningDocuments.map(entry => ({
    ...entry,
    searchText: [
      entry.city,
      entry.title,
      entry.focus,
      entry.summary,
      entry.sourceLabel,
      entry.tags.join(" ")
    ].join(" ").toLowerCase()
  }));

  function render(query = "") {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = searchableDocuments.filter(entry => entry.searchText.includes(normalizedQuery));

    resultCount.textContent = matches.length === 1
      ? "Showing 1 PDF"
      : `Showing ${matches.length} PDFs`;

    if (matches.length === 0) {
      resultsContainer.innerHTML = `
        <div class="zoning-empty">
          <h3>No zoning PDFs matched that search.</h3>
          <p>Try a city name, a topic like setback or overlay, or a term such as adaptive reuse.</p>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = matches.map(createZoningCardMarkup).join("");
  }

  searchInput.addEventListener("input", event => {
    render(event.target.value);
  });

  render();
}

function createZoningCardMarkup(entry) {
  const tagsMarkup = entry.tags
    .map(tag => `<span>${escapeHtml(tag)}</span>`)
    .join("");

  return `
    <article class="zoning-card">
      <div class="zoning-card-top">
        <div class="zoning-card-dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="zoning-card-format">${escapeHtml(entry.format)}</span>
      </div>
      <div class="zoning-card-body">
        <p class="zoning-card-location">${escapeHtml(entry.city)}</p>
        <h3>${escapeHtml(entry.title)}</h3>
        <p class="zoning-card-focus">${escapeHtml(entry.focus)}</p>
        <p>${escapeHtml(entry.summary)}</p>
        <div class="zoning-chip-row">${tagsMarkup}</div>
      </div>
      <div class="zoning-card-footer">
        <span class="zoning-source">${escapeHtml(entry.sourceLabel)}</span>
        <div class="zoning-card-links">
          <a class="btn btn-dark btn-sm" href="${entry.pdfUrl}" target="_blank" rel="noreferrer" download>Download PDF</a>
          <a class="btn btn-outline-secondary btn-sm" href="${entry.sourceUrl}" target="_blank" rel="noreferrer">Source</a>
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
