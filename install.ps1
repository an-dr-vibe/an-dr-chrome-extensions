# an-dr Chrome Extensions - Installer
# Uses Chrome DevTools Protocol to automate "Load unpacked" on chrome://extensions
# Run with: pwsh .\install.ps1

$repoDir = $PSScriptRoot

Write-Host ""
Write-Host "an-dr Chrome Extensions" -ForegroundColor Cyan
Write-Host "Repo: $repoDir" -ForegroundColor Gray
Write-Host ""

# Find extension folders
$manifests = Get-ChildItem -LiteralPath $repoDir -Recurse -Filter "manifest.json" |
    Where-Object { $_.DirectoryName -notmatch '\\.(git|claude)' }

if ($manifests.Count -eq 0) {
    Write-Host "No extensions found." -ForegroundColor Red; exit 1
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

if (-not $chrome) { Write-Host "Chrome not found." -ForegroundColor Red; exit 1 }

# Kill Chrome fully
Write-Host "Closing Chrome..." -ForegroundColor Yellow
"chrome", "chrome_crashpad_handler" | ForEach-Object {
    Get-Process -Name $_ -ErrorAction SilentlyContinue | Stop-Process -Force
}
$timeout = 20
while ((Get-Process -Name "chrome" -ErrorAction SilentlyContinue) -and $timeout -gt 0) {
    Start-Sleep -Milliseconds 500; $timeout--
}
$lock = "$env:LOCALAPPDATA\Google\Chrome\User Data\SingletonLock"
if (Test-Path $lock) { Remove-Item $lock -Force }
Start-Sleep -Milliseconds 500

# Launch Chrome with remote debugging
Write-Host "Launching Chrome with remote debugging..." -ForegroundColor Green
Start-Process -FilePath $chrome -ArgumentList "--remote-debugging-port=9222"
Start-Sleep -Seconds 2

# Wait for Chrome to be ready
Write-Host "Waiting for Chrome debugger on port 9222..." -ForegroundColor Gray
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Write-Host "  attempt $($i+1)/20..." -ForegroundColor DarkGray
    try {
        Invoke-RestMethod "http://localhost:9222/json/version" -TimeoutSec 1 -ErrorAction Stop | Out-Null
        $ready = $true; break
    } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $ready) { Write-Host "Chrome did not open debugger port. Is another Chrome already running?" -ForegroundColor Red; exit 1 }

# Open chrome://extensions in a new tab
Invoke-RestMethod "http://localhost:9222/json/new?chrome://extensions" | Out-Null
Start-Sleep -Seconds 2

# Get the extensions page target
$targets = Invoke-RestMethod "http://localhost:9222/json"
$extTarget = $targets | Where-Object { $_.url -like "*extensions*" -and $_.webSocketDebuggerUrl } | Select-Object -First 1

if (-not $extTarget) { Write-Host "Could not find extensions page." -ForegroundColor Red; exit 1 }

# CDP helper
function Invoke-CDP($ws, [int]$id, [string]$method, [hashtable]$params) {
    $msg  = @{ id = $id; method = $method; params = $params } | ConvertTo-Json -Depth 10 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
    $ws.SendAsync([ArraySegment[byte]]::new($bytes), [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
    $buf = [byte[]]::new(65536)
    $r   = $ws.ReceiveAsync([ArraySegment[byte]]::new($buf), [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    return [Text.Encoding]::UTF8.GetString($buf, 0, $r.Count) | ConvertFrom-Json
}

# Connect via WebSocket
$ws = [Net.WebSockets.ClientWebSocket]::new()
$ws.ConnectAsync([Uri]$extTarget.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()

# Enable developer mode
Invoke-CDP $ws 1 "Runtime.evaluate" @{
    expression   = "chrome.developerPrivate.updateProfileConfiguration({inDeveloperMode: true})"
    awaitPromise = $true
} | Out-Null

Write-Host "Developer mode enabled." -ForegroundColor Gray

# Load each extension via developerPrivate.loadUnpacked
$id = 2
foreach ($extPath in $extPaths) {
    $escaped = $extPath -replace '\\', '\\\\'
    $js = "new Promise((res, rej) => chrome.developerPrivate.loadUnpacked({path: '$escaped'}, (r) => chrome.runtime.lastError ? rej(chrome.runtime.lastError.message) : res(r)))"
    $result = Invoke-CDP $ws $id "Runtime.evaluate" @{ expression = $js; awaitPromise = $true }
    $id++

    $name = (Split-Path $extPath -Leaf)
    if ($result.result.result.value) {
        Write-Host "  Loaded: $name (id: $($result.result.result.value))" -ForegroundColor Green
    } elseif ($result.result.exceptionDetails) {
        Write-Host "  Failed: $name - $($result.result.exceptionDetails.exception.description)" -ForegroundColor Red
    } else {
        Write-Host "  Result: $name - $($result | ConvertTo-Json -Depth 5)" -ForegroundColor DarkGray
    }
}

$ws.CloseAsync([Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", [Threading.CancellationToken]::None).Wait()
Write-Host ""
Write-Host "Done! Check chrome://extensions." -ForegroundColor Green
