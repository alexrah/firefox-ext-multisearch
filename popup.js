async function init() {
  const data = await browser.storage.local.get("settings");
  const settings = data.settings || {};
  document.documentElement.dataset.theme = settings.theme || "system";

  const engines = (settings.engines || []).filter(e => e.enabled).slice(0, 4);
  const preview = document.getElementById("engines-preview");
  engines.forEach(eng => {
    const chip = document.createElement("div");
    chip.className = "eng-chip";

    const dot = document.createElement("div");
    dot.className = "eng-dot";
    dot.style.background = eng.color;
    chip.appendChild(dot);

    const nameText = document.createTextNode(eng.name);
    chip.appendChild(nameText);

    preview.appendChild(chip);
  });

  document.getElementById("active-count").textContent = `${engines.length} engine${engines.length !== 1 ? "s" : ""} active`;

  function doSearch(q) {
    if (!q.trim()) return;
    const url = browser.runtime.getURL(`search.html?q=${encodeURIComponent(q.trim())}`);
    browser.tabs.create({ url });
    window.close();
  }

  document.getElementById("popup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    doSearch(document.getElementById("popup-input").value);
  });

  document.getElementById("btn-open-tab").addEventListener("click", () => {
    doSearch(document.getElementById("popup-input").value || "");
  });

  document.getElementById("btn-settings").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
    window.close();
  });
}

init();