# Журнал змін

Формат: [Keep a Changelog](https://keepachangelog.com/uk/1.1.0/), версіонування: [SemVer](https://semver.org/lang/uk/).

## [0.1.0] - 2026-10-23

### Додано
- Новий склад: 22 агенти (оркестратор і 21 роль у групах «Аналіз і дизайн», «Інженерія», «Якість», «Документація») і 26 навичок (додано `business-analyst`, `domain-driven-design`, `infer-conventions`); застарілі `frontend-developer`, `backend-developer`, `reviewer` замінено на `frontend-engineer`, `backend-engineer`, `code-reviewer`, `security-reviewer`.
- `dashboard/team.json` — склад ролей, групи й логічні зв'язки (передачі, зворотний зв'язок, рев'ю) для схеми дашборду; установник копіює його разом з дашбордом.
- Дашборд агентів (події, 3D/2D-схема, ліміти й витрати, команди, вибір моделі) з кросплатформними хуками.
- Кросплатформний установник на Node (`installer/install.js`) з обгортками для sh, PowerShell і cmd: dry-run, ідемпотентність, бекапи, manifest, безпечне злиття `settings.json`, видалення, автозапуск (systemd --user, LaunchAgent, Scheduled Task).
- Двомовність (UA/EN): документація (`docs/en/`), вивід установника (`--lang`), інтерфейс дашборду (перемикач UA|EN, `locales/*.json`, `POST /lang`, `tools/check-i18n.js`).
- Дашборд: вертикальна схема з логічними зв'язками між агентами, повноекранний режим (⛶) і перемикач орієнтації (↔), фон у стилі n8n; прибрано роль «Універсальний» (general-purpose): у дашборді 12 ролей із чітким розподілом обов'язків.
- Документація: прибрано непідтверджені твердження (позначки «перевірте»): у CLAUDE_SETUP, MCP_SETUP, TELEGRAM лишилось лише звірене з `claude --help` і файлами плагіна; у тестах є перевірка відсутності таких маркерів.
- Документ «Підключення MCP-серверів (Figma, Playwright)» (`docs/MCP_SETUP.md`, UA/EN): команди з позначками звірено/перевірте.
- Документ «Підключення Claude Code» (`docs/CLAUDE_SETUP.md`, UA/EN); стилі скролбарів дашборду.
- Документація українською, генерація таблиць із frontmatter (`tools/gen-docs.js`), smoke-тести, CI (GitHub Actions, GitLab CI).

### Змінено відносно прототипу
- Порт дашборду: `AGENTS_DASHBOARD_PORT`; усі шляхи відносні до теки встановлення.
- `log.sh` замінено на `log.js` (кросплатформний); `start.sh` + `start.ps1` + `start.cmd` + `start.js`.
- Сповіщення: Linux/macOS/Windows; tmux-режим лише на Linux/macOS.
