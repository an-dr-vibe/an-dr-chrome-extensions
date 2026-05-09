# an-dr Chrome Extensions

Personal Chrome extensions for productivity and development.

## Quick Start

### Option 1: Permanent Integration via Symlinks (Recommended)

This integrates extensions into your regular Chrome profile permanently:

```powershell
.\setup-symlinks.bat
```

Or from PowerShell (requires Admin):
```powershell
.\setup-symlinks.ps1
```

Then:
1. Close Chrome completely
2. Open Chrome normally
3. Go to `chrome://extensions` and enable Developer Mode if prompted
4. Extensions will appear automatically!

### Option 2: Launch with Extensions (no permanent changes)

For a temporary session without modifying Chrome:

**Desktop shortcut:**
```powershell
.\create-shortcut.ps1
```
Then double-click the shortcut on your desktop.

**Quick launcher:**
```powershell
.\run.ps1
```
Or double-click `run.bat`

## Install on a new machine

Paste this into PowerShell:

```powershell
irm https://raw.githubusercontent.com/YOUR_USER/an-dr-chrome-extensions/main/bootstrap.ps1 | iex
```

Then for permanent integration:

```powershell
cd ~/.chrome-an-dr
.\setup-symlinks.bat
```

## How it works

### Symlink approach (recommended):
- Creates symlinks from your extension folders into Chrome's Extensions directory
- Extensions integrate into your regular Chrome profile
- Survives Chrome updates and restarts
- Requires one-time Admin privilege for setup

### Launcher approach:
- Closes any running Chrome instance
- Launches Chrome with `--load-extension` flags
- Extensions load for that session only
- Useful for testing or keeping extensions separate

## Extensions

| Folder             | Name                  | Description                    |
|--------------------|------------------------|--------------------------------|
| `hello-world/`     | Hello World            | Example extension showing basics |