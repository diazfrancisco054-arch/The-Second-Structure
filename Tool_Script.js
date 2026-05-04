/*---------------------------Startup Starts---------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".div1");
  const nav = document.querySelector(".div2");

  if (header && nav) {
    const updatePinnedOffset = () => {
      document.documentElement.style.setProperty(
        "--pinned-header-height",
        `${header.offsetHeight}px`
      );
    };

    updatePinnedOffset();
    window.addEventListener("resize", updatePinnedOffset);
  }

  initializeNavCollapse();
  initializeToolPanels();
  initializeArtboard();
  new ImageManager();
});
/*----------------------------Startup Ends----------------------------*/

function initializeNavCollapse() {
  const stickyHeader = document.querySelector(".sticky-header");
  const toggle = document.querySelector(".nav-collapse-toggle");

  if (!stickyHeader || !toggle) return;

  toggle.addEventListener("click", () => {
    const isCollapsed = stickyHeader.classList.toggle("nav-collapsed");
    toggle.setAttribute("aria-expanded", String(!isCollapsed));
  });
}

/*-------------------------Tool Panels Starts-------------------------*/
function initializeToolPanels() {
  const menus = document.querySelectorAll(".tool-menu");
  const panels = document.querySelectorAll(".detail-panel");
  const detailShell = document.querySelector(".tool-detail");
  const triggers = document.querySelectorAll("[data-open-panel]");
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
      return;
    }

    if (activeMenu && activePanel) {
      activeMenu.insertAdjacentElement("afterend", activePanel);
    }
  }

  function openPanel(panelId, { forceOpen = false } = {}) {
    const currentMenu = document.querySelector(`.tool-menu.active[data-panel="${panelId}"]`);
    const shouldClose = Boolean(currentMenu) && !forceOpen;

    panels.forEach(panel => {
      panel.classList.toggle("active", !shouldClose && panel.id === panelId);
    });

    menus.forEach(menu => {
      menu.classList.toggle("active", !shouldClose && menu.dataset.panel === panelId);
    });

    detailShell?.classList.toggle("is-empty", shouldClose);
    syncPanelPlacement();

    if (!shouldClose && panelId === "artboard-panel" && typeof window.refreshArtboardCanvas === "function") {
      requestAnimationFrame(() => window.refreshArtboardCanvas());
    }
  }

  triggers.forEach(trigger => {
    trigger.addEventListener("click", () => {
      openPanel(trigger.dataset.openPanel, {
        forceOpen: trigger.dataset.forceOpen === "true"
      });

      if (trigger.dataset.artboardOverlay && typeof window.setArtboardReferenceOverlay === "function") {
        requestAnimationFrame(() => {
          window.setArtboardReferenceOverlay(trigger.dataset.artboardOverlay, true);
        });
      }
    });
  });

  stackedBreakpoint.addEventListener("change", syncPanelPlacement);
  syncPanelPlacement();
  window.openToolPanel = openPanel;
}
/*--------------------------Tool Panels Ends--------------------------*/

