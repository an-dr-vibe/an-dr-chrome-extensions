# an-dr Chrome Extensions - Install via Symlinks
# Creates symlinks in Chrome's Extensions folder for permanent integration
# Run with: powershell -ExecutionPolicy Bypass -File install.ps1

# Check for admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script requires Administrator privileges." -ForegroundColor Red
    Write-Host "Requesting elevation..." -ForegroundColor Yellow
    Write-Host ""

    $arguments = "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process powershell -ArgumentList $arguments -Verb RunAs
    exit
}

$repoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$chromeExtDir = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions"

Write-Host ""
Write-Host "an-dr Chrome Extensions - Symlink Installer" -ForegroundColor Cyan
Write-Host ""

# Check if Chrome extensions folder exists
if (-not (Test-Path $chromeExtDir)) {
    Write-Host "Chrome Extensions folder not found at: $chromeExtDir" -ForegroundColor Red
    Write-Host "Make sure Chrome is installed and has been launched at least once." -ForegroundColor Yellow
    exit 1
}

# Find all extensions
$manifests = Get-ChildItem -Path $repoDir -Recurse -Depth 2 -Filter "manifest.json"

if ($manifests.Count -eq 0) {
    Write-Host "No extensions found!" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($manifests.Count) extension(s):" -ForegroundColor White
Write-Host ""

foreach ($manifest in $manifests) {
    $extFolder = $manifest.DirectoryName
    $extName = Split-Path -Leaf $extFolder
    $json = Get-Content $manifest.FullName -Raw | ConvertFrom-Json
    $displayName = $json.name

    Write-Host "  * $displayName" -ForegroundColor Yellow
    Write-Host "    Folder: $extFolder" -ForegroundColor Gray

    # Generate a deterministic extension ID from the folder name
    $hashInput = $extFolder.ToLower()
    $hash = [System.Security.Cryptography.HashAlgorithm]::Create('sha256')
    $hashBytes = $hash.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($hashInput))
    $extId = ([BitConverter]::ToString($hashBytes).Replace('-', '').ToLower().Substring(0, 32))

    $symlinkPath = "$chromeExtDir\$extId\0.0.1_0"
    $symlinkParentDir = Split-Path -Parent $symlinkPath

    if (-not (Test-Path $symlinkParentDir)) {
        New-Item -ItemType Directory -Path $symlinkParentDir -Force | Out-Null
    }

    # Remove existing symlink/folder if it exists
    if (Test-Path $symlinkPath) {
        Remove-Item $symlinkPath -Force -ErrorAction SilentlyContinue
    }

    # Create symlink
    try {
        New-Item -ItemType SymbolicLink -Path $symlinkPath -Target $extFolder -Force | Out-Null
        Write-Host "    ID: $extId" -ForegroundColor Green
    }
    catch {
        Write-Host "    ERROR: Failed to create symlink!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Done! Extensions installed." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Close Chrome completely"
Write-Host "  2. Open Chrome normally"
Write-Host "  3. Extensions will appear in chrome://extensions"
Write-Host "  4. Enable Developer mode if prompted"
Write-Host ""
