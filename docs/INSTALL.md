**🇺🇦 Українська** | [🇬🇧 English](en/INSTALL.md)

# Установка

Сторінка містить: передумови для кожної ОС, покрокову установку, усі опції, точний перелік змін у `settings.json`, бекапи, перевірку, типові помилки та ручне встановлення без установника.

Репозиторій: <https://github.com/kravza3026/claude-agent-team>. Позначення: `<CLAUDE_DIR>` — тека конфігурації Claude Code: `~/.claude` (Linux/macOS), `%USERPROFILE%\.claude` (Windows) або значення `$CLAUDE_CONFIG_DIR`.

<!-- BEGIN:counts -->
**Агентів: 22, навичок: 26.**
<!-- END:counts -->

## 0. Що буде встановлено

| Куди | Що |
|---|---|
| `<CLAUDE_DIR>/agents/` | агенти (`*.md`) |
| `<CLAUDE_DIR>/skills/<назва>/` | навички (`SKILL.md` + додаткові файли) |
| `<CLAUDE_DIR>/dashboard/` | код дашборду (дані й токен створюються при першому запуску) |
| `<CLAUDE_DIR>/settings.json` | **лише** наші хуки та `statusLine` (див. розділ 4) |
| `<CLAUDE_DIR>/agent-team-manifest.json` | облік встановленого (версія, хеші файлів, додані хуки) |
| `<CLAUDE_DIR>/backups-agent-team/<час>/` | бекапи перед змінами |

## 1. Linux (Ubuntu/Debian/Fedora/Arch…)

