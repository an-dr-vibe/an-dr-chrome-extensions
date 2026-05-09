# an-dr Chrome Extensions — Agent Guide

## Repository structure

Each folder in the repo root is a Chrome extension. Currently:

| Folder                    | Purpose                              |
|---------------------------|--------------------------------------|
| `an-dr-chrome-extension/` | **Main extension — the only one installed** |
| `hello-world/`            | Reference template, not installed    |

## Architecture: Hub model

`an-dr-chrome-extension` is a **hub**. It is the single installed extension. All features live inside it.

### Entry points

| Surface        | Role                                                           |
|----------------|----------------------------------------------------------------|
| **Popup**      | Launcher — quick access to all features via buttons/icons      |
| **Options page** | Settings hub — one tab per feature, plus a General tab       |

### How to add a feature

1. Create a self-contained module (JS file or subfolder) inside `an-dr-chrome-extension/`
2. Register it in the popup as a new button/section
3. Register it in the options page as a new tab
4. The feature owns its own storage keys, UI, and logic — no cross-feature dependencies

### Rules

- Features must be **isolated**: a feature's JS, CSS, and storage keys must not bleed into other features
- All user-facing controls for a feature live either in its popup section or its settings tab — not scattered
- The popup is a **launcher**, not a feature itself — keep it thin
- The options page is the **configuration hub** — all persistent settings go there
- `content_scripts` and `background` logic must be scoped per feature (use filename prefixes or subfolders)

## Features

### Gmail Filters (`features/gmail-filters/`)

| File          | Role                                                              |
|---------------|-------------------------------------------------------------------|
| `api.js`      | Gmail REST API wrapper — list/create/delete filters, list labels  |
| `panel.js/css`| Options-page UI — filter list, new filter form                    |
| `content.js/css` | Gmail content script — injects "Add to filter" button into open emails |

**OAuth2 setup (one-time, per developer):**

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create or select a project
2. Enable the **Gmail API** (APIs & Services → Library → Gmail API)
3. Create credentials: OAuth 2.0 Client ID → type **Chrome Extension** → paste the extension ID from `chrome://extensions`
4. Copy the generated Client ID into `manifest.json` → `oauth2.client_id`
5. Add the Client ID to the OAuth consent screen's test users list (while in testing mode)

The extension ID changes when you reload unpacked — pin the extension to keep the ID stable. After changing the client ID, reload the extension.

## Installing

Load unpacked in Chrome developer mode:

```
chrome://extensions → Load unpacked → an-dr-chrome-extension/
```

Run `pwsh .\install.ps1` to open Chrome to the right page and print the path.
