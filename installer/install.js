#!/usr/bin/env node
/*
 * Установник claude-agent-team: агенти + навички + дашборд для Claude Code.
 * Єдина реалізація для Linux, macOS і Windows. Node >= 18, без залежностей.
 * Документація: docs/INSTALL.md. Запуск: node installer/install.js --help
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const readVersion = () => { try { return fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim(); } catch (_) { return '0.0.0'; } };
const VERSION = readVersion();

const MANIFEST_NAME = 'agent-team-manifest.json';
const BACKUP_DIR_NAME = 'backups-agent-team';
const SERVICE_NAME = 'agents-dashboard';          // systemd unit / .desktop
const LAUNCHD_LABEL = 'com.claude-agent-team.dashboard';
const TASK_NAME = 'ClaudeAgentTeamDashboard';     // Windows Scheduled Task
const DEFAULT_PORT = 7777;

// Файли, що створюються дашбордом під час роботи: не копіюються з репозиторію, видаляються лише з --purge
const DASH_RUNTIME = ['events.jsonl', 'events.jsonl.old', 'inbox.jsonl', 'inbox.lock', 'acks.jsonl', 'panes.json', 'status.json', 'usage-cache.json', '.token', 'mute', 'server.log', 'server.pid', 'lang', 'start-hidden.vbs'];
const DASH_RUNTIME_DIRS = ['backups'];

// ---------------------------------------------------------------------------------------------
// Хуки, які ми встановлюємо (за зразком робочої конфігурації). hook = асинхронний збір подій,
// deliver = синхронна доставка команд із дашборду.
// ---------------------------------------------------------------------------------------------
const HOOK_SPEC = [
  ['SubagentStart', ['hook']],
  ['SubagentStop', ['hook']],
  ['PreToolUse', ['hook', 'deliver']],
  ['PostToolUse', ['hook']],
  ['UserPromptSubmit', ['hook', 'deliver']],
  ['Stop', ['deliver', 'hook']],
  ['SessionStart', ['hook']],
  ['Notification', ['hook']],
  ['PermissionRequest', ['hook']],
];
const SCRIPT_FILE = { hook: 'hook.js', deliver: 'deliver.js', statusline: 'statusline.js' };

// ---------------------------------------------------------------------------------------------
// Чисті функції (тестуються з параметром platform)
// ---------------------------------------------------------------------------------------------

/** Лапкування шляху для командного рядка хука. */
function quoteForCommand(p, platform) {
  if (platform === 'win32') return '"' + p + '"';
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(p)) return p;
  return "'" + p.replace(/'/g, "'\\''") + "'";
}

/** Команда хука: node <абсолютний шлях до скрипта>. */
function hookCommand(scriptPath, platform) {
  return 'node ' + quoteForCommand(scriptPath, platform);
}