/*--------------------------Artboard Starts---------------------------*/
function initializeArtboard() {
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const canvas = document.getElementById("artboard");
  const previewCanvas = document.getElementById("artboardPreview");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const previewCtx = previewCanvas ? previewCanvas.getContext("2d") : null;

  let W = 0;
  let H = 0;
  let tool = "wall";
  let grid = 20;
  let stroke = 6;
  let snap = true;
  let objects = [];
  let history = [];
  let isPointerDown = false;
  let startPt = null;
  let preview = null;
  let selectedIds = new Set();
  let activeReference = "";

  const toolButtons = document.querySelectorAll(".tool-btn");
  const gridInput = document.getElementById("gridSize");
  const strokeInput = document.getElementById("strokeSize");
  const snapToggle = document.getElementById("snapToggle");
  const clearBtn = document.getElementById("clearBtn");
  const undoBtn = document.getElementById("undoBtn");
  const exportBtn = document.getElementById("exportBtn");
  const exportPdfBtn = document.getElementById("exportPdfBtn");
  const referenceAssets = {
    floorplan: {
      src: "Images/Floor%20plan%20for%20house%20remodel.png",
      image: new Image(),
      loaded: false
    }
  };

  function downloadText(filename, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function getReferenceAsset(referenceName = activeReference) {
    return referenceName ? referenceAssets[referenceName] ?? null : null;
  }

  function setReferenceOverlay(referenceName = "", forceVisible = true) {
    const nextReference = forceVisible && getReferenceAsset(referenceName) ? referenceName : "";

    if (nextReference === activeReference) {
      draw();
      return;
    }

    pushHistory();
    activeReference = nextReference;
    selectedIds.clear();
    isPointerDown = false;
    startPt = null;
    preview = null;
    draw();
  }

  Object.values(referenceAssets).forEach(asset => {
    asset.image.decoding = "async";
    asset.image.addEventListener("load", () => {
      asset.loaded = true;
      draw();
    });
    asset.image.src = asset.src;
  });

  function updatePreviewCanvas() {
    if (!previewCanvas || !previewCtx) return;

    const rect = previewCanvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
    const height = Math.max(1, Math.floor(rect.height * devicePixelRatio));

    if (previewCanvas.width !== width || previewCanvas.height !== height) {
      previewCanvas.width = width;
      previewCanvas.height = height;
    }

    previewCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    previewCtx.clearRect(0, 0, rect.width, rect.height);

    previewCtx.fillStyle = "#fff";
    previewCtx.fillRect(0, 0, rect.width, rect.height);

    const previewGrid = 18;
    previewCtx.save();
    previewCtx.lineWidth = 1;
    previewCtx.strokeStyle = "rgba(0,0,0,0.05)";
    previewCtx.beginPath();
    for (let x = 0; x <= rect.width; x += previewGrid) {
      previewCtx.moveTo(x + 0.5, 0);
      previewCtx.lineTo(x + 0.5, rect.height);
    }
    for (let y = 0; y <= rect.height; y += previewGrid) {
      previewCtx.moveTo(0, y + 0.5);
      previewCtx.lineTo(rect.width, y + 0.5);
    }
    previewCtx.stroke();
    previewCtx.restore();

    if (!W || !H) return;

    const scale = Math.min(rect.width / W, rect.height / H);
    const offsetX = (rect.width - W * scale) / 2;
    const offsetY = (rect.height - H * scale) / 2;

    previewCtx.save();
    previewCtx.translate(offsetX, offsetY);
    previewCtx.scale(scale, scale);
    drawReferenceImage(previewCtx, W, H);

    for (const object of objects) {
      drawObject(previewCtx, object, false, false);
    }

    if (preview) {
      drawObject(previewCtx, preview, false, true);
    }

    previewCtx.restore();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    W = rect.width;
    H = rect.height;
    draw();
  }

  function snapPoint(x, y) {
    if (!snap) return { x, y };
    return {
      x: Math.round(x / grid) * grid,
      y: Math.round(y / grid) * grid
    };
  }

  function pointerPos(evt) {
    const r = canvas.getBoundingClientRect();
    return snapPoint(evt.clientX - r.left, evt.clientY - r.top);
  }

  function pushHistory() {
    history.push({
      objects: structuredClone(objects),
      selectedIds: Array.from(selectedIds),
      activeReference
    });

    if (history.length > 50) history.shift();
  }

  function distancePointToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const tt = clamp(t, 0, 1);
    const cx = x1 + tt * dx;
    const cy = y1 + tt * dy;
    return Math.hypot(px - cx, py - cy);
  }

  function hitTest(pt) {
    for (let i = objects.length - 1; i >= 0; i -= 1) {
      const object = objects[i];

      if (object.type === "wall") {
        const threshold = Math.max(8, object.stroke + 6);
        if (
          distancePointToSegment(
            pt.x,
            pt.y,
            object.x1,
            object.y1,
            object.x2,
            object.y2
          ) <= threshold
        ) {
          return object;
        }
      } else if (
        pt.x >= object.x &&
        pt.x <= object.x + object.w &&
        pt.y >= object.y &&
        pt.y <= object.y + object.h
      ) {
        return object;
      }
    }

    return null;
  }

  function cancelPreview() {
    isPointerDown = false;
    startPt = null;
    preview = null;
    draw();
  }

  function rectFromPoints(a, b, minW, minH) {
    let x = Math.min(a.x, b.x);
    let y = Math.min(a.y, b.y);
    let w = Math.abs(b.x - a.x);
    let h = Math.abs(b.y - a.y);

    w = Math.max(minW, w);
    h = Math.max(minH, h);

    if (snap) {
      w = Math.round(w / grid) * grid || minW;
      h = Math.round(h / grid) * grid || minH;
    }

    return { x, y, w, h };
  }

  function nextId() {
    return objects.reduce((max, object) => Math.max(max, object.id || 0), 0) + 1;
  }

  function commitPreview(item) {
    const id = nextId();

    if (item.type === "wall") {
      return { id, type: "wall", x1: item.x1, y1: item.y1, x2: item.x2, y2: item.y2, stroke: item.stroke };
    }

    if (item.type === "window") return { id, type: "window", x: item.x, y: item.y, w: item.w, h: item.h };
    if (item.type === "door") return { id, type: "door", x: item.x, y: item.y, w: item.w, h: item.h, swing: item.swing };
    if (item.type === "stairs") return { id, type: "stairs", x: item.x, y: item.y, w: item.w, h: item.h, steps: item.steps };
    return { id, ...item };
  }

  function exportPdf() {
    const imageUrl = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank", "width=1100,height=850");

    if (!printWindow) {
      alert("Please allow pop-ups so the artboard can open for PDF export.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Artboard PDF Export</title>
        <style>
          body {
            margin: 0;
            padding: 24px;
            font-family: "Times New Roman", Times, serif;
            background: #ffffff;
            color: #111111;
          }
          h1 {
            margin: 0 0 10px;
            font-size: 24px;
          }
          p {
            margin: 0 0 18px;
            color: #555555;
          }
          img {
            width: 100%;
            height: auto;
            border: 1px solid #dddddd;
            border-radius: 12px;
          }
          @media print {
            body {
              padding: 0;
            }
            img {
              border: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <h1>Architectural Artboard</h1>
        <p>Use your browser's Save as PDF option to complete the export.</p>
        <img src="${imageUrl}" alt="Architectural Artboard export">
        <script>
          window.addEventListener("load", function () {
            setTimeout(function () {
              window.print();
            }, 250);
          });
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function drawGrid(targetCtx, width, height) {
    targetCtx.save();
    targetCtx.lineWidth = 1;
    targetCtx.strokeStyle = "rgba(0,0,0,0.06)";
    targetCtx.beginPath();

    for (let x = 0; x <= width; x += grid) {
      targetCtx.moveTo(x + 0.5, 0);
      targetCtx.lineTo(x + 0.5, height);
    }

    for (let y = 0; y <= height; y += grid) {
      targetCtx.moveTo(0, y + 0.5);
      targetCtx.lineTo(width, y + 0.5);
    }

    targetCtx.stroke();
    targetCtx.restore();
  }

  function drawReferenceImage(targetCtx, width, height) {
    const asset = getReferenceAsset();

    if (!asset?.loaded || !asset.image.naturalWidth || !asset.image.naturalHeight) {
      return;
    }

    const padding = Math.max(22, Math.min(width, height) * 0.045);
    const availableWidth = Math.max(1, width - padding * 2);
    const availableHeight = Math.max(1, height - padding * 2);
    const scale = Math.min(
      availableWidth / asset.image.naturalWidth,
      availableHeight / asset.image.naturalHeight
    );
    const drawWidth = asset.image.naturalWidth * scale;
    const drawHeight = asset.image.naturalHeight * scale;
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;

    targetCtx.save();
    targetCtx.globalAlpha = 0.76;
    targetCtx.drawImage(asset.image, x, y, drawWidth, drawHeight);
    targetCtx.strokeStyle = "rgba(79, 70, 70, 0.12)";
    targetCtx.lineWidth = 1.5;
    targetCtx.strokeRect(x, y, drawWidth, drawHeight);
    targetCtx.restore();
  }

  function drawObject(targetCtx, object, isSelected, isPreview = false) {
    targetCtx.save();

    if (isPreview) {
      targetCtx.globalAlpha = 0.7;
      targetCtx.setLineDash([6, 6]);
    } else {
      targetCtx.setLineDash([]);
    }

    if (object.type === "wall") {
      targetCtx.lineWidth = object.stroke ?? stroke;
      targetCtx.strokeStyle = isSelected ? "#0d6efd" : "#212529";
      targetCtx.lineCap = "round";
      targetCtx.beginPath();
      targetCtx.moveTo(object.x1, object.y1);
      targetCtx.lineTo(object.x2, object.y2);
      targetCtx.stroke();
    }

    if (object.type === "window") {
      targetCtx.lineWidth = 2;
      targetCtx.strokeStyle = isSelected ? "#0d6efd" : "#198754";
      targetCtx.fillStyle = "rgba(25,135,84,0.08)";
      targetCtx.fillRect(object.x, object.y, object.w, object.h);
      targetCtx.strokeRect(object.x, object.y, object.w, object.h);
      targetCtx.beginPath();
      targetCtx.moveTo(object.x + object.w / 2, object.y);
      targetCtx.lineTo(object.x + object.w / 2, object.y + object.h);
      targetCtx.moveTo(object.x, object.y + object.h / 2);
      targetCtx.lineTo(object.x + object.w, object.y + object.h / 2);
      targetCtx.stroke();
    }

    if (object.type === "door") {
      targetCtx.lineWidth = 2;
      targetCtx.strokeStyle = isSelected ? "#0d6efd" : "#fd7e14";
      targetCtx.fillStyle = "rgba(253,126,20,0.08)";
      targetCtx.fillRect(object.x, object.y, object.w, object.h);
      targetCtx.strokeRect(object.x, object.y, object.w, object.h);

      const hingeX = object.swing === "L" ? object.x : object.x + object.w;
      const hingeY = object.y + object.h;
      const radius = Math.min(object.w, object.h);
      const leafX = object.swing === "L" ? hingeX + radius : hingeX - radius;
      const leafY = hingeY - radius;

      targetCtx.beginPath();
      targetCtx.moveTo(hingeX, hingeY);
      targetCtx.lineTo(leafX, leafY);
      targetCtx.stroke();

      targetCtx.beginPath();
      targetCtx.arc(
        hingeX,
        hingeY,
        radius,
        Math.PI,
        object.swing === "L" ? Math.PI * 1.5 : Math.PI * 0.5,
        object.swing === "L"
      );
      targetCtx.stroke();
    }

    if (object.type === "stairs") {
      targetCtx.lineWidth = 2;
      targetCtx.strokeStyle = isSelected ? "#0d6efd" : "#6f42c1";
      targetCtx.fillStyle = "rgba(111,66,193,0.06)";
      targetCtx.fillRect(object.x, object.y, object.w, object.h);
      targetCtx.strokeRect(object.x, object.y, object.w, object.h);

      const steps = object.steps ?? 6;
      const stepH = object.h / steps;
      targetCtx.beginPath();
      for (let i = 1; i < steps; i += 1) {
        const y = object.y + i * stepH;
        targetCtx.moveTo(object.x, y);
        targetCtx.lineTo(object.x + object.w, y);
      }
      targetCtx.stroke();
    }

    targetCtx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, W, H);
    drawReferenceImage(ctx, W, H);

    for (const object of objects) {
      drawObject(ctx, object, selectedIds.has(object.id));
    }

    if (preview) {
      drawObject(ctx, preview, false, true);
    }

    updatePreviewCanvas();
  }

  toolButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      toolButtons.forEach(button => button.classList.remove("active"));
      btn.classList.add("active");
      tool = btn.dataset.tool;
      cancelPreview();
    });
  });

  gridInput?.addEventListener("input", () => {
    grid = clamp(parseInt(gridInput.value || "20", 10), 5, 80);
    document.documentElement.style.setProperty("--grid", grid);
    draw();
  });

  strokeInput?.addEventListener("input", () => {
    stroke = clamp(parseInt(strokeInput.value || "6", 10), 1, 20);
    draw();
  });

  snapToggle?.addEventListener("change", () => {
    snap = snapToggle.checked;
  });

  clearBtn?.addEventListener("click", () => {
    pushHistory();
    objects = [];
    activeReference = "";
    selectedIds.clear();
    cancelPreview();
    draw();
  });

  undoBtn?.addEventListener("click", () => {
    if (!history.length) return;
    const previous = history.pop();
    objects = previous.objects;
    selectedIds = new Set(previous.selectedIds);
    activeReference = previous.activeReference ?? "";
    cancelPreview();
    draw();
  });

  exportBtn?.addEventListener("click", () => {
    const payload = {
      meta: {
        grid,
        stroke,
        exportedAt: new Date().toISOString(),
        referenceOverlay: activeReference || null
      },
      referenceAsset: activeReference
        ? {
            name: activeReference,
            src: getReferenceAsset(activeReference)?.src ?? null
          }
        : null,
      objects
    };
    downloadText("artboard.json", JSON.stringify(payload, null, 2));
  });

  exportPdfBtn?.addEventListener("click", exportPdf);

  canvas.addEventListener("pointerdown", evt => {
    canvas.setPointerCapture(evt.pointerId);
    const pt = pointerPos(evt);
    isPointerDown = true;

    const hit = hitTest(pt);
    const multi = evt.ctrlKey || evt.metaKey;

    if (hit && !startPt && !preview) {
      if (!multi) selectedIds.clear();
      if (selectedIds.has(hit.id)) selectedIds.delete(hit.id);
      else selectedIds.add(hit.id);
      draw();
      startPt = pt;
    } else {
      if (!multi) selectedIds.clear();
      startPt = pt;
      draw();
    }
  });

  canvas.addEventListener("pointermove", evt => {
    if (!isPointerDown || !startPt) return;
    const pt = pointerPos(evt);
    const dx = pt.x - startPt.x;
    const dy = pt.y - startPt.y;

    if (!preview && Math.abs(dx) + Math.abs(dy) < 4) {
      draw();
      return;
    }

    if (tool === "wall") {
      preview = {
        type: "wall",
        x1: startPt.x,
        y1: startPt.y,
        x2: pt.x,
        y2: pt.y,
        stroke
      };
    } else if (tool === "window") {
      const rect = rectFromPoints(startPt, pt, 80, 18);
      preview = { type: "window", ...rect };
    } else if (tool === "door") {
      const rect = rectFromPoints(startPt, pt, 90, 24);
      preview = { type: "door", ...rect, swing: dx >= 0 ? "R" : "L" };
    } else if (tool === "stairs") {
      const rect = rectFromPoints(startPt, pt, 120, 60);
      preview = { type: "stairs", ...rect, steps: Math.max(3, Math.round(rect.h / 16)) };
    }

    draw();
  });

  canvas.addEventListener("pointerup", () => {
    if (!isPointerDown) return;
    isPointerDown = false;

    if (preview) {
      pushHistory();
      const committed = commitPreview(preview);
      objects.push(committed);
      selectedIds.clear();
      selectedIds.add(committed.id);
    }

    startPt = null;
    preview = null;
    draw();
  });

  window.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      cancelPreview();
    }

    if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.size) {
      pushHistory();
      objects = objects.filter(object => !selectedIds.has(object.id));
      selectedIds.clear();
      draw();
    }
  });

  const canvasResizeObserver = new ResizeObserver(resizeCanvas);
  canvasResizeObserver.observe(canvas);

  if (previewCanvas) {
    const previewResizeObserver = new ResizeObserver(updatePreviewCanvas);
    previewResizeObserver.observe(previewCanvas);
  }

  window.addEventListener("resize", updatePreviewCanvas);
  window.setArtboardReferenceOverlay = setReferenceOverlay;
  window.refreshArtboardCanvas = resizeCanvas;
  resizeCanvas();
}
/*---------------------------Artboard Ends----------------------------*/

