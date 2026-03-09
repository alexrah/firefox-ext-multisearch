// background.js - handles commands and setup

const DEFAULT_ENGINES = [
  { id: "quant", name: "Quant",  url: "https://www.qwant.com/?q={query}",                        enabled: true,  color: "#646464" },
  { id: "duckduckgo", name: "DuckDuckGo",  url: "https://duckduckgo.com/?q={query}",             enabled: true,  color: "#de5833" },
  { id: "ecosia",     name: "Ecosia",      url: "https://www.ecosia.org/search?q={query}",       enabled: false, color: "#5a9e47" },
  { id: "brave",      name: "Brave",       url: "https://search.brave.com/search?q={query}",     enabled: false, color: "#fb542b" },
  { id: "startpage",  name: "Startpage",   url: "https://www.startpage.com/search?q={query}",    enabled: false, color: "#4a90d9" },
];

const DEFAULT_SETTINGS = {
  theme: "system",
  syncScroll: false,
  maxPanels: 4,
  engines: DEFAULT_ENGINES,
  shortcuts: {
    "focus-panel-1": "Alt+1",
    "focus-panel-2": "Alt+2",
    "focus-panel-3": "Alt+3",
    "focus-panel-4": "Alt+4",
    "toggle-sync-scroll": "Alt+S"
  }
};

// Initialize storage on install
browser.runtime.onInstalled.addListener(async () => {
  const existing = await browser.storage.local.get("settings");
  if (!existing.settings) {
    await browser.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
});

// Handle keyboard commands - relay to active search tab
browser.commands.onCommand.addListener(async (command) => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) return;
  const tab = tabs[0];
  // Only relay to our search page
  if (tab.url && tab.url.includes("search.html")) {
    browser.tabs.sendMessage(tab.id, { type: "command", command }).catch(() => {});
  }
});

// Circumvent Block frame options
browser.webRequest.onHeadersReceived.addListener(function (e) {
  return {responseHeaders: e.responseHeaders.filter(e => {
    const r = e.name.toLowerCase();
    return "x-frame-options" !== r && "frame-options" !== r && "content-security-policy" !== r;
  })};
}, {urls: ["<all_urls>"], types: ["sub_frame"]}, ["blocking", "responseHeaders"]);


// browser.webRequest.onHeadersReceived.addListener(
//   (details) => {
//     const headers = details.responseHeaders.filter(h => {
//       return h.name.toLowerCase() !== "x-frame-options";
//     }).map(h => {
//       if (h.name.toLowerCase() === "content-security-policy") {
//         // Strip only frame-ancestors directive, leave the rest intact
//         h.value = h.value
//           .split(";")
//           .map(d => d.trim())
//           .filter(d => !d.toLowerCase().startsWith("frame-ancestors"))
//           .join("; ");
//       }
//       return h;
//     });
//     return { responseHeaders: headers };
//   },
//   { urls: ["<all_urls>"], types: ["sub_frame"] },
//   ["blocking", "responseHeaders", "extraHeaders"]
// );
