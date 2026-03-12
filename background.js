// background.js - handles commands and setup

const DEFAULT_ENGINES = [
  { id: "brave",      name: "Brave",      url: "https://search.brave.com/search?q={query}",     enabled: true,  color: "#fb542b" },
  { id: "quant",      name: "Quant",      url: "https://www.qwant.com/?q={query}",              enabled: true,  color: "#646464" },
  { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q={query}",             enabled: false, color: "#de5833" },
  { id: "ecosia",     name: "Ecosia",     url: "https://www.ecosia.org/search?q={query}",       enabled: false, color: "#5a9e47" },
  { id: "startpage",  name: "Startpage",  url: "https://www.startpage.com/search?q={query}",    enabled: false, color: "#4a90d9" },
];

export const DEFAULT_SETTINGS = {
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
  },
  syncScroll: false
};

let settings = DEFAULT_SETTINGS;

// Initialize storage on install
browser.runtime.onInstalled.addListener(async () => {
  console.log("Installing...");
  const existing = await browser.storage.local.get("settings");

  if (existing.settings) {
    settings = existing.settings;
  } else {
    await browser.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
});


browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.settings) return;

  const newSettings = changes.settings.newValue;
  console.log("settings changed", newSettings);
  settings = newSettings;

})

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


browser.webNavigation.onBeforeNavigate.addListener(async e => {
  console.log('beforeNavigate', e.frameId, e.url, e.parentFrameId);

  if (0 !== e.frameId) return;
  const r = ["https://multisearch.local/"], s = new URL(e.url);
  if (r.some(r => e.url.startsWith(r))) {
    const r = s.searchParams.get("q");
    r && browser.tabs.update(e.tabId, {url: `search.html?q=${encodeURIComponent(r)}`});
  }

});


const searchTabIds = new Set();

// Track which tabs are our search pages
browser.tabs.onUpdated.addListener((tabId, change, tab) => {
  console.log("tabs onUpdated" , tab);
  if (tab.url?.includes(browser.runtime.getURL("search.html"))) {
    searchTabIds.add(tabId);
  } else {
    // remove the tab from the set of search tabs
    searchTabIds.delete(tabId);
  }
});
browser.tabs.onRemoved.addListener((tabId) => searchTabIds.delete(tabId));

browser.webRequest.onBeforeRequest.addListener(
  (details) => {

    console.log('tabs onBeforeRequest ', details, searchTabIds);

    // Only act on our search tabs
    if (!searchTabIds.has(details.tabId)) return {};

    console.log("tabs onBeforeRequest ", "inside searchTabIds");

    const searchEnginesUrl = settings.engines.filter(e => e.enabled).map(e => e.url);
    console.log('tabs onBeforeRequest searchEnginesUrl: ', searchEnginesUrl);
    const isSearchEngineFrame = searchEnginesUrl.some(url => {
      const urlOrigin= new URL(url).origin;
      console.log('tabs onBeforeRequest urlOrigin: ', urlOrigin);
      return details.url.startsWith(urlOrigin);
    });

    if (isSearchEngineFrame) {
      console.log('tabs onBeforeRequest search engine url: ', details.url);
      return {};
    } 
    
    console.log('tabs onBeforeRequest click on: ', details.url);
    
    // Only intercept when the whole tab would navigate away (main_frame)
    // This means the user clicked a link that escaped the iframe into the tab
    browser.tabs.update(details.tabId, { url: details.url });

    return { cancel: true };
  },
  { urls: ["<all_urls>"], types: ["sub_frame"] },
  ["blocking"]
);
