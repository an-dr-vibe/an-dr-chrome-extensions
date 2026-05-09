# an-dr Chrome Extensions - Installer
# Loads extensions directly from repo into Chrome via --load-extension
# Run with: sudo pwsh .\install.ps1

$repoDir = $PSScriptRoot

Write-Host ""
Write-Host "an-dr Chrome Extensions" -ForegroundColor Cyan
Write-Host "Repo: $repoDir" -ForegroundColor Gray
Write-Host ""

# Find extension folders (any subdir containing manifest.json, excluding .git/.claude)
$manifests = Get-ChildItem -LiteralPath $repoDir -Recurse -Filter "manifest.json" |
    Where-Object { $_.DirectoryName -notmatch '\\.(git|claude)' }

if ($manifests.Count -eq 0) {
    Write-Host "No extensions found (no manifest.json in subdirectories)." -ForegroundColor Red
    exit 1
}

$extPaths = $manifests | ForEach-Object { $_.DirectoryName }

Write-Host "Found $($manifests.Count) extension(s):" -ForegroundColor White
$extPaths | ForEach-Object { Write-Host "  * $_" -ForegroundColor Yellow }
Write-Host ""

# Find Chrome
$chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
    Write-Host "Chrome not found." -ForegroundColor Red
    exit 1
}

# Enable Developer Mode in Chrome Preferences before launching
$prefsPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Preferences"
if (Test-Path $prefsPath) {
    $prefs = Get-Content $prefsPath -Raw | ConvertFrom-Json
    if (-not $prefs.extensions) {
        $prefs | Add-Member -NotePropertyName extensions -NotePropertyValue ([PSCustomObject]@{})
    }
    if (-not $prefs.extensions.ui) {
        $prefs.extensions | Add-Member -NotePropertyName ui -NotePropertyValue ([PSCustomObject]@{})
    }
    $prefs.extensions.ui | Add-Member -NotePropertyName developer_mode -NotePropertyValue $true -Force
    $prefs | ConvertTo-Json -Depth 100 | Set-Content $prefsPath -Encoding UTF8
    Write-Host "Developer mode enabled." -ForegroundColor Gray
}

# Kill ALL Chrome processes and wait until gone
Write-Host "Closing Chrome..." -ForegroundColor Yellow
Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Stop-Process -Force
$timeout = 10
while ((Get-Process -Name "chrome" -ErrorAction SilentlyContinue) -and $timeout -gt 0) {
    Start-Sleep -Milliseconds 500
    $timeout--
}

if (Get-Process -Name "chrome" -ErrorAction SilentlyContinue) {
    Write-Host "Chrome is still running - please close it manually and re-run." -ForegroundColor Red
    exit 1
}

# Launch Chrome with all extensions loaded from repo paths
$extList = $extPaths -join ","
$loadArg = "--load-extension=$extList"
Write-Host "Command: `"$chrome`" $loadArg" -ForegroundColor Gray
Write-Host "Launching Chrome..." -ForegroundColor Green
& $chrome $loadArg

Write-Host "Done! Extensions loaded from repo." -ForegroundColor Green
Write-Host "Note: enable Developer mode in chrome://extensions if prompted." -ForegroundColor Gray
Write-Host ""
