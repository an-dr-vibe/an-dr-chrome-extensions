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

### How to add a feature

1. Create a self-contained module (JS file or subfolder) inside `an-dr-chrome-extension/`
2. Register it in the popup as a new button
3. The feature owns its own storage keys, UI, and logic — no cross-feature dependencies

### Rules

- Features must be **isolated**: a feature's JS, CSS, and storage keys must not bleed into other features
- The popup is a **launcher**, not a feature itself — keep it thin
- `content_scripts` and `background` logic must be scoped per feature (use filename prefixes or subfolders)
- **Never work in a git worktree** — always work directly in the repository root (`an-dr-chrome-extensions/`). Worktrees add indirection, break relative paths in scripts, and make it harder to reload the extension in Chrome. If a worktree is open, close it and continue from the repo root.
- **Bump `manifest.json` version on every change** following semver: `MAJOR.MINOR.PATCH`
  - `PATCH` — bug fix, style tweak, copy change
  - `MINOR` — new feature or capability added, backwards-compatible
  - `MAJOR` — breaking change (removed feature, storage key migration required, manifest permission removed)

## Features

### Gmail Filters (`features/gmail-filters/`)

| File             | Role                                                                        |
|------------------|-----------------------------------------------------------------------------|
| `content.js/css` | Runs on `mail.google.com` — replaces Gmail's filter settings UI with cards, injects "Add to filter" button on open emails |

No OAuth or credentials required. Reads filters and labels from Gmail's already-authenticated DOM.

## Installing

Load unpacked in Chrome developer mode:

```
chrome://extensions → Load unpacked → an-dr-chrome-extension/
```

Run `pwsh .\install.ps1` to open Chrome to the right page and print the path.
