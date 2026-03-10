// ── State ────────────────────────────────────────────────────────────────────
let settings = null;
let currentQuery = "";
let syncScroll = true;
let focusedPanel = 0;
let panels = [];  // { el, iframe, engine, loadingEl }
let isSyncScrolling = false;

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  settings = await loadSettings();
  applyTheme(settings.theme);

  // Parse query from URL
  const params = new URLSearchParams(location.search);
  const q = params.get("q") || "";
  if (q) {
    document.getElementById("search-input").value = q;
    currentQuery = q;
    runSearch(q);
  }

  document.getElementById("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("search-input").value.trim();
    if (!q) return;
    currentQuery = q;
    history.replaceState(null, "", `?q=${encodeURIComponent(q)}`);
    runSearch(q);
  });

  document.getElementById("btn-sync-scroll").addEventListener("click", toggleSyncScroll);
  document.getElementById("btn-settings").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKey);

  // Listen for background command relay
  browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === "command") handleCommand(msg.command);
  });
}

// ── Settings ─────────────────────────────────────────────────────────────────
async function loadSettings() {
  const data = await browser.storage.local.get("settings");
  return data.settings || {};
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme || "system";
}

// ── Search ────────────────────────────────────────────────────────────────────
function runSearch(query) {
  const engines = (settings.engines || []).filter(e => e.enabled).slice(0, 4);
  if (!engines.length) {
    showEmptyState("No search engines enabled — open Settings to add some.");
    return;
  }
  hideEmptyState();
  buildPanels(engines, query);
}

function buildPanels(engines, query) {
  const wrap = document.getElementById("panels-wrap");
  wrap.innerHTML = "";
  panels = [];

  engines.forEach((engine, i) => {
    // Resize handle between panels
    if (i > 0) {
      const handle = document.createElement("div");
      handle.className = "resize-handle";
      addResizeHandlers(handle, i - 1, wrap);
      wrap.appendChild(handle);
    }

    const panel = createPanel(engine, i);
    wrap.appendChild(panel.el);
    panels.push(panel);

    // Load async — each independently
    setTimeout(() => loadPanel(panel, engine, query), i * 80);
  });

  // Focus first panel
  focusPanel(0);
}

function createPanel(engine, index) {
  const el = document.createElement("div");
  el.className = "panel";
  el.dataset.index = index;
  el.addEventListener("click", () => focusPanel(index));

  // Panel header
  const panelHeader = document.createElement("div");
  panelHeader.className = "panel-header";

  const engineDot = document.createElement("div");
  engineDot.className = "engine-dot";
  engineDot.style.background = engine.color || '#888';
  panelHeader.appendChild(engineDot);

  const engineLabel = document.createElement("div");
  engineLabel.className = "engine-label";
  engineLabel.textContent = engine.name;
  panelHeader.appendChild(engineLabel);

  const panelStatus = document.createElement("div");
  panelStatus.className = "panel-status";
  panelStatus.id = `status-${index}`;
  panelStatus.textContent = "Loading…";
  panelHeader.appendChild(panelStatus);

  const panelKbd = document.createElement("div");
  panelKbd.className = "panel-kbd";
  panelKbd.textContent = `Alt+${index + 1}`;
  panelHeader.appendChild(panelKbd);

  el.appendChild(panelHeader);

  // Panel iframe wrap
  const panelIframeWrap = document.createElement("div");
  panelIframeWrap.className = "panel-iframe-wrap";
  panelIframeWrap.id = `iframe-wrap-${index}`;

  const panelLoading = document.createElement("div");
  panelLoading.className = "panel-loading";
  panelLoading.id = `loading-${index}`;

  const spinner = document.createElement("div");
  spinner.className = "spinner";
  spinner.style.borderTopColor = engine.color || 'var(--accent)';
  panelLoading.appendChild(spinner);

  const loadingLabel = document.createElement("div");
  loadingLabel.className = "loading-label";
  loadingLabel.textContent = engine.name;
  panelLoading.appendChild(loadingLabel);

  panelIframeWrap.appendChild(panelLoading);

  const iframe = document.createElement("iframe");
  iframe.id = `iframe-${index}`;
  iframe.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals";
  iframe.loading = "lazy";
  panelIframeWrap.appendChild(iframe);

  const overlayEl = document.createElement("div");
  overlayEl.className = "scroll-overlay";
  overlayEl.id = `overlay-${index}`;
  panelIframeWrap.appendChild(overlayEl);

  el.appendChild(panelIframeWrap);

  const loadingEl = panelLoading;
  const statusEl = panelStatus;

  // Set up scroll overlay for sync scroll
  panelIframeWrap.addEventListener("wheel", (e) => {
    if (!syncScroll) return;
    e.preventDefault();
    console.log("wheel -> syncScrollAll", e.deltaY, e.deltaX);
    syncScrollAll(e.deltaY, e.deltaX);
  }, { passive: false });

  iframe.addEventListener("load", () => {
    loadingEl.classList.add("hidden");
    statusEl.textContent = "Loaded";
    setTimeout(() => { statusEl.textContent = ""; }, 2000);
  });

  return { el, iframe, engine, loadingEl, statusEl, overlayEl };
}

