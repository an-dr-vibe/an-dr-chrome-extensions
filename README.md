# an-dr Chrome Extensions

Personal Chrome extensions for productivity and development.

## Quick Start

**Option 1: Desktop shortcut (easiest)**
```powershell
.\create-shortcut.ps1
```
Then just double-click the shortcut on your desktop to launch Chrome with extensions!

**Option 2: Quick launcher**
```powershell
.\run.ps1
```
Or just double-click `run.bat`

**Option 3: Full install**
```powershell
.\install.ps1
```

## Install on a new machine

Paste this into PowerShell:

```powershell
irm https://raw.githubusercontent.com/YOUR_USER/an-dr-chrome-extensions/main/bootstrap.ps1 | iex
```

Then run:
```powershell
cd ~/.chrome-an-dr
.\create-shortcut.ps1
```

## How it works

The launcher scripts:
1. Close any running Chrome instance
2. Launch Chrome with `--load-extension` flags pointing to each extension folder
3. Extensions load immediately without requiring "Load unpacked"

**Note:** Extensions only persist while using the launcher. They won't show in a normal Chrome session. This is intentional to keep them separate from your regular Chrome profile.

## Extensions

| Folder             | Name                  | Description                    |
|--------------------|------------------------|--------------------------------|
| `hello-world/`     | Hello World            | Example extension showing basics |