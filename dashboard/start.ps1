# Запуск дашборду (Windows PowerShell): .\start.ps1 [--port N] [--no-open]
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host 'Потрібен Node.js 18+ / Node.js 18+ is required (https://nodejs.org)'; exit 1 }
& node (Join-Path $PSScriptRoot 'start.js') @args