/*------------------------Image Manager Starts------------------------*/
class ImageManager {
  constructor() {
    this.images = [];
    this.filteredImages = [];
    this.currentFilter = "all";
    this.currentSearch = "";
    this.storageKey = "imageManagerImages";
    this.dbName = "ImageManagerDB";
    this.dbStoreName = "imageState";

    this.initializeElements();
    this.bindEvents();
    this.renderLoadingState();
    this.initialize();
  }

  async initialize() {
    const storedImages = await this.loadPersistedImages();
    this.images = storedImages.map(image => this.normalizeImage(image));
    this.filteredImages = [...this.images];
    this.applyFilters();
  }

  renderLoadingState() {
    this.imageGrid.innerHTML = `
      <div class="empty-state">
        <h3>Loading saved images...</h3>
        <p>Your uploaded files are being restored.</p>
      </div>
    `;
  }

  initializeElements() {
    this.uploadArea = document.getElementById("uploadArea");
    this.fileInput = document.getElementById("fileInput");
    this.fileStatusText = document.getElementById("fileStatusText");
    this.imageGrid = document.getElementById("imageGrid");
    this.searchInput = document.getElementById("searchInput");
    this.filterButtons = document.querySelectorAll(".filter-btn");
    this.imageModal = document.getElementById("imageModal");
    this.modalImage = document.getElementById("modalImage");
    this.imageName = document.getElementById("imageName");
    this.imageSize = document.getElementById("imageSize");
    this.closeModal = document.getElementById("closeModal");
    this.favoriteBtn = document.getElementById("favoriteBtn");
    this.templateButtons = {
      template1: document.getElementById("template1Btn"),
      template2: document.getElementById("template2Btn"),
      template3: document.getElementById("template3Btn")
    };
    this.downloadBtn = document.getElementById("downloadBtn");
    this.deleteBtn = document.getElementById("deleteBtn");
    this.currentImage = null;
  }