function normPath(s, platform) {
  let x = String(s).replace(/\\/g, '/').replace(/["']/g, '');
  return platform === 'win32' ? x.toLowerCase() : x;
}

/** Чи посилається командний рядок на конкретний скрипт (незалежно від лапок/слешів). */
function commandRefersTo(command, scriptPath, platform) {
  if (typeof command !== 'string') return false;
  return normPath(command, platform).includes(normPath(scriptPath, platform));
}

const pjoin = platform => (platform === 'win32' ? path.win32 : path.posix).join;

function newHookEntry(kind, dashDir, platform) {
  const command = hookCommand(pjoin(platform)(dashDir, SCRIPT_FILE[kind]), platform);
  const h = { type: 'command', command };
  if (kind === 'hook') h.async = true;
  h.timeout = 5;
  return { hooks: [h] };
}

function eventHasScript(groups, scriptPath, platform) {
  return groups.some(g => g && Array.isArray(g.hooks) && g.hooks.some(h => h && commandRefersTo(h.command, scriptPath, platform)));
}

/**
 * Додає наші хуки/statusLine до об'єкта settings (не мутує вхідний).
 * Повертає { settings, added:[{event,kind}], statusLine:'added'|'present'|'foreign'|'replaced', previousStatusLine, error }.
 */
function applySettings(settings, { dashDir, platform, withHooks = true, withStatusLine = true, force = false }) {
  const out = JSON.parse(JSON.stringify(settings || {}));
  const res = { settings: out, added: [], statusLine: null, previousStatusLine: null, error: null };
  if (withHooks) {
    if (out.hooks !== undefined && (out.hooks === null || typeof out.hooks !== 'object' || Array.isArray(out.hooks))) {
      res.error = 'ключ "hooks" у settings.json має неочікуваний тип; хуки не додано';
      return res;
    }
    for (const [ev] of HOOK_SPEC) {
      if (out.hooks && out.hooks[ev] !== undefined && !Array.isArray(out.hooks[ev])) {
        res.error = `hooks.${ev} у settings.json має неочікуваний тип; хуки не додано`;
        return res;
      }
    }
    for (const [ev, kinds] of HOOK_SPEC) {
      for (const kind of kinds) {
        const script = pjoin(platform)(dashDir, SCRIPT_FILE[kind]);
        const groups = out.hooks && out.hooks[ev];
        if (groups && eventHasScript(groups, script, platform)) continue;
        out.hooks = out.hooks || {};
        out.hooks[ev] = out.hooks[ev] || [];
        out.hooks[ev].push(newHookEntry(kind, dashDir, platform));
        res.added.push({ event: ev, kind, command: out.hooks[ev][out.hooks[ev].length - 1].hooks[0].command });
      }
    }
  }
  if (withStatusLine) {
    const script = pjoin(platform)(dashDir, SCRIPT_FILE.statusline);
    const want = { type: 'command', command: hookCommand(script, platform), refreshInterval: 30 };
    const cur = out.statusLine;
    if (cur === undefined) { out.statusLine = want; res.statusLine = 'added'; }
    else if (cur && commandRefersTo(cur.command, script, platform)) res.statusLine = 'present';
    else if (force) { res.previousStatusLine = cur; out.statusLine = want; res.statusLine = 'replaced'; }
    else res.statusLine = 'foreign';
  }
  return res;
}

/** Прибирає лише наші хуки/statusLine. Повертає { settings, removed:n, statusLine:'removed'|'restored'|'kept'|null }. */
function unapplySettings(settings, { dashDir, platform, previousStatusLine = null }) {
  const out = JSON.parse(JSON.stringify(settings || {}));
  const res = { settings: out, removed: 0, statusLine: null };
  const scripts = [SCRIPT_FILE.hook, SCRIPT_FILE.deliver].map(f => pjoin(platform)(dashDir, f));
  if (out.hooks && typeof out.hooks === 'object' && !Array.isArray(out.hooks)) {
    for (const ev of Object.keys(out.hooks)) {
      if (!Array.isArray(out.hooks[ev])) continue;
      const kept = [];
      for (const g of out.hooks[ev]) {
        if (!g || !Array.isArray(g.hooks)) { kept.push(g); continue; }
        const before = g.hooks.length;
        g.hooks = g.hooks.filter(h => !(h && scripts.some(s => commandRefersTo(h.command, s, platform))));
        res.removed += before - g.hooks.length;
        if (g.hooks.length > 0 || before === 0) kept.push(g);
      }
      if (kept.length) out.hooks[ev] = kept; else delete out.hooks[ev];
    }
    if (Object.keys(out.hooks).length === 0) delete out.hooks;
  }
  const sl = pjoin(platform)(dashDir, SCRIPT_FILE.statusline);
  if (out.statusLine && commandRefersTo(out.statusLine.command, sl, platform)) {
    if (previousStatusLine) { out.statusLine = previousStatusLine; res.statusLine = 'restored'; }
    else { delete out.statusLine; res.statusLine = 'removed'; }
  } else if (out.statusLine) res.statusLine = 'kept';
  return res;
}

// ---- автозапуск ----
function xmlEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const sdQuote = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

function buildSystemdUnit({ nodePath, dashDir, port }) {
  return [
    '[Unit]', 'Description=Claude Agent Team dashboard (127.0.0.1)', 'After=default.target', '',
    '[Service]', `ExecStart=${sdQuote(nodePath)} ${sdQuote(path.join(dashDir, 'server.js'))}`,
    `WorkingDirectory=${dashDir}`, `Environment=AGENTS_DASHBOARD_PORT=${port}`, 'Restart=on-failure', 'RestartSec=3', '',
    '[Install]', 'WantedBy=default.target', '',
  ].join('\n');
}

function buildXdgAutostart({ nodePath, dashDir, port }) {
  const q = s => '"' + String(s).replace(/(["`$\\])/g, '\\$1') + '"';
  return ['[Desktop Entry]', 'Type=Application', 'Name=Claude Agent Team dashboard',
    `Exec=env AGENTS_DASHBOARD_PORT=${port} ${q(nodePath)} ${q(path.join(dashDir, 'server.js'))}`,
    'Terminal=false', 'X-GNOME-Autostart-enabled=true', ''].join('\n');
}

function buildLaunchdPlist({ nodePath, dashDir, port }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${xmlEsc(LAUNCHD_LABEL)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEsc(nodePath)}</string>
    <string>${xmlEsc(path.join(dashDir, 'server.js'))}</string>
  </array>
  <key>WorkingDirectory</key><string>${xmlEsc(dashDir)}</string>
  <key>EnvironmentVariables</key>
  <dict><key>AGENTS_DASHBOARD_PORT</key><string>${xmlEsc(port)}</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${xmlEsc(path.join(dashDir, 'server.log'))}</string>
  <key>StandardErrorPath</key><string>${xmlEsc(path.join(dashDir, 'server.log'))}</string>
</dict>
</plist>
`;
}

/** VBS-запускач без вікна консолі (Windows). */
function buildWinVbs({ nodePath, dashDir, port }) {
  const v = s => '"' + String(s).replace(/"/g, '""') + '"';
  const cmd = '"' + nodePath + '" "' + path.join(dashDir, 'server.js') + '"';
  return [
    'Set sh = CreateObject("WScript.Shell")',
    `sh.CurrentDirectory = ${v(dashDir)}`,
    `sh.Environment("Process")("AGENTS_DASHBOARD_PORT") = ${v(port)}`,
    `sh.Run ${v(cmd)}, 0, False`, '',
  ].join('\r\n');
}

function buildSchtasksCreateArgs({ vbsPath }) {
  return ['/Create', '/TN', TASK_NAME, '/TR', `wscript.exe "${vbsPath}"`, '/SC', 'ONLOGON', '/RL', 'LIMITED', '/F'];
}

function buildDesktopEntry({ nodePath, dashDir }) {
  const q = s => '"' + String(s).replace(/(["`$\\])/g, '\\$1') + '"';
  return ['[Desktop Entry]', 'Type=Application', 'Name=Панель агентів', 'Comment=Claude Agent Team dashboard',
    `Exec=${q(nodePath)} ${q(path.join(dashDir, 'start.js'))}`, 'Icon=' + path.join(dashDir, 'icon.svg'), 'Terminal=false', 'Categories=Development;', ''].join('\n');
}

function buildMacCommand({ nodePath, dashDir }) {
  const q = s => "'" + String(s).replace(/'/g, "'\\''") + "'";
  return `#!/bin/sh\n${q(nodePath)} ${q(path.join(dashDir, 'start.js'))}\n`;
}

function buildPsShortcutScript({ lnkPath, dashDir }) {
  const q = s => "'" + String(s).replace(/'/g, "''") + "'";
  return `$s = (New-Object -ComObject WScript.Shell).CreateShortcut(${q(lnkPath)}); $s.TargetPath = ${q(path.join(dashDir, 'start.cmd'))}; $s.WorkingDirectory = ${q(dashDir)}; $s.WindowStyle = 7; $s.IconLocation = 'shell32.dll,13'; $s.Description = 'Claude Agent Team dashboard'; $s.Save()`;
}

// ---- мова виводу (uk | en) ----
// Повідомлення написані українською; для --lang en статичні фрагменти замінюються за таблицею (динамічні частини - шляхи, числа - не чіпаються).
let LANG = 'uk';
function detectLang(env = process.env) {
  const v = env.LC_ALL || env.LC_MESSAGES || env.LANGUAGE || env.LANG || '';
  if (v && v !== 'C' && v !== 'POSIX') return /^uk/i.test(v) ? 'uk' : 'en';
  try { return /^uk/i.test(Intl.DateTimeFormat().resolvedOptions().locale) ? 'uk' : 'en'; } catch (_) { return 'en'; }
}
const EN = [
  ['ключ "hooks" у settings.json має неочікуваний тип; хуки не додано', 'key "hooks" in settings.json has an unexpected type; hooks not added'],
  [' у settings.json має неочікуваний тип; хуки не додано', ' in settings.json has an unexpected type; hooks not added'],
  ['--target потребує шлях', '--target requires a path'],
  ['--lang: uk або en', '--lang: uk or en'],
  ['--port: ціле число 1024–65535', '--port: integer 1024-65535'],
  ['Невідома опція: ', 'Unknown option: '],
  ['Довідка: node installer/install.js --help', 'Help: node installer/install.js --help'],
  ['Потрібен Node.js 18 або новіший (зараз ', 'Node.js 18 or newer is required (current: '],
  ['ОС: ', 'OS: '],
  ['Ціль: ', 'Target: '],
  ['  (dry-run: нічого не записується)', '  (dry-run: nothing is written)'],
  ['Немає ', 'Missing '],
  [' у ', ' in '],
  [': нічого оновлювати. Виконайте звичайне встановлення.', ': nothing to update. Run a normal install.'],
  [': нічого видаляти (установник видаляє лише те, що сам встановив).', ': nothing to remove (the installer only removes what it installed).'],
  ['команду `claude` не знайдено у PATH. Встановіть Claude Code CLI: https://docs.anthropic.com/en/docs/claude-code (установник продовжить роботу).', 'command `claude` not found in PATH. Install Claude Code CLI: https://docs.anthropic.com/en/docs/claude-code (the installer will continue).'],
  ['Немає прав запису в ', 'No write permission in '],
  ['Встановити агентів/навички/дашборд у ', 'Install agents/skills/dashboard into '],
  ['Файл ', 'File '],
  [' змінено. Перезаписати (бекап буде)? [y/N] ', ' was modified. Overwrite (a backup will be made)? [y/N] '],
  ['Видалити встановлене з ', 'Remove installed files from '],
  ['Скасовано.', 'Cancelled.'],
  ['вимкнено (--no-hooks)', 'disabled (--no-hooks)'],
  ['дашборду нема (--no-dashboard): хуки не додаються', 'no dashboard (--no-dashboard): hooks are not added'],
  ["корінь settings.json не є об'єктом", 'the root of settings.json is not an object'],
  ['невалідний JSON: ', 'invalid JSON: '],
  ['settings.json НЕ змінено (', 'settings.json NOT modified ('],
  ['). Виправте файл і запустіть установник ще раз.', '). Fix the file and run the installer again.'],
  ['settings.json НЕ змінено: ', 'settings.json NOT modified: '],
  ['автозапуск пропущено: дашборд не встановлюється (--no-dashboard)', 'autostart skipped: the dashboard is not being installed (--no-dashboard)'],
  ['\nПідсумок видалення', '\nUninstall summary'],
  ['\nПідсумок', '\nSummary'],
  ['встановлено нових файлів', 'new files installed'],
  ['оновлено (без ваших змін)', 'updated (no local changes)'],
  ['без змін (однакові)', 'unchanged (identical)'],
  ['перезаписано з --force/підтвердженням (з бекапом)', 'overwritten with --force/confirmation (backed up)'],
  ['видалено застарілих файлів набору', 'obsolete kit files removed'],
  ['ПРОПУЩЕНО (змінено вами): ', 'SKIPPED (modified by you): '],
  ['    Щоб оновити їх до версії набору: повторіть з --force (бекап буде створено).', '    To update them to the kit version: rerun with --force (a backup will be made).'],
  ['буде змінено', 'will be modified'], ['змінено (бекап створено)', 'modified (backup created)'], ['НЕ змінено', 'NOT modified'], ['не чіпали', 'not touched'],
  ['    додано хуків: ', '    hooks added: '],
  ['statusLine: додано', 'statusLine: added'], ['statusLine: уже налаштовано', 'statusLine: already set up'],
  ['statusLine: замінено (попередній збережено в manifest і бекапі)', 'statusLine: replaced (previous one saved in the manifest and backup)'],
  ['У settings.json уже є ВАШ statusLine - не перезаписано. Щоб дашборд бачив ліміти, підключіть вручну:', 'settings.json already has YOUR statusLine - not overwritten. To let the dashboard see limits, add it manually:'],
  ['(або повторіть установку з --force: старий statusLine буде збережено в бекапі)', '(or rerun the install with --force: the old statusLine will be kept in the backup)'],
  ['  Бекапи: ', '  Backups: '],
  ['\nDry-run завершено: файли не змінено.', '\nDry-run finished: no files were changed.'],
  ['\nГотово. Далі:', '\nDone. Next:'],
  ['1) Дашборд:      ', '1) Dashboard:      '],
  ['(автозапуск при вході: повторіть установку з --service)', '(autostart at login: rerun the install with --service)'],
  ['2) Оркестратор:  ', '2) Orchestrator:   '],
  ['3) Вимкнути:     ', '3) Uninstall:      '],
  ['Опційно: керування з телефона через Telegram - docs/TELEGRAM.md (установник Telegram не налаштовує).', 'Optional: control from your phone via Telegram - docs/en/TELEGRAM.md (the installer does not configure Telegram).'],
  ['Документація: docs/INSTALL.md, docs/TROUBLESHOOTING.md', 'Documentation: docs/en/INSTALL.md, docs/en/TROUBLESHOOTING.md'],
  ['Помилка установника: ', 'Installer error: '],
  ['автозапуск: systemd --user unit', 'autostart: systemd --user unit'],
  ['   ! не вдалось увімкнути unit; перегляньте: ', '   ! could not enable the unit; check: '],
  ['автозапуск: systemd --user недоступний, XDG autostart ', 'autostart: systemd --user unavailable, XDG autostart '],
  [' (діятиме з наступного входу)', ' (takes effect at next login)'],
  ['автозапуск: LaunchAgent', 'autostart: LaunchAgent'],
  ['   ! launchctl bootstrap не вдався; спробуйте вийти/увійти або: ', '   ! launchctl bootstrap failed; try logging out/in or run: '],
  ['автозапуск: Scheduled Task "', 'autostart: Scheduled Task "'], [' (при вході) -> ', ' (at login) -> '],
  ['   schtasks не вдався; запасний варіант: файл у теці Startup ', '   schtasks failed; fallback: file in the Startup folder '],
  ['автозапуск: непідтримувана ОС ', 'autostart: unsupported OS '],
  ['автозапуск (', 'autostart ('], ['): зупинка й видалення', '): stopping and removing'],
  ['ярлик не створено: ', 'shortcut not created: '], ['ярлик: ', 'shortcut: '],
  ['код ', 'code '],
  ['Встановлено: версія ', 'Installed: version '],
  ['Manifest не знайдено: набір не встановлено в цю теку.', 'Manifest not found: the kit is not installed in this directory.'],
  [' файлів', ' files'],
  ['частково/змінено', 'partial/modified'], ['актуальний', 'up to date'], ['застарілий', 'outdated'], ['змінено вами', 'modified by you'], ['нема', 'missing'],
  ['видалено файлів: ', 'files removed: '],
  ['ЛИШЕНО (змінені вами): ', 'KEPT (modified by you): '],
  ['settings.json невалідний - НЕ змінено; приберіть наші хуки вручну (docs/INSTALL.md)', 'settings.json is invalid - NOT modified; remove our hooks manually (docs/en/INSTALL.md)'],
  ['прибрано хуків: ', 'hooks removed: '], ['; statusLine: ', '; statusLine: '], ['не наш', 'not ours'], ['; бекап: ', '; backup: '],
  ['settings.json не знайдено', 'settings.json not found'], ['без змін', 'unchanged'],
  ['Дані дашборду залишено (', 'Dashboard data kept ('], ['); видалити: --uninstall --purge', '); to remove: --uninstall --purge'],
];
EN.sort((a, b) => b[0].length - a[0].length);
function tr(s) {
  if (LANG !== 'en' || !/[Ѐ-ӿ]/.test(s)) return s;
  for (const [u, e] of EN) if (s.includes(u)) s = s.split(u).join(e);
  return s;
}

// ---- аргументи ----
function parseArgs(argv) {
  const o = { target: null, dryRun: false, yes: false, force: false, agents: true, skills: true, dashboard: true, hooks: true,
    service: false, shortcut: false, port: null, uninstall: false, update: false, list: false, help: false, version: false, purge: false, noOpen: false, lang: null, errors: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--target': o.target = argv[++i]; if (!o.target) o.errors.push('--target потребує шлях'); break;
      case '--dry-run': o.dryRun = true; break;
      case '--yes': case '-y': o.yes = true; break;
      case '--force': o.force = true; break;
      case '--no-agents': o.agents = false; break;
      case '--no-skills': o.skills = false; break;
      case '--no-dashboard': o.dashboard = false; break;
      case '--no-hooks': o.hooks = false; break;
      case '--service': o.service = true; break;
      case '--shortcut': o.shortcut = true; break;
      case '--port': { const n = Number(argv[++i]); if (!Number.isInteger(n) || n < 1024 || n > 65535) o.errors.push('--port: ціле число 1024–65535'); else o.port = n; break; }
      case '--uninstall': o.uninstall = true; break;
      case '--update': o.update = true; break;
      case '--list': o.list = true; break;
      case '--purge': o.purge = true; break;
      case '--lang': { const v = argv[++i]; if (v === 'uk' || v === 'en') o.lang = v; else o.errors.push('--lang: uk або en'); break; }
      case '--help': case '-h': o.help = true; break;
      case '--version': case '-v': o.version = true; break;
      default: o.errors.push('Невідома опція: ' + a);
    }
  }
  return o;
}

const HELP = `claude-agent-team ${VERSION} - установник агентів, навичок і дашборду для Claude Code

Використання: node installer/install.js [опції]

  --target <тека>   куди ставити (за замовчуванням $CLAUDE_CONFIG_DIR або ~/.claude)
  --dry-run         лише показати, що буде зроблено; нічого не записувати
  --yes, -y         без запитань (у неінтерактивному режимі діє автоматично)
  --force           перезаписувати змінені користувачем файли (завжди з бекапом) і чужий statusLine
  --no-agents       не ставити агентів
  --no-skills       не ставити навички
  --no-dashboard    не ставити дашборд (хуки теж не додаються, якщо дашборду нема)
  --no-hooks        не чіпати settings.json (ні хуки, ні statusLine)
  --service         налаштувати автозапуск дашборду (systemd --user / LaunchAgent / Scheduled Task)
  --shortcut        створити ярлик «відкрити дашборд»
  --port <n>        порт дашборду (1024-65535; за замовчуванням ${DEFAULT_PORT}); для автозапуску й підсумку
  --update          оновити наявне встановлення (потрібен manifest)
  --uninstall       видалити встановлене (лише незмінені файли; наші хуки з settings.json)
  --purge           разом з --uninstall: видалити й дані дашборду (events, token, ...)
  --list            показати, що входить до набору, і стан у цільовій теці
  --lang <uk|en>    мова повідомлень (за замовчуванням за LANG/локаллю: uk* -> uk, інакше en)
  --help, -h        ця довідка
  --version, -v     версія
`;

const HELP_EN = `claude-agent-team ${VERSION} - installer for agents, skills and the dashboard for Claude Code

Usage: node installer/install.js [options]

  --target <dir>    where to install (default: $CLAUDE_CONFIG_DIR or ~/.claude)
  --dry-run         only show what would be done; write nothing
  --yes, -y         no prompts (applied automatically in non-interactive mode)
  --force           overwrite files you modified (always with a backup) and a foreign statusLine
  --no-agents       do not install agents
  --no-skills       do not install skills
  --no-dashboard    do not install the dashboard (hooks are not added either if there is no dashboard)
  --no-hooks        do not touch settings.json (neither hooks nor statusLine)
  --service         set up dashboard autostart (systemd --user / LaunchAgent / Scheduled Task)
  --shortcut        create an "open dashboard" shortcut
  --port <n>        dashboard port (1024-65535; default ${DEFAULT_PORT}); used for autostart and the summary
  --update          update an existing installation (manifest required)
  --uninstall       remove what was installed (unmodified files only; our hooks from settings.json)
  --purge           with --uninstall: also remove dashboard data (events, token, ...)
  --list            show what the kit contains and its state in the target directory
  --lang <uk|en>    message language (default from LANG/locale: uk* -> uk, otherwise en)
  --help, -h        this help
  --version, -v     version
`;

// ---------------------------------------------------------------------------------------------
// Допоміжне
// ---------------------------------------------------------------------------------------------
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const rel = p => p.split(path.sep).join('/');
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');

function walk(dir, base = dir, out = []) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return out; }
  ents.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of ents) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, base, out);
    else if (e.isFile()) out.push(rel(path.relative(base, f)));
  }
  return out;
}

