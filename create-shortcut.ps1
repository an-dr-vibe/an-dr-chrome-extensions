# Create a desktop shortcut for the extension launcher

$repoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\Chrome - an-dr Extensions.lnk"

Write-Host "Creating desktop shortcut..." -ForegroundColor Cyan

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$repoDir\run.ps1`""
$Shortcut.WorkingDirectory = $repoDir
$Shortcut.Description = "Launch Chrome with an-dr extensions"
$Shortcut.IconLocation = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$Shortcut.Save()

Write-Host "Shortcut created: $shortcutPath" -ForegroundColor Green
Write-Host "You can now double-click it to launch Chrome with extensions!" -ForegroundColor Green
