# an-dr Chrome Extensions

Personal Chrome extensions for productivity and development.

## Install on a new machine

Paste this into PowerShell:

```powershell
irm https://raw.githubusercontent.com/YOUR_USER/an-dr-chrome-extensions/main/bootstrap.ps1 | iex
```

This will:

1. Clone the repo to `~\.chrome-an-dr`
2. Open `chrome://extensions`
3. Print each extension path to load

That's it! Chrome launches with all extensions automatically loaded.

## Update

```powershell
& "$HOME\.chrome-an-dr\install.ps1"
```

Or re-run the bootstrap — it pulls latest automatically.

## Extensions

| Folder             | Name                  | Description                    |
|--------------------|------------------------|--------------------------------|
| `hello-world/`     | Hello World            | Example extension showing basics |