  bindEvents() {
    this.fileInput.addEventListener("change", event => this.handleFileUpload(event));

    this.uploadArea.addEventListener("dragover", event => this.handleDragOver(event));
    this.uploadArea.addEventListener("dragleave", event => this.handleDragLeave(event));
    this.uploadArea.addEventListener("drop", event => this.handleDrop(event));

    this.searchInput.addEventListener("input", event => this.handleSearch(event));
    this.filterButtons.forEach(btn => {
      btn.addEventListener("click", event => this.handleFilter(event));
    });

    this.closeModal.addEventListener("click", () => this.closeImageModal());
    this.imageModal.addEventListener("click", event => {
      if (event.target === this.imageModal) this.closeImageModal();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") this.closeImageModal();
    });

    this.favoriteBtn.addEventListener("click", () => this.toggleFavorite());
    Object.entries(this.templateButtons).forEach(([templateKey, button]) => {
      if (button) {
        button.addEventListener("click", () => this.toggleTemplate(templateKey));
      }
    });
    this.downloadBtn.addEventListener("click", () => this.downloadImage());
    this.deleteBtn.addEventListener("click", () => this.deleteImage());
  }

  normalizeImage(image) {
    return {
      ...image,
      isFavorite: Boolean(image.isFavorite),
      template1: Boolean(image.template1),
      template2: Boolean(image.template2),
      template3: Boolean(image.template3)
    };
  }