const isJunk = name => /\.(bak|orig|tmp)([-.\w]*)$/i.test(name) || /^\.DS_Store$/.test(name) || /~$/.test(name);

/** Перелік файлів набору: { rel: 'agents/x.md', src: abs, group } */
function collectSources(opts) {
  const items = [];
  if (opts.agents) {
    for (const f of walk(path.join(ROOT, 'agents'))) if (f.endsWith('.md') && !isJunk(f)) items.push({ rel: 'agents/' + f, src: path.join(ROOT, 'agents', f), group: 'agents' });
  }
  if (opts.skills) {
    const sd = path.join(ROOT, 'skills');
    let names = []; try { names = fs.readdirSync(sd, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort(); } catch (_) {}
    for (const n of names) {
      if (!fs.existsSync(path.join(sd, n, 'SKILL.md'))) continue;
      for (const f of walk(path.join(sd, n))) if (!isJunk(f)) items.push({ rel: `skills/${n}/${f}`, src: path.join(sd, n, f), group: 'skills' });
    }
  }
  if (opts.dashboard) {
    const dd = path.join(ROOT, 'dashboard');
    for (const f of walk(dd)) {
      const top = f.split('/')[0];
      if (isJunk(f) || DASH_RUNTIME.includes(f) || DASH_RUNTIME_DIRS.includes(top) || top === '3d') continue;
      items.push({ rel: 'dashboard/' + f, src: path.join(dd, f), group: 'dashboard' });
    }
  }
  return items;
}

/** Вміст файла для встановлення (підстановка {{CLAUDE_DIR}} в агентах). */
function contentFor(item, target) {
  const buf = fs.readFileSync(item.src);
  if (item.group === 'agents' && buf.includes('{{CLAUDE_DIR}}')) {
    return Buffer.from(buf.toString('utf8').split('{{CLAUDE_DIR}}').join(target.split(path.sep).join('/')), 'utf8');
  }
  return buf;
}

function writeAtomic(file, data, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, data, mode ? { mode } : undefined);
    fs.renameSync(tmp, file);
  } catch (e) { try { fs.unlinkSync(tmp); } catch (_) {} throw e; }
}

