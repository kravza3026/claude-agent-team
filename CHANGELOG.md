# Журнал змін

Формат: [Keep a Changelog](https://keepachangelog.com/uk/1.1.0/), версіонування: [SemVer](https://semver.org/lang/uk/).

## [0.1.0] - 2026-10-23

### Додано
- 12 агентів (оркестратор, планувальник, figma-reader, контент, фронтенд, бекенд, БД, 3D, тестер, рев'юер, pagespeed, дебагер) і 23 навички.
- Дашборд агентів (події, 3D/2D-схема, ліміти й витрати, команди, вибір моделі) з кросплатформними хуками.
- Кросплатформний установник на Node (`installer/install.js`) з обгортками для sh, PowerShell і cmd: dry-run, ідемпотентність, бекапи, manifest, безпечне злиття `settings.json`, видалення, автозапуск (systemd --user, LaunchAgent, Scheduled Task).
- Двомовність (UA/EN): документація (`docs/en/`), вивід установника (`--lang`), інтерфейс дашборду (перемикач UA|EN, `locales/*.json`, `POST /lang`, `tools/check-i18n.js`).
- Документ «Підключення Claude Code» (`docs/CLAUDE_SETUP.md`, UA/EN); стилі скролбарів дашборду.
- Документація українською, генерація таблиць із frontmatter (`tools/gen-docs.js`), smoke-тести, CI (GitHub Actions, GitLab CI).

### Змінено відносно прототипу
- Порт дашборду: `AGENTS_DASHBOARD_PORT`; усі шляхи відносні до теки встановлення.
- `log.sh` замінено на `log.js` (кросплатформний); `start.sh` + `start.ps1` + `start.cmd` + `start.js`.
- Сповіщення: Linux/macOS/Windows; tmux-режим лише на Linux/macOS.
