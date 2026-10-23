# Видалення (Windows): те саме, що .\install.ps1 --uninstall [опції]
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host 'Node.js не знайдено (потрібен 18+) / Node.js not found (18+ required): https://nodejs.org'; exit 1 }
& node (Join-Path $PSScriptRoot 'installer\install.js') --uninstall @args
exit $LASTEXITCODE
