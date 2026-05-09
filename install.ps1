# an-dr Chrome Extensions - Installer
# Opens Chrome to chrome://extensions and prints paths to load
# Run with: pwsh .\install.ps1

$repoDir = $PSScriptRoot

Write-Host ""
Write-Host "an-dr Chrome Extensions" -ForegroundColor Cyan
Write-Host ""

$manifests = Get-ChildItem -LiteralPath $repoDir -Recurse -Filter "manifest.json" |
    Where-Object { $_.DirectoryName -notmatch '\\.(git|claude)' }

if ($manifests.Count -eq 0) {
    Write-Host "No extensions found." -ForegroundColor Red; exit 1
}

Write-Host "Load these folders in Chrome (chrome://extensions > Load unpacked):" -ForegroundColor White
Write-Host ""
foreach ($m in $manifests) {
    $json = Get-Content -LiteralPath $m.FullName -Raw | ConvertFrom-Json
    Write-Host "  $($json.name)" -ForegroundColor Yellow
    Write-Host "  $($m.DirectoryName)" -ForegroundColor Gray
    Write-Host ""
}

$chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chrome) {
    Start-Process $chrome "chrome://extensions"
}
