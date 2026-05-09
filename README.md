# an-dr Chrome Extensions

Personal Chrome extensions for productivity and development.

## Setup

Install extensions into your Chrome profile via symlinks:

```powershell
.\install.ps1
```

This requires Administrator privileges. You'll be prompted automatically if needed.

Then:
1. Close Chrome completely
2. Open Chrome normally
3. Extensions appear in `chrome://extensions` automatically
4. Enable Developer mode if prompted

## Install on a new machine

```powershell
irm https://raw.githubusercontent.com/YOUR_USER/an-dr-chrome-extensions/main/bootstrap.ps1 | iex
cd ~/.chrome-an-dr
.\install.ps1
```

## How it works

- Creates symlinks from extension folders into Chrome's Extensions directory
- Extensions integrate into your regular Chrome profile
- Survives Chrome updates and restarts
- One-time setup required

## Extensions

| Folder             | Name                  | Description                    |
|--------------------|------------------------|--------------------------------|
| `hello-world/`     | Hello World            | Example extension showing basics |