function findInPath(name, platform = process.platform) {
  const exts = platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';') : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const f = path.join(dir, name + ext.toLowerCase());
      try { if (fs.statSync(f).isFile()) return f; } catch (_) {}
      const g = path.join(dir, name + ext);
      try { if (fs.statSync(g).isFile()) return g; } catch (_) {}
    }
  }
  return null;
}

function detectIndent(text) {
  const m = text.match(/^[ \t]*\{\r?\n([ \t]+)"/);
  return m ? m[1] : '  ';
}

function ask(question) {
  return new Promise(res => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question(tr(question), a => { rl.close(); res(a.trim().toLowerCase()); });
  });
}

// ---------------------------------------------------------------------------------------------
// Основна логіка
// ---------------------------------------------------------------------------------------------
async function main(argv, env = {}) {
  const platform = env.platform || process.platform;
  const IS_WIN = platform === 'win32';
  const opts = parseArgs(argv);
  LANG = opts.lang || detectLang();
  const out = s => process.stdout.write(tr(s) + '\n');
  const warn = s => process.stdout.write('  ! ' + tr(s) + '\n');
  const err = s => process.stderr.write(tr(s));

  if (opts.errors.length) { opts.errors.forEach(e => err(e + '\n')); err('Довідка: node installer/install.js --help\n'); return 2; }
  if (opts.help) { process.stdout.write(LANG === 'en' ? HELP_EN : HELP); return 0; }
  if (opts.version) { out(VERSION); return 0; }

  // --- перевірки середовища ---
  const major = +process.versions.node.split('.')[0];
  if (major < 18) { err(`Потрібен Node.js 18 або новіший (зараз ${process.versions.node}). https://nodejs.org\n`); return 1; }

  let target = opts.target || process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  if (target === '~' || target.startsWith('~/') || target.startsWith('~\\')) target = path.join(os.homedir(), target.slice(1));
  target = path.resolve(target);
  const dashDir = path.join(target, 'dashboard');
  const manifestFile = path.join(target, MANIFEST_NAME);
  const port = opts.port || DEFAULT_PORT;
  const nodePath = process.execPath;
  const dry = opts.dryRun;
  const DRY = dry ? '[dry-run] ' : '';

  let manifest = null;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch (_) {}

  out(`claude-agent-team ${VERSION}  |  ОС: ${platform} ${os.release()}  |  Node ${process.versions.node}`);
  out(`Ціль: ${target}${dry ? '  (dry-run: нічого не записується)' : ''}`);

  if (opts.list) return doList(opts, target, manifest, platform, out);
  if (opts.uninstall) return doUninstall(opts, { target, dashDir, manifest, manifestFile, platform, out, warn, err, DRY });
  if (opts.update && !manifest) { err(`Немає ${MANIFEST_NAME} у ${target}: нічого оновлювати. Виконайте звичайне встановлення.\n`); return 1; }

  // claude у PATH - лише попередження
  if (!findInPath('claude', platform)) warn('команду `claude` не знайдено у PATH. Встановіть Claude Code CLI: https://docs.anthropic.com/en/docs/claude-code (установник продовжить роботу).');
  // права запису
  try {
    let probe = target; while (!fs.existsSync(probe)) probe = path.dirname(probe);
    fs.accessSync(probe, fs.constants.W_OK);
  } catch (e) { err(`Немає прав запису в ${target}: ${e.message}\n`); return 1; }

  const interactive = !!process.stdin.isTTY && !!process.stdout.isTTY && !opts.yes && !dry;
  if (interactive) {
    const a = await ask(`Встановити агентів/навички/дашборд у ${target}? [Y/n] `);
    if (a && a !== 'y' && a !== 'т' && a !== 'так') { out('Скасовано.'); return 0; }
  }

  const backupRoot = path.join(target, BACKUP_DIR_NAME, stamp());
  const report = { installed: [], updated: [], same: [], skipped: [], forced: [], removedStale: [], backups: 0 };
  const oldFiles = (manifest && manifest.files) || {};
  const newFiles = {};

  const backup = (absFile, relName) => {
    if (dry) return;
    const dst = path.join(backupRoot, relName);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(absFile, dst);
    report.backups++;
  };

  // --- файли ---
  const items = collectSources(opts);
  for (const it of items) {
    const dest = path.join(target, it.rel);
    const data = contentFor(it, target);
    const newHash = sha(data);
    let cur = null; try { cur = fs.readFileSync(dest); } catch (_) {}
    const mode = /\.(js|sh)$/.test(it.rel) || /\/claude-(tmux|run)$/.test(it.rel) ? 0o755 : 0o644;
    const put = () => { if (!dry) { writeAtomic(dest, data, IS_WIN ? undefined : mode); if (!IS_WIN) { try { fs.chmodSync(dest, mode); } catch (_) {} } } };
    if (cur === null) { put(); report.installed.push(it.rel); newFiles[it.rel] = newHash; continue; }
    const curHash = sha(cur);
    if (curHash === newHash) { report.same.push(it.rel); newFiles[it.rel] = newHash; if (!dry && !IS_WIN) { try { fs.chmodSync(dest, mode); } catch (_) {} } continue; }
    if (oldFiles[it.rel] && oldFiles[it.rel] === curHash) { put(); report.updated.push(it.rel); newFiles[it.rel] = newHash; continue; } // наш файл без змін користувача
    // змінений користувачем (або чужий з тією ж назвою)
    let overwrite = opts.force;
    if (!overwrite && interactive) overwrite = ['y', 'т', 'так'].includes(await ask(`Файл ${it.rel} змінено. Перезаписати (бекап буде)? [y/N] `));
    if (overwrite) { backup(dest, it.rel); put(); report.forced.push(it.rel); newFiles[it.rel] = newHash; }
    else { report.skipped.push(it.rel); if (oldFiles[it.rel]) newFiles[it.rel] = oldFiles[it.rel]; /* лишаємо облік: це наш файл, змінений користувачем */ }
  }
  // файли, яких більше нема в наборі (залишок попередньої версії)
  for (const [r, h] of Object.entries(oldFiles)) {
    if (newFiles[r] !== undefined || items.some(i => i.rel === r)) continue;
    const f = path.join(target, r);
    // не чіпаємо групи, які користувач вимкнув прапорцями цього запуску
    const grp = r.split('/')[0];
    if ((grp === 'agents' && !opts.agents) || (grp === 'skills' && !opts.skills) || (grp === 'dashboard' && !opts.dashboard)) { newFiles[r] = h; continue; }
    try { if (sha(fs.readFileSync(f)) === h) { if (!dry) fs.unlinkSync(f); report.removedStale.push(r); } else newFiles[r] = h; } catch (_) {}
  }

  // --- settings.json ---
  const sres = { status: 'skipped', added: [], statusLine: null, note: null, previousStatusLine: null };
  const dashInstalled = opts.dashboard || fs.existsSync(path.join(dashDir, 'hook.js'));
  if (!opts.hooks) sres.note = 'вимкнено (--no-hooks)';
  else if (!dashInstalled) sres.note = 'дашборду нема (--no-dashboard): хуки не додаються';
  else {
    const sf = path.join(target, 'settings.json');
    let text = null, parsed = {}, bad = null;
    try { text = fs.readFileSync(sf, 'utf8'); } catch (_) {}
    if (text !== null) {
      try { parsed = JSON.parse(text.replace(/^﻿/, '')); if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) bad = 'корінь settings.json не є об\'єктом'; }
      catch (e) { bad = 'невалідний JSON: ' + e.message; }
    }
    if (bad) { sres.status = 'invalid'; sres.note = `settings.json НЕ змінено (${bad}). Виправте файл і запустіть установник ще раз.`; }
    else {
      const ap = applySettings(parsed, { dashDir, platform, force: opts.force });
      sres.added = ap.added; sres.statusLine = ap.statusLine; sres.previousStatusLine = ap.previousStatusLine;
      if (ap.error) { sres.status = 'invalid'; sres.note = 'settings.json НЕ змінено: ' + ap.error; }
      else if (ap.added.length === 0 && (ap.statusLine === 'present' || ap.statusLine === 'foreign')) sres.status = 'unchanged';
      else {
        sres.status = 'changed';
        if (!dry) {
          if (text !== null) backup(sf, 'settings.json');
          const indent = text !== null ? detectIndent(text) : '  ';
          const nl = text === null || /\n\s*$/.test(text) ? '\n' : '';
          writeAtomic(sf, JSON.stringify(ap.settings, null, indent) + nl);
        }
      }
    }
  }

  // --- автозапуск / ярлики ---
  let serviceInfo = (manifest && manifest.service) || null;
  let shortcuts = (manifest && manifest.shortcuts) || [];
  const svcLog = [];
  if (opts.service && opts.dashboard !== false) {
    const r = setupService({ platform, nodePath, dashDir, port, dry, log: svcLog });
    if (r) serviceInfo = r;
  } else if (opts.service) svcLog.push('автозапуск пропущено: дашборд не встановлюється (--no-dashboard)');
  if (opts.shortcut && opts.dashboard !== false) {
    const r = setupShortcut({ platform, nodePath, dashDir, dry, log: svcLog });
    if (r) shortcuts = Array.from(new Set(shortcuts.concat(r)));
  }

  // --- manifest ---
  if (!dry) {
    const hooksRec = (sres.status === 'changed' || sres.status === 'unchanged') ? mergeHookRecords(manifest && manifest.hooks, sres.added) : ((manifest && manifest.hooks) || []);
    const slRec = sres.statusLine === 'added' || sres.statusLine === 'replaced' ? { added: true, replaced: sres.previousStatusLine || null } : ((manifest && manifest.statusLine) || null);
    const m = {
      name: 'claude-agent-team', version: VERSION, installedAt: (manifest && manifest.installedAt) || new Date().toISOString(), updatedAt: new Date().toISOString(),
      target, platform, port, files: newFiles, hooks: hooksRec, statusLine: slRec, service: serviceInfo, shortcuts,
    };
    writeAtomic(manifestFile, JSON.stringify(m, null, 2) + '\n');
  }

  // --- підсумок ---
  const L = (title, arr) => { if (arr.length) { out(`  ${title}: ${arr.length}`); } };
  out('\nПідсумок' + (dry ? ' (dry-run)' : '') + ':');
  L(DRY + 'встановлено нових файлів', report.installed);
  L(DRY + 'оновлено (без ваших змін)', report.updated);
  L(DRY + 'без змін (однакові)', report.same);
  L(DRY + 'перезаписано з --force/підтвердженням (з бекапом)', report.forced);
  L(DRY + 'видалено застарілих файлів набору', report.removedStale);
  if (report.skipped.length) {
    out(`  ПРОПУЩЕНО (змінено вами): ${report.skipped.length}`);
    report.skipped.forEach(f => out('     - ' + f));
    out('    Щоб оновити їх до версії набору: повторіть з --force (бекап буде створено).');
  }
  out(`  settings.json: ${({ changed: dry ? 'буде змінено' : 'змінено (бекап створено)', unchanged: 'без змін', invalid: 'НЕ змінено', skipped: 'не чіпали' })[sres.status]}`);
  if (sres.note) warn(sres.note);
  if (sres.added.length) { out(`    додано хуків: ${sres.added.length}`); sres.added.forEach(a => out(`      ${a.event}: ${a.kind === 'hook' ? 'hook.js (async)' : 'deliver.js'}`)); }
  if (sres.statusLine === 'added') out('    statusLine: додано');
  else if (sres.statusLine === 'present') out('    statusLine: уже налаштовано');
  else if (sres.statusLine === 'replaced') out('    statusLine: замінено (попередній збережено в manifest і бекапі)');
  else if (sres.statusLine === 'foreign') {
    warn('У settings.json уже є ВАШ statusLine - не перезаписано. Щоб дашборд бачив ліміти, підключіть вручну:');
    out(`        "statusLine": { "type": "command", "command": ${JSON.stringify(hookCommand(path.join(dashDir, 'statusline.js'), platform))}, "refreshInterval": 30 }`);
    out('        (або повторіть установку з --force: старий statusLine буде збережено в бекапі)');
  }
  svcLog.forEach(s => out('  ' + s));
  if (report.backups) out(`  Бекапи: ${backupRoot}`);
  if (dry) { out('\nDry-run завершено: файли не змінено.'); return 0; }

  out('\nГотово. Далі:');
  if (opts.dashboard) {
    out(`  1) Дашборд:      node "${path.join(dashDir, 'start.js')}"${port !== DEFAULT_PORT ? ' --port ' + port : ''}    ->  http://127.0.0.1:${port}`);
    if (!serviceInfo) out('     (автозапуск при вході: повторіть установку з --service)');
  }
  if (opts.agents) out('  2) Оркестратор:  claude --agent orchestrator');
  out(`  3) Вимкнути:     node "${path.join(ROOT, 'installer', 'install.js')}" --uninstall${opts.target ? ' --target "' + target + '"' : ''}`);
  out('  Опційно: керування з телефона через Telegram - docs/TELEGRAM.md (установник Telegram не налаштовує).');
  out('  Документація: docs/INSTALL.md, docs/TROUBLESHOOTING.md');
  return sres.status === 'invalid' ? 3 : 0;
}

