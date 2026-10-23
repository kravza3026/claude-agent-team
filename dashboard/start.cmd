@echo off
where node >nul 2>nul || (echo Potriben Node.js 18+ ^(https://nodejs.org^) & exit /b 1)
node "%~dp0start.js" %*
