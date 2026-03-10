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
  syncScrollCheckbox();
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

    // Drag handle
    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle";
    dragHandle.title = "Drag to reorder";
    dragHandle.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="4" cy="3" r="1.2"/><circle cx="8" cy="3" r="1.2"/>
      <circle cx="4" cy="6" r="1.2"/><circle cx="8" cy="6" r="1.2"/>
      <circle cx="4" cy="9" r="1.2"/><circle cx="8" cy="9" r="1.2"/>
    </svg>`;
    row.appendChild(dragHandle);

    // Color swatch
    const colorSwatch = document.createElement("div");
    colorSwatch.className = "engine-color-swatch";
    colorSwatch.style.background = eng.color || '#888';
    row.appendChild(colorSwatch);

    // Name input
    const nameInput = document.createElement("input");
    nameInput.className = "engine-name-input";
    nameInput.type = "text";
    nameInput.value = eng.name;
    nameInput.placeholder = "Name";
    nameInput.dataset.field = "name";
    nameInput.dataset.i = i.toString();
    row.appendChild(nameInput);

    // URL input
    const urlInput = document.createElement("input");
    urlInput.className = "engine-url-input";
    urlInput.type = "url";
    urlInput.value = eng.url;
    urlInput.placeholder = "https://…?q={query}";
    urlInput.dataset.field = "url";
    urlInput.dataset.i = i.toString();
    row.appendChild(urlInput);

    // Color input
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "engine-color-input";
    colorInput.value = eng.color || '#888888';
    colorInput.dataset.field = "color";
    colorInput.dataset.i = i.toString();
    colorInput.title = "Label color";
    row.appendChild(colorInput);

    // Toggle label
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "toggle";
    toggleLabel.title = eng.enabled ? "Enabled" : "Disabled";

    const toggleCheckbox = document.createElement("input");
    toggleCheckbox.type = "checkbox";
    toggleCheckbox.checked = eng.enabled;
    toggleCheckbox.dataset.field = "enabled";
    toggleCheckbox.dataset.i = i.toString();

    const toggleTrack = document.createElement("div");
    toggleTrack.className = "toggle-track";
    const toggleThumb = document.createElement("div");
    toggleThumb.className = "toggle-thumb";
    toggleTrack.appendChild(toggleThumb);

    toggleLabel.appendChild(toggleCheckbox);
    toggleLabel.appendChild(toggleTrack);
    row.appendChild(toggleLabel);

    // Delete button
    const deleteButton = document.createElement("button");
    deleteButton.className = "btn-icon";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.i = i.toString();
    deleteButton.title = "Remove";
    deleteButton.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>`;
    row.appendChild(deleteButton);

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

function syncScrollCheckbox(){

  const container = document.getElementById("sync-scroll-container");
  const syncScrollStatus = settings.syncScroll;

  // Toggle label
  const toggleLabel = document.createElement("label");
  toggleLabel.title = syncScrollStatus ? "Enabled" : "Disabled";

  const toggleCheckbox = document.createElement("input");
  toggleCheckbox.type = "checkbox";
  toggleCheckbox.checked = syncScrollStatus;
  toggleLabel.appendChild(toggleCheckbox);
  container.appendChild(toggleLabel);

  toggleCheckbox.addEventListener("change", (e) => {
    settings.syncScroll = e.target.checked;
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
    // Label
    const labelDiv = document.createElement("div");
    labelDiv.className = "shortcut-label";
    labelDiv.textContent = label;
    row.appendChild(labelDiv);

    // Shortcut code
    const codeEl = document.createElement("code");
    codeEl.style.fontSize = "13px";
    codeEl.style.color = "var(--text)";
    codeEl.style.background = "var(--surface2)";
    codeEl.style.padding = "4px 8px";
    codeEl.style.borderRadius = "4px";
    codeEl.style.border = "1px solid var(--border)";
    codeEl.textContent = shortcuts[key] || "Not set";
    row.appendChild(codeEl);

    // Instruction
    const instructionDiv = document.createElement("div");
    instructionDiv.style.fontSize = "11px";
    instructionDiv.style.color = "var(--muted)";
    instructionDiv.style.marginTop = "2px";
    instructionDiv.textContent = "Change in about:addons → Manage Extension Shortcuts";
    row.appendChild(instructionDiv);
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
  syncScrollCheckbox();
});

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

init();
