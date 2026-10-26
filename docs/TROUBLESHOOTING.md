**🇺🇦 Українська** | [🇬🇧 English](en/TROUBLESHOOTING.md)

# Усунення проблем

## Node не знайдено / стара версія
- Помилка в обгортці `install.sh`/`install.ps1`/`install.cmd` або `Потрібен Node.js 18`. `node -v` має показувати ≥ 18.
- Встановили Node, але команда не знайдена — відкрийте **новий** термінал (PATH оновлюється). Windows: `where node`; Linux/macOS: `command -v node`. Якщо Node з nvm — він доступний лише в оболонках, де nvm завантажено; хуки Claude Code викликають `node` з PATH середовища запуску `claude`.
- Хуки не бачать Node (інший PATH, ніж у вашій оболонці): запишіть у хуках абсолютний шлях до `node`/`node.exe` вручну (`"command": "/шлях/до/node /шлях/до/dashboard/hook.js"`).

## Порт зайнятий
- Повідомлення «Порт N зайнятий». Інший порт: `node ~/.claude/dashboard/start.js --port 17777` або змінна `AGENTS_DASHBOARD_PORT=17777`. Для автозапуску: перевстановіть з `--service --port 17777`.
- Хто займає: Linux/macOS `lsof -i :7777`; Windows `netstat -ano | findstr :7777`.
- «Уже працює: …» означає, що дашборд уже запущено на цьому порту.

## Хуки не спрацьовують / нема подій
1. `settings.json` містить хуки? `node installer/install.js --list` і перегляньте файл: у кожної події має бути запис із шляхом до `dashboard/hook.js`.
2. Перезапустіть сесію `claude` — налаштування хуків читаються при старті.
3. Шлях у хуку існує? Виконайте вручну: `echo '{"hook_event_name":"SessionStart","session_id":"abcdef12"}' | node ~/.claude/dashboard/hook.js`, потім перевірте, що в `dashboard/events.jsonl` з'явився рядок. (Windows PowerShell: `'{"hook_event_name":"SessionStart","session_id":"abcdef12"}' | node "$env:USERPROFILE\.claude\dashboard\hook.js"`.)
4. Дашборд запущено? http://127.0.0.1:7777 має відповідати. Події пише хук незалежно від сервера, але сторінка бачить їх лише за запущеного сервера.
5. Установка йшла в іншу теку (`--target`/`CLAUDE_CONFIG_DIR`)? Claude Code читає ту `settings.json`, яка відповідає його `CLAUDE_CONFIG_DIR`.
6. `settings.json` невалідний → установник його не чіпав; виправте й повторіть.

## Дашборд порожній, хоча хуки працюють
- Перегляньте `dashboard/events.jsonl` (є рядки?) і `dashboard/server.log`. Сторінка автооновлюється; натисніть Ctrl+F5.
- Ліміти не показуються: `statusLine` не підключено (чужий statusLine не перезаписується — додайте вручну за підказкою установника) або сесія ще не оновила статус.
- Токени/витрати: сервер читає `<CLAUDE_DIR>/projects/**/*.jsonl`; після першого запуску підрахунок займає час.

## Режим tmux
- Працює лише на Linux/macOS і лише коли сесія запущена через `claude-tmux`. Перевірте `tmux -V`; у дашборді вгорі має бути «tmux: N».
- Команда пішла «в чергу» замість терміналу: сесія зайнята, чекає дозволу або у терміналі відкритий діалог — це безпечна поведінка; черга доставиться хуком.
- Windows: режиму tmux немає — користуйтеся чергою.
- Вибір моделі для поточної сесії теж потребує tmux; типову модель і моделі агентів можна міняти без нього.

## Windows: шляхи і лапки
- Хук має вигляд `node "C:\Users\Імʼя\.claude\dashboard\hook.js"`; у JSON зворотні слеші подвоєні. Не ставте одинарні лапки.
- `running scripts is disabled` → див. INSTALL.md, розділ 3 (ExecutionPolicy). Кракозябри в `cmd` → `chcp 65001`.
- Автозапуск не стартує: `schtasks /Query /TN ClaudeAgentTeamDashboard /V`; запустити вручну `schtasks /Run /TN ClaudeAgentTeamDashboard`; запасний варіант — файл у теці Startup (`shell:startup`).
- Антивірус блокує `wscript.exe`/VBS-запускач → запускайте `start.cmd` вручну або вимкніть `--service`.

## macOS
- Сповіщення не з'являються: дозвольте їх для «Редактор скриптів/Script Editor» (osascript) у «Сповіщеннях».
- LaunchAgent не завантажився: `launchctl print gui/$(id -u)/com.claude-agent-team.dashboard`; лог — `dashboard/server.log`. Перезавантажити: `launchctl bootout gui/$(id -u)/com.claude-agent-team.dashboard`, потім `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claude-agent-team.dashboard.plist`.

## Linux
- `systemctl --user status agents-dashboard`, `journalctl --user -u agents-dashboard`. Без активної user-сесії (SSH, контейнер) увімкніть `loginctl enable-linger $USER` або запускайте дашборд вручну.
- Сповіщень нема: встановіть `libnotify-bin` (`notify-send`).

## Telegram
Окремий документ: [TELEGRAM.md](TELEGRAM.md), розділ 9.

## Claude Code (`claude`) не працює
Установлення, вхід, `claude: command not found`, оновлення — [CLAUDE_SETUP.md](CLAUDE_SETUP.md), розділ 7.

## MCP (Figma, Playwright)
Сервер не підключено, потрібна автентифікація, браузер не встановлено — [MCP_SETUP.md](MCP_SETUP.md), розділ 6.

## Відкат і бекапи
- Бекапи: `<CLAUDE_DIR>/backups-agent-team/<час>/` (`settings.json`, змінені файли агентів/навичок). Відновити — скопіювати файл назад.
- Повністю прибрати хуки: `node installer/install.js --uninstall` (або видаліть вручну наші записи з `hooks` та `statusLine` у `settings.json`).
- Якщо `settings.json` зіпсовано — відновіть найновіший бекап; дашборд (вибір типової моделі) також кладе копії в `dashboard/backups/`.
- Зупинити дашборд: див. DASHBOARD.md, розділ «Запуск».
