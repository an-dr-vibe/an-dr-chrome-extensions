# an-dr Chrome Extensions - Installer
# Installs extensions by adding them to Chrome's User Data folder
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

# Chrome paths
$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
    Write-Host "Chrome not found - please install it or add to PATH" -ForegroundColor Red
    exit 1
}

# Kill existing Chrome processes
Write-Host "Closing Chrome..." -ForegroundColor Yellow
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

# Build load-extension arguments
$args = @()
foreach ($extPath in $extensionPaths) {
    $args += "--load-extension=`"$extPath`""
}

Write-Host "Launching Chrome with extensions..." -ForegroundColor Green
Write-Host "  Command: & $chrome $($args -join ' ')" -ForegroundColor Gray
Write-Host ""

# Launch Chrome with extensions
& $chrome $args

Write-Host "Chrome launched! Extensions should be loaded." -ForegroundColor Green