function loadPanel(panel, engine, query) {
  const url = engine.url.replace("{query}", encodeURIComponent(query));
  panel.iframe.src = url;
}

// ── Panel Focus ───────────────────────────────────────────────────────────────
function focusPanel(index) {
  focusedPanel = index;

  console.log("focusPanel", index, panels);

  panels[index].iframe.contentWindow.focus();
  panels.forEach((p, i) => {
    p.el.classList.toggle("focused", i === index);
  });
}

// ── Sync Scroll ───────────────────────────────────────────────────────────────
function toggleSyncScroll() {
  syncScroll = !syncScroll;
  document.getElementById("btn-sync-scroll").classList.toggle("active", syncScroll);
  document.getElementById("panels-wrap").classList.toggle("sync-scroll-active", syncScroll);

  document.getElementById("header").focus();

  showToast(syncScroll ? "Sync scroll: ON" : "Sync scroll: OFF");
}

function syncScrollAll(deltaY, deltaX) {
  if (isSyncScrolling) return;
  isSyncScrolling = true;

  document.querySelectorAll(".panel-iframe-wrap").forEach(iframeWrap => {
    iframeWrap.scrollBy({ left: deltaX, top: deltaY, behavior: "smooth" });
  });

  // panels.forEach(p => {
  //   try {
  //     p.iframe.contentWindow.scrollBy({ left: deltaX, top: deltaY, behavior: "auto" });
  //   } catch (e) { 
  //     /* cross-origin */
  //     console.log(e);
  //   }
  // });
  requestAnimationFrame(() => { isSyncScrolling = false; });
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
function handleKey(e) {
  if (e.altKey && e.key >= "1" && e.key <= "4") {
    e.preventDefault();
    focusPanel(parseInt(e.key) - 1);
    showToast(`Panel ${e.key} focused`);
  }
  if (e.altKey && e.key === "s") {
    e.preventDefault();
    toggleSyncScroll();
  }


  const fullHeight = document.getElementById("iframe-wrap-0").clientHeight;
  console.log('fullHeight', fullHeight);
  const halfHeight = fullHeight / 2;

    const scrollMap = {
      PageUp:   -fullHeight,
      PageDown:  fullHeight,
      u:        -halfHeight,
      d:         halfHeight,
    };

    if (e.key in scrollMap) {
      e.preventDefault(); // prevent default browser scroll behavior
      syncScrollAll(scrollMap[e.key], 0);
    }

}

function handleCommand(command) {
  const panelCmds = { "focus-panel-1": 0, "focus-panel-2": 1, "focus-panel-3": 2, "focus-panel-4": 3 };
  if (command in panelCmds) {
    focusPanel(panelCmds[command]);
    showToast(`Panel ${panelCmds[command] + 1} focused`);
  }
  if (command === "toggle-sync-scroll") toggleSyncScroll();
}

// ── Resize Panels ─────────────────────────────────────────────────────────────
function addResizeHandlers(handle, leftIndex, wrap) {
  let startX, startLeft, startRight;
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startX = e.clientX;
    const leftPanel = wrap.querySelectorAll(".panel")[leftIndex];
    const rightPanel = wrap.querySelectorAll(".panel")[leftIndex + 1];
    startLeft = leftPanel.offsetWidth;
    startRight = rightPanel.offsetWidth;
    handle.classList.add("dragging");

    const onMove = (e) => {
      const dx = e.clientX - startX;
      const total = startLeft + startRight;
      const newLeft = Math.max(120, Math.min(total - 120, startLeft + dx));
      leftPanel.style.flex = `0 0 ${newLeft}px`;
      rightPanel.style.flex = `0 0 ${total - newLeft}px`;
    };
    const onUp = () => {
      handle.classList.remove("dragging");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

// ── Empty State ───────────────────────────────────────────────────────────────
function showEmptyState(msg) {
  const el = document.getElementById("empty-state");
  el.classList.remove("hidden");
  el.querySelector(".empty-sub").textContent = msg || "Type a search query above";
}
function hideEmptyState() {
  document.getElementById("empty-state").classList.add("hidden");
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