1. **Node.js 18+.** Перевірка: `node -v`. Якщо нема — [nodejs.org/en/download](https://nodejs.org/en/download) або менеджер пакетів дистрибутива / [nvm](https://github.com/nvm-sh/nvm).
2. **Claude Code CLI** і вхід в акаунт: [CLAUDE_SETUP.md](CLAUDE_SETUP.md) (за потреби — [офіційна документація](https://docs.anthropic.com/en/docs/claude-code)). Перевірка: `claude --version`.
3. **git:** `git --version`.
   Опційно: MCP-сервери Figma і Playwright для агентів `figma-reader`, `tester`, `pagespeed` — [MCP_SETUP.md](MCP_SETUP.md).
4. Клонування й установка:
   ```sh
   git clone https://github.com/kravza3026/claude-agent-team.git claude-agent-team && cd claude-agent-team
   ./install.sh --dry-run     # перегляд
   ./install.sh               # установка (запитає підтвердження; --yes — без запитань)
   ```
   Якщо файл не виконується: `sh install.sh` або `node installer/install.js`.
5. Дашборд: `node ~/.claude/dashboard/start.js` → http://127.0.0.1:7777.
6. Автозапуск при вході (необов'язково): `./install.sh --service`. Створюється `~/.config/systemd/user/agents-dashboard.service` і вмикається `systemctl --user enable --now agents-dashboard.service`. Керування: `systemctl --user status|restart|stop agents-dashboard`, логи: `journalctl --user -u agents-dashboard`. Якщо `systemd --user` недоступний (контейнер, WSL без systemd) — створюється `~/.config/autostart/agents-dashboard.desktop` (діє з наступного входу в графічну сесію).
7. Ярлик у меню програм: `--shortcut` (`~/.local/share/applications/agents-dashboard.desktop`).
8. Режим «команди в термінал» (необов'язково): встановіть `tmux`, запускайте `~/.claude/dashboard/claude-tmux --agent orchestrator` замість `claude ...`.

## 2. macOS

1. **Node.js 18+:** `brew install node` або інсталятор з [nodejs.org](https://nodejs.org). Перевірка: `node -v`.
2. **Claude Code CLI** і вхід: [CLAUDE_SETUP.md](CLAUDE_SETUP.md) ([офіційна документація](https://docs.anthropic.com/en/docs/claude-code)).
3. Клонування й установка — як у Linux (`./install.sh`). Якщо система скаржиться на «невідомого розробника» (Gatekeeper/quarantine) для файлів, завантажених архівом: `xattr -dr com.apple.quarantine .` у теці репозиторію, або запускайте `node installer/install.js` напряму. Через `git clone` quarantine-атрибута зазвичай немає.
4. Автозапуск: `./install.sh --service` створює LaunchAgent `~/Library/LaunchAgents/com.claude-agent-team.dashboard.plist` і виконує `launchctl bootstrap gui/<uid> <plist>`. Статус: `launchctl print gui/$(id -u)/com.claude-agent-team.dashboard`; зупинка вручну: `launchctl bootout gui/$(id -u)/com.claude-agent-team.dashboard`. Логи: `~/.claude/dashboard/server.log`.
5. Ярлик: `--shortcut` → `~/Applications/Agents Dashboard.command` (подвійний клік).
6. Сповіщення використовують `osascript`; при першому показі macOS може попросити дозвіл у «Системні налаштування → Сповіщення».
7. tmux: `brew install tmux`, далі `claude-tmux` як у Linux.

## 3. Windows 10/11

1. **Node.js 18+:** [nodejs.org](https://nodejs.org) або `winget install OpenJS.NodeJS.LTS`. Закрийте й відкрийте PowerShell; `node -v`.
2. **Claude Code CLI** і вхід: [CLAUDE_SETUP.md](CLAUDE_SETUP.md) ([офіційна документація](https://docs.anthropic.com/en/docs/claude-code)).
3. **git** — [git-scm.com](https://git-scm.com/download/win).
4. Клонування й установка (PowerShell 5.1+):
   ```powershell
   git clone https://github.com/kravza3026/claude-agent-team.git claude-agent-team; cd claude-agent-team
   .\install.ps1 --dry-run
   .\install.ps1
   ```
   **ExecutionPolicy.** Якщо видно «running scripts is disabled on this system», виберіть один із варіантів:
   - одноразово, без зміни системи: `powershell -ExecutionPolicy Bypass -File .\install.ps1`;
   - для поточного вікна: `Set-ExecutionPolicy -Scope Process Bypass`, далі `.\install.ps1`;
   - без PowerShell: подвійний клік по `install.cmd` (або `install.cmd --dry-run` у `cmd`);
   - або напряму: `node installer\install.js`.
   Скрипти, завантажені архівом із браузера, можуть мати «Mark of the Web»: `Unblock-File .\install.ps1`.
5. Дашборд: `node "$env:USERPROFILE\.claude\dashboard\start.js"` (або `start.cmd` / `start.ps1` у тій теці) → http://127.0.0.1:7777.
6. Автозапуск: `.\install.ps1 --service` створює Scheduled Task `ClaudeAgentTeamDashboard` (при вході поточного користувача, без прав адміністратора, прихований запуск через `wscript.exe` + `dashboard\start-hidden.vbs`). Якщо `schtasks` не вдався — копія запускача кладеться в теку Startup. Перевірка: `schtasks /Query /TN ClaudeAgentTeamDashboard`.
7. Ярлик: `--shortcut` → `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Agents Dashboard.lnk`.
8. **Шляхи та лапки в хуках.** Хук записується як `node "C:\Users\Імʼя\.claude\dashboard\hook.js"` (у JSON — з подвоєними зворотними слешами). Якщо шлях містить пробіли чи кирилицю, лапки обов'язкові — установник ставить їх сам.
9. Обмеження: режим tmux недоступний (команди з дашборду йдуть чергою через хуки `deliver.js`); `claude-tmux`/`claude-run` не використовуються.

## 4. Що змінюється в `settings.json`

Установник читає `<CLAUDE_DIR>/settings.json` як JSON, робить бекап, додає **лише** перелічене нижче й записує файл атомарно (тимчасовий файл + rename). Якщо файла нема — створюється мінімальний. Якщо JSON невалідний — файл **не чіпається**, установник пише про це і завершується з кодом 3 (файли агентів/навичок при цьому встановлюються).

**Хуки** (кожен — окремий запис `{ "hooks": [ { "type": "command", ... } ] }`; `node <абсолютний шлях>/dashboard/…`):

| Подія | Скрипт | Режим |
|---|---|---|
| SubagentStart | `hook.js` | async |
| SubagentStop | `hook.js` | async |
| PreToolUse | `hook.js` | async |
| PreToolUse | `deliver.js` | синхронний |
| PostToolUse | `hook.js` | async |
| UserPromptSubmit | `hook.js` | async |
| UserPromptSubmit | `deliver.js` | синхронний |
| Stop | `deliver.js` | синхронний |
| Stop | `hook.js` | async |
| SessionStart | `hook.js` | async |
| Notification | `hook.js` | async |
| PermissionRequest | `hook.js` | async |

Усі з `"timeout": 5`. Разом 12 записів у 9 подіях.

**statusLine:** `{ "type": "command", "command": "node <шлях>/dashboard/statusline.js", "refreshInterval": 30 }` — ставиться **лише якщо statusLine відсутній**. Якщо у вас уже є свій — він не перезаписується; установник покаже рядок для ручного підключення (або перезапишіть з `--force`: старий збережеться в бекапі й буде відновлений при видаленні).

**Ніколи не змінюються:** `permissions` (`allow`/`deny`), `env`, `model`, `language`, `autoMode`, `enabledPlugins`, будь-які інші ключі та ваші власні хуки. Дублі не створюються: наші хуки розпізнаються за шляхом до `dashboard/hook.js|deliver.js|statusline.js`.

Формат файла (відступ, порядок ключів) зберігається. Бекап: `<CLAUDE_DIR>/backups-agent-team/<час>/settings.json`.

## 5. Опції установника

`node installer/install.js [опції]` (обгортки `install.sh`/`install.ps1`/`install.cmd` передають аргументи як є).

| Опція | Дія |
|---|---|
| `--target <тека>` | цільова тека (типово `$CLAUDE_CONFIG_DIR` або `~/.claude`) |
| `--dry-run` | показати дії, нічого не записуючи |
| `--yes`, `-y` | без запитань (у неінтерактивному режимі, напр. CI, діє автоматично) |
| `--force` | перезаписати змінені вами файли (завжди з бекапом) і чужий `statusLine` |
| `--no-agents` / `--no-skills` / `--no-dashboard` | не встановлювати відповідну частину |
| `--no-hooks` | не чіпати `settings.json` |
| `--service` | автозапуск дашборду |
| `--shortcut` | ярлик «відкрити дашборд» |
| `--port <n>` | порт дашборду 1024–65535 (типово 7777; змінна `AGENTS_DASHBOARD_PORT`) |
| `--update` | оновити наявне встановлення (потрібен manifest) |
| `--uninstall` [`--purge`] | видалити встановлене; `--purge` — ще й дані дашборду |
| `--list` | що входить до набору і стан у цілі |
| `--lang uk\|en` | мова повідомлень установника (типово за `LANG`/локаллю: `uk*` → українська, інакше англійська) |
| `--help`, `--version` | довідка, версія |

Коди виходу: `0` успіх; `1` помилка середовища (Node < 18, нема прав, нема manifest); `2` невірні аргументи; `3` `settings.json` невалідний/нестандартний і не змінений.

Поведінка:

- **Ідемпотентність.** Повторний запуск пропускає однакові файли; `settings.json` не змінюється, дублів нема.
- **Змінені вами файли** (агенти/навички/код дашборду) без `--force` пропускаються з попередженням; в інтерактивному режимі установник спитає. Перед перезаписом — бекап.
- **Оновлення без ваших змін** (файл збігається з попередньою встановленою версією) виконується автоматично, застарілі файли набору прибираються.
- **Підстановка шляху:** у `agents/orchestrator.md` текст `{{CLAUDE_DIR}}` замінюється на реальну теку встановлення (для виклику `log.js`).
- Перевірки на старті: версія Node, наявність `claude` у PATH (лише попередження), право запису, ОС.

## 6. Перевірка успіху

```sh
node installer/install.js --list                 # усе «актуальний»
node ~/.claude/dashboard/start.js --no-open      # «Дашборд: http://127.0.0.1:7777»
curl -s http://127.0.0.1:7777/agents | head -c 200   # JSON агентів (Windows: відкрийте URL у браузері)
claude --agent orchestrator                      # у вашому проєкті
```
У `settings.json` має бути 12 хуків з вашим шляхом до `dashboard`. Після першої дії в Claude Code в дашборді з'являються події. Якщо ні — `docs/TROUBLESHOOTING.md`.

## 7. Бекапи і відкат

Усі бекапи — в `<CLAUDE_DIR>/backups-agent-team/<YYYYMMDD-HHMMSS>/` зі збереженням відносних шляхів (`settings.json`, `agents/…`). Відкат: скопіюйте файл назад. Повне видалення: розділ 8.

## 8. Видалення

```sh
node installer/install.js --uninstall [--purge] [--target <тека>]
```
Видаляє лише файли, чий хеш збігається з manifest (змінені лишає й перелічує), прибирає наші хуки/`statusLine` з `settings.json` (з бекапом; відновлює ваш попередній `statusLine`, якщо ви користувались `--force`), зупиняє й видаляє автозапуск та ярлики. Дані дашборду (події, токен) лишаються, якщо не вказано `--purge`. Окремо від установника зупиніть запущений процес дашборду (див. TROUBLESHOOTING).

## 9. Типові помилки

| Повідомлення | Причина / рішення |
|---|---|
| `Потрібен Node.js 18` | оновіть Node (`node -v`) |
| `Node.js не знайдено` (wrapper) | встановіть Node, відкрийте новий термінал |
| `settings.json НЕ змінено (невалідний JSON…)` | виправте файл (наприклад, кому/лапки), повторіть установку |
| `ПРОПУЩЕНО (змінено вами)` | ви правили файл; `--force` перезапише після бекапу |
| `У settings.json уже є ВАШ statusLine` | додайте наш рядок вручну (установник його друкує) або `--force` |
| `Немає прав запису` | виберіть іншу `--target` або виправте права |
| `Немає agent-team-manifest.json` | у цілі нічого не встановлено цим установником |

## 10. Ручне встановлення (без установника)

1. Скопіюйте теки:
   ```sh
   mkdir -p ~/.claude/agents ~/.claude/skills ~/.claude/dashboard
   cp agents/*.md ~/.claude/agents/
   cp -r skills/* ~/.claude/skills/
   cp -r dashboard/* ~/.claude/dashboard/
   ```
   (Windows PowerShell: `Copy-Item agents\*.md $env:USERPROFILE\.claude\agents\`, `Copy-Item -Recurse skills\* ...`, `Copy-Item -Recurse dashboard\* ...`.)
2. У `~/.claude/agents/orchestrator.md` замініть `{{CLAUDE_DIR}}` на абсолютний шлях теки (з прямими слешами), напр. `sed -i "s#{{CLAUDE_DIR}}#$HOME/.claude#g" ~/.claude/agents/orchestrator.md`.
3. Зробіть бекап `settings.json` (`cp ~/.claude/settings.json ~/.claude/settings.json.bak`) і додайте вручну блок `hooks` і `statusLine` за таблицею з розділу 4, наприклад для однієї події:
   ```json
   "hooks": {
     "SubagentStart": [ { "hooks": [ { "type": "command", "command": "node /home/USER/.claude/dashboard/hook.js", "async": true, "timeout": 5 } ] } ]
   }
   ```
   Якщо розділ `hooks` у вас уже є — додавайте записи до існуючих масивів подій, не замінюючи їх. На Windows шлях у лапках: `"node \"C:\\Users\\USER\\.claude\\dashboard\\hook.js\""`.
4. Додайте `statusLine` (лише якщо його ще нема) за розділом 4.
5. На Linux/macOS: `chmod +x ~/.claude/dashboard/*.js ~/.claude/dashboard/claude-tmux ~/.claude/dashboard/claude-run`.
6. Запустіть `node ~/.claude/dashboard/start.js`.

Файл `agent-team-manifest.json` при ручному встановленні не створюється, тож `--uninstall` потім нічого не видалить: прибирайте вручну.

## 11. Опційно: Telegram

Керувати оркестратором з телефона можна через офіційний плагін Claude Code. Установник Telegram **не налаштовує** і плагін не ставить. Покрокова інструкція: [TELEGRAM.md](TELEGRAM.md).
