**🇺🇦 Українська** | [🇬🇧 English](README.en.md)

# claude-agent-team

Готова «коробка» для [Claude Code](https://docs.anthropic.com/en/docs/claude-code): команда з 12 агентів на чолі з оркестратором, 23 навички та локальний дашборд з подіями агентів, лімітами й командами. Установлюється однією командою на Linux, macOS і Windows; нічого зайвого у ваших налаштуваннях не чіпає.

<!-- BEGIN:counts -->
**Агентів: 12, навичок: 23.**
<!-- END:counts -->

## Language / Мова

Документація двомовна: українська (основна, цей файл і `docs/*.md`) та англійська ([README.en.md](README.en.md), `docs/en/*.md`). Установник (`--lang uk|en`) і дашборд (перемикач UA/EN) також двомовні. / The documentation is bilingual: Ukrainian (primary) and English ([README.en.md](README.en.md), `docs/en/*.md`). The installer (`--lang uk|en`) and the dashboard (UA/EN switch) are bilingual too.

## Що всередині

```
                      ┌────────────────────┐
   ви ── термінал ───►│    orchestrator    │◄── Telegram (опційно)
   ── дашборд ───────►│ план · делегування │
                      └─────────┬──────────┘
        ┌───────────┬───────────┼────────────┬───────────────┐
     planner   figma-reader  content-writer  3d-modeler   (за потреби)
        │                                        │
        ▼                                        ▼
 frontend-developer ◄── контракт ──► backend-developer ── database-engineer
        └──────────────┬──────────────────┘
                       ▼
        tester ──FAIL──► debugger / developer (цикл fix → retest, до 3 разів)
          │ PERF WARN/FAIL
          ▼
      pagespeed ──► tester ──► reviewer ──► звіт вам
```

- **Агенти** (`agents/`) — ролі з чіткими межами; оркестратор не пише великий код, а планує, делегує й перевіряє.
- **Навички** (`skills/`) — знання для ролей: дизайн, типографіка, three.js, Blender, швидкодія, Laravel-практики тощо.
- **Дашборд** (`dashboard/`) — локальна веб-панель (127.0.0.1): живі події, 3D/2D-схема, ліміти й витрати, команди з браузера, вибір моделі.
- **Установник** (`installer/install.js`) — один код на Node для всіх ОС: dry-run, бекапи, безпечне злиття `settings.json`, видалення.

## Вимоги

| Що | Обов'язково? |
|---|---|
| Node.js 18+ | так (установник і дашборд; без npm-залежностей) |
| Claude Code CLI (`claude`) | так, для роботи агентів ([офіційна документація](https://docs.anthropic.com/en/docs/claude-code)); установник лише попереджає, якщо його нема в PATH |
| git | так, щоб клонувати репозиторій |
| tmux | ні (Linux/macOS: режим «команди в термінал» з дашборду) |
| Blender | ні (лише для агента `3d-modeler`) |

## Швидкий старт

**Крок 0.** Встановіть Claude Code та увійдіть в акаунт — [docs/CLAUDE_SETUP.md](docs/CLAUDE_SETUP.md).

Репозиторій: <https://github.com/kravza3026/claude-agent-team>. Ми свідомо не пропонуємо `curl ... | sh`: спершу клонуйте й за бажанням перегляньте код (див. `docs/SECURITY.md`).

### Linux

```sh
git clone https://github.com/kravza3026/claude-agent-team.git claude-agent-team && cd claude-agent-team
./install.sh --dry-run      # 1) подивитись, що буде зроблено (нічого не пишеться)
./install.sh                # 2) встановити в ~/.claude
```
Перевірка й запуск:
```sh
node ~/.claude/dashboard/start.js        # дашборд -> http://127.0.0.1:7777
claude --agent orchestrator              # у вашому проєкті
```

### macOS

```sh
git clone https://github.com/kravza3026/claude-agent-team.git claude-agent-team && cd claude-agent-team
./install.sh --dry-run
./install.sh
node ~/.claude/dashboard/start.js
claude --agent orchestrator
```
(Якщо Gatekeeper/«невідомий розробник» блокує скрипт: `xattr -d com.apple.quarantine install.sh` або запускайте через `node installer/install.js`; деталі в `docs/INSTALL.md`.)

### Windows (PowerShell)

```powershell
git clone https://github.com/kravza3026/claude-agent-team.git claude-agent-team; cd claude-agent-team
.\install.ps1 --dry-run
.\install.ps1
node "$env:USERPROFILE\.claude\dashboard\start.js"
claude --agent orchestrator
```
Якщо PowerShell забороняє скрипти: `powershell -ExecutionPolicy Bypass -File .\install.ps1` або подвійний клік по `install.cmd` (див. `docs/INSTALL.md`).

Після `node .../start.js` відкрийте http://127.0.0.1:7777 (браузер відкривається автоматично). Усі три ОС також можна запускати напряму: `node installer/install.js [опції]`.

## Як перевірити, що все працює

1. `node installer/install.js --list` — показує, що з набору встановлено.
2. У дашборді після будь-якої дії в Claude Code з'являються події.
3. `claude --agent orchestrator` → дайте невелике завдання; у дашборді видно роботу агентів.

## Оновлення

```sh
git pull
node installer/install.js --update       # Windows: .\install.ps1 --update
```
Файли, які ви змінили, не перезаписуються (буде попередження); `--force` перезапише їх **після бекапу** в `<тека>/backups-agent-team/<час>/`.

## Видалення

```sh
node installer/install.js --uninstall          # Windows: .\uninstall.ps1
node installer/install.js --uninstall --purge  # разом із даними дашборду (події, токен)
```
Видаляються лише файли, встановлені установником і не змінені вами; з `settings.json` прибираються тільки наші хуки та `statusLine` (з бекапом).

## Що працює на якій ОС

| Можливість | Linux | macOS | Windows |
|---|---|---|---|
| Установник, агенти, навички | так | так | так |
| Хуки й дашборд | так | так | так |
| Команди з дашборду через чергу (хуки `deliver.js`) | так | так | так |
| Команди «в термінал» (tmux, `claude-tmux`) | так (потрібен tmux) | так (потрібен tmux) | ні (вимкнено; працює черга) |
| Системні сповіщення | `notify-send` | `osascript` | PowerShell (balloon) |
| Автозапуск `--service` | systemd `--user` / XDG autostart | LaunchAgent | Scheduled Task / Startup |
| Ярлик `--shortcut` | `.desktop` | `.command` | `.lnk` |
| Тестовано автором | так (smoke + реальний запуск) | **ні** (лише юніт-тести рядків; CI) | **ні** (лише юніт-тести рядків; CI) |

Windows і macOS-гілки перевірені лише статично та в CI (`.github/workflows/ci.yml`); якщо щось не працює — відкрийте issue з виводом `--dry-run`.

## Документація

- [docs/CLAUDE_SETUP.md](docs/CLAUDE_SETUP.md) — підключення Claude Code: встановлення, вхід, перший запуск
- [docs/INSTALL.md](docs/INSTALL.md) — установка покроково, опції, ручне встановлення
- [docs/AGENTS.md](docs/AGENTS.md) — 12 агентів, схема взаємодії, як додати свого
- [docs/SKILLS.md](docs/SKILLS.md) — 23 навички, як додати свою
- [docs/DASHBOARD.md](docs/DASHBOARD.md) — дашборд: можливості, безпека, приватність
- [docs/TELEGRAM.md](docs/TELEGRAM.md) — керування оркестратором з телефона (опційно)
- [docs/SECURITY.md](docs/SECURITY.md) — що змінюється, а що ні; модель безпеки
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — типові проблеми й відкат
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — внесок і перевірки
- English: [README.en.md](README.en.md) і `docs/en/`

Ліцензія: MIT (`LICENSE`); сторонні компоненти — `THIRD_PARTY_NOTICES.md`.