  async loadPersistedImages() {
    const localImages = this.getImagesFromLocalStorage();
    const indexedDbImages = await this.getImagesFromIndexedDB();

    if (indexedDbImages.length > 0) {
      return indexedDbImages;
    }

    if (localImages.length > 0) {
      await this.persistImages(localImages);
      return localImages;
    }

    return [];
  }

  getImagesFromLocalStorage() {
    try {
      const savedImages = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      return Array.isArray(savedImages) ? savedImages : [];
    } catch (error) {
      console.warn("Unable to parse saved images from localStorage.", error);
      return [];
    }
  }

  openDatabase() {
    if (!("indexedDB" in window)) {
      return Promise.resolve(null);
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.dbStoreName)) {
          db.createObjectStore(this.dbStoreName, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => {
      console.warn("IndexedDB is unavailable for image storage.", error);
      this.dbPromise = null;
      return null;
    });

    return this.dbPromise;
  }

  async getImagesFromIndexedDB() {
    const db = await this.openDatabase();
    if (!db) return [];

    return new Promise(resolve => {
      const transaction = db.transaction(this.dbStoreName, "readonly");
      const store = transaction.objectStore(this.dbStoreName);
      const request = store.get(this.storageKey);

      request.onsuccess = () => {
        const savedImages = request.result?.value;
        resolve(Array.isArray(savedImages) ? savedImages : []);
      };

      request.onerror = () => {
        console.warn("Unable to read saved images from IndexedDB.", request.error);
        resolve([]);
      };
    });
  }

