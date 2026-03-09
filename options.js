const SHORTCUT_LABELS = {
  "focus-panel-1": "Focus Panel 1",
  "focus-panel-2": "Focus Panel 2",
  "focus-panel-3": "Focus Panel 3",
  "focus-panel-4": "Focus Panel 4",
  "toggle-sync-scroll": "Toggle Sync Scroll"
};

let settings = {};

async function init() {
  const data = await browser.storage.local.get("settings");
  settings = data.settings || { theme: "system", engines: [...DEFAULT_ENGINES] };
  if (!settings.engines) settings.engines = [...DEFAULT_ENGINES];

  applyTheme(settings.theme);
  renderTheme(settings.theme);
  renderEngines();
  renderShortcuts();
  updateEnabledCount();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme || "system";
}

function renderTheme(theme) {
  document.querySelectorAll(".theme-opt").forEach(el => {
    el.classList.toggle("active", el.dataset.theme === (theme || "system"));
  });
}

document.getElementById("theme-group").addEventListener("click", (e) => {
  const opt = e.target.closest(".theme-opt");
  if (!opt) return;
  settings.theme = opt.dataset.theme;
  applyTheme(settings.theme);
  renderTheme(settings.theme);
});

function renderEngines() {
  const list = document.getElementById("engines-list");
  list.innerHTML = "";
  settings.engines.forEach((eng, i) => {
    const row = document.createElement("div");
    row.className = "engine-row";
    row.draggable = true;
    row.dataset.index = i;
    row.innerHTML = `
      <div class="drag-handle" title="Drag to reorder">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="4" cy="3" r="1.2"/><circle cx="8" cy="3" r="1.2"/>
          <circle cx="4" cy="6" r="1.2"/><circle cx="8" cy="6" r="1.2"/>
          <circle cx="4" cy="9" r="1.2"/><circle cx="8" cy="9" r="1.2"/>
        </svg>
      </div>
      <div class="engine-color-swatch" style="background:${eng.color || '#888'}"></div>
      <input class="engine-name-input" type="text" value="${escHtml(eng.name)}" placeholder="Name" data-field="name" data-i="${i}">
      <input class="engine-url-input" type="url" value="${escHtml(eng.url)}" placeholder="https://…?q={query}" data-field="url" data-i="${i}">
      <input type="color" class="engine-color-input" value="${eng.color || '#888888'}" data-field="color" data-i="${i}" title="Label color">
      <label class="toggle" title="${eng.enabled ? 'Enabled' : 'Disabled'}">
        <input type="checkbox" ${eng.enabled ? "checked" : ""} data-field="enabled" data-i="${i}">
        <div class="toggle-track"><div class="toggle-thumb"></div></div>
      </label>
      <button class="btn-icon" data-action="delete" data-i="${i}" title="Remove">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
      </button>
    `;
    addDragHandlers(row, i);
    list.appendChild(row);
  });

  // Field change listeners
  list.querySelectorAll("input[data-i]").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const i = parseInt(e.target.dataset.i);
      const field = e.target.dataset.field;
      if (field === "enabled") {
        settings.engines[i].enabled = e.target.checked;
      } else if (field === "color") {
        settings.engines[i].color = e.target.value;
        const row = e.target.closest(".engine-row");
        row.querySelector(".engine-color-swatch").style.background = e.target.value;
      } else {
        settings.engines[i][field] = e.target.value;
      }
      updateEnabledCount();
    });
  });

  list.querySelectorAll("[data-action='delete']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const i = parseInt(e.currentTarget.dataset.i);
      settings.engines.splice(i, 1);
      renderEngines();
      updateEnabledCount();
    });
  });
}

function updateEnabledCount() {
  const n = settings.engines.filter(e => e.enabled).length;
  document.getElementById("enabled-count").textContent = `${n} enabled${n > 4 ? " (max 4 shown)" : ""}`;
}

// Drag-and-drop reorder
let dragSrcIndex = null;
function addDragHandlers(row, index) {
  row.addEventListener("dragstart", (e) => { dragSrcIndex = index; row.classList.add("dragging"); });
  row.addEventListener("dragend", () => row.classList.remove("dragging"));
  row.addEventListener("dragover", (e) => { e.preventDefault(); });
  row.addEventListener("drop", (e) => {
    e.preventDefault();
    if (dragSrcIndex === null || dragSrcIndex === index) return;
    const moved = settings.engines.splice(dragSrcIndex, 1)[0];
    settings.engines.splice(index, 0, moved);
    dragSrcIndex = null;
    renderEngines();
  });
}

document.getElementById("btn-add-engine").addEventListener("click", () => {
  const name = document.getElementById("add-name").value.trim();
  const url = document.getElementById("add-url").value.trim();
  if (!name || !url) { alert("Please enter both a name and URL."); return; }
  if (!url.includes("{query}")) { alert("URL must contain {query} as a placeholder."); return; }
  settings.engines.push({ id: Date.now().toString(), name, url, enabled: true, color: "#888888" });
  document.getElementById("add-name").value = "";
  document.getElementById("add-url").value = "";
  renderEngines();
  updateEnabledCount();
});

function renderShortcuts() {
  const grid = document.getElementById("shortcuts-display");
  grid.innerHTML = "";
  const shortcuts = settings.shortcuts || {};
  Object.entries(SHORTCUT_LABELS).forEach(([key, label]) => {
    const row = document.createElement("div");
    row.className = "shortcut-row";
    row.innerHTML = `
      <div class="shortcut-label">${label}</div>
      <code style="font-size:13px;color:var(--text);background:var(--surface2);padding:4px 8px;border-radius:4px;border:1px solid var(--border)">${shortcuts[key] || "Not set"}</code>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">Change in about:addons → Manage Extension Shortcuts</div>
    `;
    grid.appendChild(row);
  });
}

document.getElementById("btn-save").addEventListener("click", async () => {
  await browser.storage.local.set({ settings });
  const el = document.getElementById("save-status");
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
});

document.getElementById("btn-reset").addEventListener("click", async () => {
  if (!confirm("Reset all settings to defaults?")) return;
  settings = { theme: "system", engines: JSON.parse(JSON.stringify(DEFAULT_ENGINES)) };
  await browser.storage.local.set({ settings });
  applyTheme("system");
  renderTheme("system");
  renderEngines();
  renderShortcuts();
  updateEnabledCount();
});

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

init();