function mergeHookRecords(old, added) {
  const rec = Array.isArray(old) ? old.slice() : [];
  for (const a of added) if (!rec.some(r => r.event === a.event && r.kind === a.kind)) rec.push({ event: a.event, kind: a.kind, command: a.command });
  return rec;
}

// ---- автозапуск (виконання) ----
function run(cmd, args, log) {
  const r = cp.spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true });
  const ok = !r.error && r.status === 0;
  if (!ok && log) log.push(`   (${cmd} ${args.join(' ')} -> ${r.error ? r.error.message : 'код ' + r.status}${r.stderr ? ': ' + String(r.stderr).trim().slice(0, 160) : ''})`);
  return ok;
}

function setupService({ platform, nodePath, dashDir, port, dry, log }) {
  const home = os.homedir();
  const ctx = { nodePath, dashDir, port };
  const D = dry ? '[dry-run] ' : '';
  if (platform === 'linux') {
    const cfg = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
    const hasSystemd = !dry ? (run('systemctl', ['--user', 'show-environment'], null)) : !!findInPath('systemctl');
    if (hasSystemd) {
      const unit = path.join(cfg, 'systemd', 'user', SERVICE_NAME + '.service');
      log.push(`${D}автозапуск: systemd --user unit ${unit}`);
      if (!dry) {
        writeAtomic(unit, buildSystemdUnit(ctx));
        run('systemctl', ['--user', 'daemon-reload'], log);
        if (!run('systemctl', ['--user', 'enable', '--now', SERVICE_NAME + '.service'], log)) log.push('   ! не вдалось увімкнути unit; перегляньте: systemctl --user status ' + SERVICE_NAME);
      }
      return { kind: 'systemd', files: [unit], name: SERVICE_NAME + '.service' };
    }
    const desk = path.join(cfg, 'autostart', SERVICE_NAME + '.desktop');
    log.push(`${D}автозапуск: systemd --user недоступний, XDG autostart ${desk} (діятиме з наступного входу)`);
    if (!dry) writeAtomic(desk, buildXdgAutostart(ctx));
    return { kind: 'xdg-autostart', files: [desk] };
  }
  if (platform === 'darwin') {
    const plist = path.join(home, 'Library', 'LaunchAgents', LAUNCHD_LABEL + '.plist');
    log.push(`${D}автозапуск: LaunchAgent ${plist}`);
    if (!dry) {
      writeAtomic(plist, buildLaunchdPlist(ctx));
      const uid = typeof process.getuid === 'function' ? process.getuid() : 501;
      run('launchctl', ['bootout', `gui/${uid}/${LAUNCHD_LABEL}`], null); // ігноруємо, якщо ще не завантажено
      if (!run('launchctl', ['bootstrap', `gui/${uid}`, plist], log)) log.push('   ! launchctl bootstrap не вдався; спробуйте вийти/увійти або: launchctl bootstrap gui/$(id -u) ' + plist);
    }
    return { kind: 'launchd', files: [plist], label: LAUNCHD_LABEL };
  }
  if (platform === 'win32') {
    const vbs = path.join(dashDir, 'start-hidden.vbs');
    log.push(`${D}автозапуск: Scheduled Task "${TASK_NAME}" (при вході) -> ${vbs}`);
    if (!dry) {
      writeAtomic(vbs, buildWinVbs(ctx));
      const ok = run('schtasks', buildSchtasksCreateArgs({ vbsPath: vbs }), log);
      if (ok) { run('schtasks', ['/Run', '/TN', TASK_NAME], log); return { kind: 'schtasks', name: TASK_NAME, files: [vbs] }; }
      const startup = path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'AgentsDashboard.vbs');
      log.push('   schtasks не вдався; запасний варіант: файл у теці Startup ' + startup);
      writeAtomic(startup, buildWinVbs(ctx));
      return { kind: 'startup-folder', files: [vbs, startup] };
    }
    return { kind: 'schtasks', name: TASK_NAME, files: [vbs] };
  }
  log.push('автозапуск: непідтримувана ОС ' + platform);
  return null;
}

