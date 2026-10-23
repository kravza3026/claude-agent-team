# Обгортка установника (Windows PowerShell 5.1+ / PowerShell 7). Уся логіка - в installer\install.js.
# Використання: .\install.ps1 [опції]   (напр. .\install.ps1 --dry-run)
# Якщо скрипти заборонені: powershell -ExecutionPolicy Bypass -File .\install.ps1   (діє лише для цього запуску)
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js не знайдено. Потрібен Node.js 18 або новіший. / Node.js not found. Node.js 18 or newer is required.'
  Write-Host '  https://nodejs.org   (winget install OpenJS.NodeJS.LTS)'
  Write-Host 'Після встановлення відкрийте НОВЕ вікно PowerShell і запустіть скрипт ще раз.'
  Write-Host 'After installing, open a NEW PowerShell window and run the script again.'
  exit 1
}
& node (Join-Path $PSScriptRoot 'installer\install.js') @args
exit $LASTEXITCODE
