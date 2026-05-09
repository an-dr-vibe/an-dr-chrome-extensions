# Quick launcher for an-dr Chrome Extensions
# Shortcut: Create shortcut to run: powershell -ExecutionPolicy Bypass -File run.ps1

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Close existing Chrome
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

# Find Chrome
$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)
$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
    Write-Host "Chrome not found!" -ForegroundColor Red
    exit 1
}

# Find all extension folders
$extensions = Get-ChildItem -Path $scriptDir -Depth 1 -Filter "manifest.json" | ForEach-Object { $_.DirectoryName }

if ($extensions.Count -eq 0) {
    Write-Host "No extensions found!" -ForegroundColor Red
    exit 1
}

# Build arguments
$args = @()
foreach ($ext in $extensions) {
    $args += "--load-extension=`"$ext`""
}

Write-Host "Launching Chrome with $($extensions.Count) extension(s)..." -ForegroundColor Green

# Launch
& $chrome $args