function setupShortcut({ platform, nodePath, dashDir, dry, log }) {
  const home = os.homedir(), D = dry ? '[dry-run] ' : '';
  try {
    if (platform === 'linux') {
      const f = path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'applications', 'agents-dashboard.desktop');
      log.push(`${D}ярлик: ${f}`); if (!dry) writeAtomic(f, buildDesktopEntry({ nodePath, dashDir }), 0o755); return [f];
    }
    if (platform === 'darwin') {
      const f = path.join(home, 'Applications', 'Agents Dashboard.command');
      log.push(`${D}ярлик: ${f}`); if (!dry) { writeAtomic(f, buildMacCommand({ nodePath, dashDir }), 0o755); fs.chmodSync(f, 0o755); } return [f];
    }
    if (platform === 'win32') {
      const f = path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Agents Dashboard.lnk');
      log.push(`${D}ярлик: ${f}`);
      if (!dry) { fs.mkdirSync(path.dirname(f), { recursive: true }); run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', buildPsShortcutScript({ lnkPath: f, dashDir })], log); }
      return [f];
    }
  } catch (e) { log.push('ярлик не створено: ' + e.message); }
  return null;
}

function removeService(m, { platform, dry, log }) {
  const s = m && m.service; if (!s) return;
  const D = dry ? '[dry-run] ' : '';
  log.push(`${D}автозапуск (${s.kind}): зупинка й видалення`);
  if (dry) return;
  if (s.kind === 'systemd') { run('systemctl', ['--user', 'disable', '--now', s.name], null); }
  if (s.kind === 'launchd') { const uid = typeof process.getuid === 'function' ? process.getuid() : 501; run('launchctl', ['bootout', `gui/${uid}/${s.label}`], null); }
  if (s.kind === 'schtasks' || s.kind === 'startup-folder') { run('schtasks', ['/End', '/TN', TASK_NAME], null); run('schtasks', ['/Delete', '/TN', TASK_NAME, '/F'], null); }
  for (const f of s.files || []) { try { fs.unlinkSync(f); } catch (_) {} }
  if (s.kind === 'systemd') run('systemctl', ['--user', 'daemon-reload'], null);
}

