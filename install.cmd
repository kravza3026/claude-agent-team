@echo off
chcp 65001 >nul
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found / Node.js ne znaideno. Node.js 18+ is required / Potriben Node.js 18+ - https://nodejs.org
  pause
  exit /b 1
)
node "%~dp0installer\install.js" %*
if errorlevel 1 pause
