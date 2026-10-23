@echo off
chcp 65001 >nul
where node >nul 2>nul || (echo Node.js not found / ne znaideno - https://nodejs.org & exit /b 1)
node "%~dp0installer\install.js" --uninstall %*