// ---- --list ----
function doList(opts, target, manifest, platform, out) {
  const items = collectSources({ agents: true, skills: true, dashboard: true });
  const old = (manifest && manifest.files) || {};
  const groups = {};
  for (const it of items) {
    const dest = path.join(target, it.rel);
    let st = 'нема';
    try { const h = sha(fs.readFileSync(dest)); st = h === sha(contentFor(it, target)) ? 'актуальний' : (old[it.rel] === h ? 'застарілий' : 'змінено вами'); } catch (_) {}
    (groups[it.group] = groups[it.group] || []).push([it.rel, st]);
  }
  out(manifest ? `Встановлено: версія ${manifest.version} (${manifest.updatedAt})` : 'Manifest не знайдено: набір не встановлено в цю теку.');
  for (const g of Object.keys(groups)) {
    out(`\n${g}: ${groups[g].length} файлів`);
    if (g === 'dashboard') groups[g].forEach(([r, s]) => out(`  ${r}  [${s}]`));
    else {
      const names = {};
      groups[g].forEach(([r, s]) => { const k = r.split('/').slice(0, g === 'skills' ? 2 : 2).join('/'); (names[k] = names[k] || []).push(s); });
      for (const [k, ss] of Object.entries(names)) out(`  ${k}${g === 'skills' ? '/' : ''}  [${ss.every(x => x === 'актуальний') ? 'актуальний' : ss.every(x => x === 'нема') ? 'нема' : 'частково/змінено'}]`);
    }
  }
  return 0;
}

