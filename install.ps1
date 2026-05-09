# an-dr Chrome Extensions - Installer
# Automatically loads extensions into Chrome without manual "Load unpacked"
# Run with: powershell -ExecutionPolicy Bypass -File install.ps1

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$manifests = Get-ChildItem -Path $RepoDir -Recurse -Depth 2 -Filter "manifest.json"

if ($manifests.Count -eq 0) {
    Write-Host "No extensions found (no manifest.json in subdirectories)." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "an-dr Chrome Extensions Installer" -ForegroundColor Cyan
Write-Host ""
Write-Host "Found $($manifests.Count) extension(s):" -ForegroundColor White
Write-Host ""

$extensionPaths = @()
foreach ($manifest in $manifests) {
    $dir = $manifest.DirectoryName
    $json = Get-Content $manifest.FullName -Raw | ConvertFrom-Json
    $name = if ($json.name) { $json.name } else { Split-Path -Leaf $dir }

    Write-Host "  * $name" -ForegroundColor Yellow
    Write-Host "    Path: $dir" -ForegroundColor Gray

    $extensionPaths += $dir
}

Write-Host ""

# Try to find Chrome
$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chrome) {
    Write-Host "Launching Chrome with extensions..." -ForegroundColor Green

    # Build --load-extension argument
    $loadExtArg = "--load-extension=`"$($extensionPaths -join '","')`""

    # Launch Chrome with extensions loaded
    & $chrome $loadExtArg
} else {
    Write-Host "Chrome not found - please install it or add to PATH" -ForegroundColor Red
    exit 1
}