  async persistImages(images = this.images) {
    const savedToIndexedDb = await this.saveImagesToIndexedDB(images);
    if (savedToIndexedDb) {
      localStorage.removeItem(this.storageKey);
      return true;
    }

    return this.saveImagesToLocalStorage(images);
  }

  async saveImagesToIndexedDB(images) {
    const db = await this.openDatabase();
    if (!db) return false;

    return new Promise(resolve => {
      const transaction = db.transaction(this.dbStoreName, "readwrite");
      const store = transaction.objectStore(this.dbStoreName);
      const request = store.put({
        key: this.storageKey,
        value: images,
        updatedAt: new Date().toISOString()
      });

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.warn("Unable to save images to IndexedDB.", request.error);
        resolve(false);
      };
    });
  }

  saveImagesToLocalStorage(images) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(images));
      return true;
    } catch (error) {
      console.warn("Unable to save images to localStorage.", error);
      alert("Storage is full, so this image change may not stay after refresh.");
      return false;
    }
  }

  readFileAsImageData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = event => {
        resolve({
          id: Date.now() + Math.random(),
          name: file.name,
          size: this.formatFileSize(file.size),
          src: event.target.result,
          uploadDate: new Date().toISOString(),
          isFavorite: false,
          template1: false,
          template2: false,
          template3: false
        });
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  handleFileUpload(event) {
    this.updateFileStatus(event.target.files);
    this.processFiles(event.target.files);
    this.fileInput.value = "";
  }

  handleDragOver(event) {
    event.preventDefault();
    this.uploadArea.classList.add("dragover");
  }

  handleDragLeave(event) {
    event.preventDefault();
    this.uploadArea.classList.remove("dragover");
  }

  handleDrop(event) {
    event.preventDefault();
    this.uploadArea.classList.remove("dragover");
    this.updateFileStatus(event.dataTransfer.files);
    this.processFiles(event.dataTransfer.files);
  }

  updateFileStatus(files) {
    if (!this.fileStatusText) return;
    if (!files || files.length === 0) {
      this.fileStatusText.textContent = "No file chosen";
      return;
    }

    if (files.length === 1) {
      this.fileStatusText.textContent = files[0].name;
      return;
    }

    this.fileStatusText.textContent = `${files.length} files selected`;
  }

  async processFiles(files) {
    if (!files || files.length === 0) return;

    try {
      const validFiles = Array.from(files).filter(file => {
        if (file.type.startsWith("image/")) {
          return true;
        }

        alert(`The file "${file.name}" is not a valid image.`);
        return false;
      });

      if (validFiles.length === 0) return;

      this.uploadArea.classList.add("loading");
      const newImages = await Promise.all(validFiles.map(file => this.readFileAsImageData(file)));
      this.images = [...newImages.reverse(), ...this.images];
      this.applyFilters();
      await this.persistImages();
    } catch (error) {
      console.error("Unable to process uploaded images.", error);
      alert("One or more images could not be uploaded.");
    } finally {
      this.uploadArea.classList.remove("loading");
    }
  }

  handleSearch(event) {
    this.currentSearch = event.target.value.toLowerCase();
    this.applyFilters();
  }

  handleFilter(event) {
    const filter = event.target.dataset.filter;
    this.filterButtons.forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");
    this.currentFilter = filter;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredImages = this.images.filter(image => {
      const matchesSearch = image.name.toLowerCase().includes(this.currentSearch);
      let matchesFilter = true;

      switch (this.currentFilter) {
        case "recent": {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          matchesFilter = new Date(image.uploadDate) > oneWeekAgo;
          break;
        }
        case "favorites":
          matchesFilter = image.isFavorite;
          break;
        case "template1":
        case "template2":
        case "template3":
          matchesFilter = Boolean(image[this.currentFilter]);
          break;
        default:
          matchesFilter = true;
      }

      return matchesSearch && matchesFilter;
    });

    this.renderImages();
  }

  renderImages() {
    if (this.filteredImages.length === 0) {
      this.imageGrid.innerHTML = `
        <div class="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <h3>No images to show</h3>
          <p>Upload images or adjust filters to find images</p>
        </div>
      `;
      return;
    }

    this.imageGrid.innerHTML = this.filteredImages.map(image => `
      <div class="image-card" data-id="${image.id}">
        <img src="${image.src}" alt="${image.name}" loading="lazy">
        <div class="image-overlay">
          <h3>${this.truncateText(image.name, 20)}</h3>
          <p>${image.size}</p>
        </div>
        <div class="card-tags">
          ${image.isFavorite ? '<span class="card-tag">Favorite</span>' : ""}
          ${image.template1 ? '<span class="card-tag">Direction 1</span>' : ""}
          ${image.template2 ? '<span class="card-tag">Direction 2</span>' : ""}
          ${image.template3 ? '<span class="card-tag">Direction 3</span>' : ""}
        </div>
        <div class="favorite-indicator ${image.isFavorite ? "active" : ""}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${image.isFavorite ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </div>
      </div>
    `).join("");

    document.querySelectorAll(".image-card").forEach(card => {
      card.addEventListener("click", () => this.openImageModal(card.dataset.id));
    });
  }

  openImageModal(imageId) {
    this.currentImage = this.images.find(img => img.id == imageId);
    if (!this.currentImage) return;

    this.modalImage.src = this.currentImage.src;
    this.modalImage.alt = this.currentImage.name;
    this.imageName.textContent = this.currentImage.name;
    this.imageName.title = this.currentImage.name;
    this.imageSize.textContent = this.currentImage.size;
    this.updateActionButtons();
    this.imageModal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  closeImageModal() {
    this.imageModal.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => {
      this.currentImage = null;
    }, 300);
  }

  getActionIcon(fill) {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    `;
  }

  updateFavoriteButton() {
    if (!this.currentImage) return;

    const isFavorite = this.currentImage.isFavorite;
    this.favoriteBtn.innerHTML = `
      ${this.getActionIcon(isFavorite ? "currentColor" : "none")}
      ${isFavorite ? "Remove from Favorites" : "Favorite"}
    `;
    this.favoriteBtn.classList.toggle("active", isFavorite);
  }

  updateTemplateButton(templateKey, label) {
    const button = this.templateButtons[templateKey];
    if (!button || !this.currentImage) return;

    const isActive = Boolean(this.currentImage[templateKey]);
    button.innerHTML = `
      ${this.getActionIcon(isActive ? "currentColor" : "none")}
      <span>${isActive ? `Remove ${label}` : label}</span>
    `;
    button.classList.toggle("active", isActive);
  }

  updateActionButtons() {
    this.updateFavoriteButton();
    this.updateTemplateButton("template1", "Direction 1");
    this.updateTemplateButton("template2", "Direction 2");
    this.updateTemplateButton("template3", "Direction 3");
  }

  async toggleFavorite() {
    if (!this.currentImage) return;

    this.currentImage.isFavorite = !this.currentImage.isFavorite;
    this.updateActionButtons();
    this.applyFilters();
    await this.persistImages();
  }

  async toggleTemplate(templateKey) {
    if (!this.currentImage) return;

    this.currentImage[templateKey] = !this.currentImage[templateKey];
    this.updateActionButtons();
    this.applyFilters();
    await this.persistImages();
  }

  downloadImage() {
    if (!this.currentImage) return;

    const link = document.createElement("a");
    link.href = this.currentImage.src;
    link.download = this.currentImage.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async deleteImage() {
    if (!this.currentImage) return;

    if (confirm(`Are you sure you want to delete this image "${this.currentImage.name}"?`)) {
      this.images = this.images.filter(img => img.id !== this.currentImage.id);
      this.applyFilters();
      await this.persistImages();
      this.closeImageModal();
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }
}
/*-------------------------Image Manager Ends-------------------------*/