// ---- --uninstall ----
async function doUninstall(opts, { target, dashDir, manifest, manifestFile, platform, out, warn, err, DRY }) {
  const dry = opts.dryRun;
  if (!manifest) { err(`Немає ${MANIFEST_NAME} у ${target}: нічого видаляти (установник видаляє лише те, що сам встановив).\n`); return 1; }
  if (!opts.yes && !dry && process.stdin.isTTY && process.stdout.isTTY) {
    const a = await ask(`Видалити встановлене з ${target}? [y/N] `); if (!['y', 'т', 'так'].includes(a)) { out('Скасовано.'); return 0; }
  }
  const removed = [], kept = [];
  for (const [r, h] of Object.entries(manifest.files || {})) {
    const f = path.join(target, r);
    let cur; try { cur = fs.readFileSync(f); } catch (_) { continue; }
    if (sha(cur) === h) { if (!dry) fs.unlinkSync(f); removed.push(r); } else kept.push(r);
  }
  // settings.json
  const sf = path.join(target, 'settings.json');
  let settingsNote = 'без змін';
  const backupRoot = path.join(target, BACKUP_DIR_NAME, stamp());
  try {
    const text = fs.readFileSync(sf, 'utf8');
    let parsed = null; try { parsed = JSON.parse(text.replace(/^﻿/, '')); } catch (_) {}
    if (!parsed || typeof parsed !== 'object') settingsNote = 'settings.json невалідний - НЕ змінено; приберіть наші хуки вручну (docs/INSTALL.md)';
    else {
      const prev = manifest.statusLine && manifest.statusLine.replaced || null;
      const r = unapplySettings(parsed, { dashDir, platform, previousStatusLine: prev });
      if (r.removed > 0 || r.statusLine === 'removed' || r.statusLine === 'restored') {
        if (!dry) {
          fs.mkdirSync(backupRoot, { recursive: true }); fs.copyFileSync(sf, path.join(backupRoot, 'settings.json'));
          writeAtomic(sf, JSON.stringify(r.settings, null, detectIndent(text)) + (/\n\s*$/.test(text) ? '\n' : ''));
        }
        settingsNote = `${DRY}прибрано хуків: ${r.removed}; statusLine: ${r.statusLine || 'не наш'}` + (dry ? '' : `; бекап: ${backupRoot}`);
      }
    }
  } catch (_) { settingsNote = 'settings.json не знайдено'; }
  // сервіс і ярлики
  const log = [];
  removeService(manifest, { platform, dry, log });
  for (const f of manifest.shortcuts || []) { log.push(`${DRY}ярлик: ${f}`); if (!dry) { try { fs.unlinkSync(f); } catch (_) {} } }
  // дані дашборду
  if (opts.purge && !dry) {
    for (const f of DASH_RUNTIME) { try { fs.unlinkSync(path.join(dashDir, f)); } catch (_) {} }
    for (const d of DASH_RUNTIME_DIRS) { try { fs.rmSync(path.join(dashDir, d), { recursive: true, force: true }); } catch (_) {} }
  }
  // порожні теки
  if (!dry) {
    const dirs = new Set(); removed.forEach(r => { let d = path.dirname(path.join(target, r)); while (d.length > target.length) { dirs.add(d); d = path.dirname(d); } });
    Array.from(dirs).sort((a, b) => b.length - a.length).forEach(d => { try { fs.rmdirSync(d); } catch (_) {} });
    if (kept.length === 0) { try { fs.unlinkSync(manifestFile); } catch (_) {} }
    else { const m = { ...manifest, files: Object.fromEntries(kept.map(k => [k, manifest.files[k]])), hooks: [], service: null, shortcuts: [] }; writeAtomic(manifestFile, JSON.stringify(m, null, 2) + '\n'); }
  }
  out(`\nПідсумок видалення${dry ? ' (dry-run)' : ''}:`);
  out(`  ${DRY}видалено файлів: ${removed.length}`);
  if (kept.length) { out(`  ЛИШЕНО (змінені вами): ${kept.length}`); kept.forEach(k => out('     - ' + k)); }
  out(`  settings.json: ${settingsNote}`);
  log.forEach(l => out('  ' + l));
  const leftData = DASH_RUNTIME.filter(f => fs.existsSync(path.join(dashDir, f)));
  if (!opts.purge && leftData.length) out(`  Дані дашборду залишено (${dashDir}); видалити: --uninstall --purge`);
  return 0;
}

module.exports = {
  main, parseArgs, applySettings, unapplySettings, hookCommand, quoteForCommand, commandRefersTo, HOOK_SPEC,
  buildSystemdUnit, buildXdgAutostart, buildLaunchdPlist, buildWinVbs, buildSchtasksCreateArgs, buildDesktopEntry, buildMacCommand, buildPsShortcutScript,
  VERSION, TASK_NAME, LAUNCHD_LABEL,
};

if (require.main === module) {
  process.stdout.on('error', () => {});
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, e => { process.stderr.write(tr('Помилка установника: ') + (e && e.stack || e) + '\n'); process.exitCode = 1; });
}
