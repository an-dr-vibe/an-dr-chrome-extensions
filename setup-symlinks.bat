@echo off
REM Setup symlinks for Chrome extensions
REM This script requires Administrator privileges

powershell -ExecutionPolicy Bypass -File "%~dp0setup-symlinks.ps1"
pause
