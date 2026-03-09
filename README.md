# MultiSearch Firefox Extension

Search multiple engines simultaneously in a split-screen view.

## Installation

1. Open Firefox and go to `about:debugging`
2. Click **"This Firefox"** in the left sidebar
3. Click **"Load Temporary Add-on…"**
4. Navigate to this folder and select `manifest.json`
5. The extension is now installed — look for the MultiSearch icon in your toolbar

> For permanent installation, the extension needs to be signed by Mozilla via [addons.mozilla.org](https://addons.mozilla.org).

## Install as Default Search Engine

1. Open the extension's **Options** page (right-click the toolbar icon → Options)
2. Click **"Install as Search Engine"** 
3. Go to **Firefox Preferences → Search**
4. Select **MultiSearch** from the "Default Search Engine" dropdown

Alternatively, navigate to `search.html?q=your+query` directly or use the toolbar popup.

## Features

- **Split-screen panels** — up to 4 search engines side by side, loaded in parallel
- **Async loading** — each panel loads independently, results appear as they arrive
- **Sync scroll** — toggle synchronized scrolling across all panels (Alt+S)
- **Independent scroll** — when sync is off, each panel scrolls freely
- **Panel focus** — keyboard shortcuts Alt+1–4 to focus a panel
- **Resizable panels** — drag the dividers between panels
- **Dark / Light / System theme**
- **Settings page** — add, remove, reorder, enable/disable engines
- **Drag-to-reorder** engines in settings

## Default Engines

| Engine     | Status  |
|------------|---------|
| Quant      | Enabled |
| DuckDuckGo | Enabled |
| Ecosia     | Disabled|
| Brave      | Disabled|
| Startpage  | Disabled|

## Keyboard Shortcuts

| Shortcut | Action              |
|----------|---------------------|
| Alt+1    | Focus Panel 1       |
| Alt+2    | Focus Panel 2       |
| Alt+3    | Focus Panel 3       |
| Alt+4    | Focus Panel 4       |
| Alt+S    | Toggle sync scroll  |

Shortcuts can be customized in `about:addons` → **Manage Extension Shortcuts**.

## Adding Custom Engines

In the Settings page, enter a name and a URL containing `{query}` as a placeholder:

```
https://search.example.com/results?q={query}
```

## Notes on iframes

Most major search engines allow embedding in iframes for extension pages. 
If a panel shows blank or blocked content, the engine may set `X-Frame-Options: DENY`.
In that case, consider using an alternative engine or a privacy-respecting proxy variant.

## File Structure

```
multisearch-ext/
├── manifest.json       — Extension manifest
├── background.js       — Service worker (keyboard command relay, defaults)
├── search.html         — Main split-screen results page
├── popup.html          — Toolbar button popup
├── options.html        — Settings page
├── opensearch.xml      — OpenSearch descriptor (Firefox search engine integration)
└── icons/
    ├── icon16.svg
    ├── icon32.svg
    ├── icon48.svg
    └── icon96.svg
```
