# an-dr Chrome Extensions - Installer
# Registers extensions via Windows Registry so Chrome loads them on every startup.
# Each extension gets a stable RSA key -> stable ID -> registered at HKCU:\SOFTWARE\Google\Chrome\Extensions\<id>
# Run with: pwsh .\install.ps1

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Start-Process pwsh -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

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

Write-Host "Found $($manifests.Count) extension(s):" -ForegroundColor White
Write-Host ""

function Compute-ExtensionId($publicKeyBytes) {
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha256.ComputeHash($publicKeyBytes)
    return ($hash[0..15] | ForEach-Object {
        [char]([int][char]'a' + (($_ -band 0xF0) -shr 4))
        [char]([int][char]'a' + ($_ -band 0x0F))
    }) -join ''
}

foreach ($manifest in $manifests) {
    $extFolder  = $manifest.DirectoryName
    $json       = Get-Content -LiteralPath $manifest.FullName -Raw | ConvertFrom-Json
    $version    = $json.version
    $name       = $json.name

    Write-Host "  * $name  (v$version)" -ForegroundColor Yellow
    Write-Host "    Path: $extFolder" -ForegroundColor Gray

    # Ensure the extension has a stable key in manifest.json
    if (-not $json.key) {
        Write-Host "    Generating RSA key..." -ForegroundColor DarkGray
        $rsa        = [System.Security.Cryptography.RSA]::Create(2048)
        $keyBytes   = $rsa.ExportSubjectPublicKeyInfo()
        $keyBase64  = [Convert]::ToBase64String($keyBytes)
        $json | Add-Member -NotePropertyName key -NotePropertyValue $keyBase64 -Force
        $json | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $manifest.FullName -Encoding UTF8
        Write-Host "    Key saved to manifest.json" -ForegroundColor DarkGray
    } else {
        $keyBytes = [Convert]::FromBase64String($json.key)
    }

    $extId = Compute-ExtensionId $keyBytes

    # Chrome reads HKLM for external extensions, not HKCU
    # Write to both the standard and Wow6432Node paths (covers 32-bit and 64-bit Chrome)
    foreach ($regPath in @(
        "HKLM:\SOFTWARE\Google\Chrome\Extensions\$extId",
        "HKLM:\SOFTWARE\WOW6432Node\Google\Chrome\Extensions\$extId"
    )) {
        New-Item -Path $regPath -Force | Out-Null
        Set-ItemProperty -Path $regPath -Name path    -Value $extFolder
        Set-ItemProperty -Path $regPath -Name version -Value $version
        Write-Host "    Reg: $regPath" -ForegroundColor DarkGray
    }

    Write-Host "    ID:  $extId" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Done! Closing Chrome and relaunching..." -ForegroundColor Green

# Find Chrome
$chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chrome) {
    "chrome", "chrome_crashpad_handler" | ForEach-Object {
        Get-Process -Name $_ -ErrorAction SilentlyContinue | Stop-Process -Force
    }
    $timeout = 20
    while ((Get-Process -Name "chrome" -ErrorAction SilentlyContinue) -and $timeout -gt 0) {
        Start-Sleep -Milliseconds 500; $timeout--
    }
    $lock = "$env:LOCALAPPDATA\Google\Chrome\User Data\SingletonLock"
    if (Test-Path $lock) { Remove-Item $lock -Force }

    Start-Process -FilePath $chrome
    Write-Host "Chrome launched. Extensions should appear in chrome://extensions." -ForegroundColor Green
}
