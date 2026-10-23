[🇺🇦 Українська](../INSTALL.md) | **🇬🇧 English**

# Installation

This page covers: prerequisites for each OS, step-by-step installation, all options, the exact list of changes to `settings.json`, backups, verification, common errors, and manual installation without the installer.

Repository: <https://github.com/kravza3026/claude-agent-team>. Notation: `<CLAUDE_DIR>` is the Claude Code configuration directory: `~/.claude` (Linux/macOS), `%USERPROFILE%\.claude` (Windows) or the value of `$CLAUDE_CONFIG_DIR`.

<!-- BEGIN:counts -->
**Agents: 12, skills: 23.**
<!-- END:counts -->

## 0. What gets installed

| Where | What |
|---|---|
| `<CLAUDE_DIR>/agents/` | agents (`*.md`) |
| `<CLAUDE_DIR>/skills/<name>/` | skills (`SKILL.md` + extra files) |
| `<CLAUDE_DIR>/dashboard/` | dashboard code (data and token are created on first run) |
| `<CLAUDE_DIR>/settings.json` | **only** our hooks and `statusLine` (see section 4) |
| `<CLAUDE_DIR>/agent-team-manifest.json` | install record (version, file hashes, added hooks) |
| `<CLAUDE_DIR>/backups-agent-team/<time>/` | backups taken before changes |

## 1. Linux (Ubuntu/Debian/Fedora/Arch...)

1. **Node.js 18+.** Check with `node -v`. If missing: [nodejs.org/en/download](https://nodejs.org/en/download), your distribution's package manager, or [nvm](https://github.com/nvm-sh/nvm).
2. **Claude Code CLI** and signing in: [CLAUDE_SETUP.md](CLAUDE_SETUP.md) (and the [official documentation](https://docs.anthropic.com/en/docs/claude-code) if needed). Check with `claude --version`.
3. **git:** `git --version`.
4. Clone and install:
   ```sh
   git clone https://github.com/kravza3026/claude-agent-team.git claude-agent-team && cd claude-agent-team
   ./install.sh --dry-run     # preview
   ./install.sh               # install (asks for confirmation; --yes skips prompts)
   ```
   If the file is not executable: `sh install.sh` or `node installer/install.js`.
5. Dashboard: `node ~/.claude/dashboard/start.js` → http://127.0.0.1:7777.
6. Autostart at login (optional): `./install.sh --service`. This creates `~/.config/systemd/user/agents-dashboard.service` and enables it with `systemctl --user enable --now agents-dashboard.service`. Control: `systemctl --user status|restart|stop agents-dashboard`, logs: `journalctl --user -u agents-dashboard`. If `systemd --user` is unavailable (container, WSL without systemd), `~/.config/autostart/agents-dashboard.desktop` is created instead (takes effect at your next graphical login).
7. Application-menu shortcut: `--shortcut` (`~/.local/share/applications/agents-dashboard.desktop`).
8. "Type commands into the terminal" mode (optional): install `tmux` and start `~/.claude/dashboard/claude-tmux --agent orchestrator` instead of `claude ...`.

## 2. macOS

1. **Node.js 18+:** `brew install node` or the installer from [nodejs.org](https://nodejs.org). Check with `node -v`.
2. **Claude Code CLI** and signing in: [CLAUDE_SETUP.md](CLAUDE_SETUP.md) ([official documentation](https://docs.anthropic.com/en/docs/claude-code)).
3. Clone and install as on Linux (`./install.sh`). If the system complains about an "unidentified developer" (Gatekeeper/quarantine) for files downloaded as an archive: run `xattr -dr com.apple.quarantine .` in the repository directory, or run `node installer/install.js` directly. With `git clone` there is usually no quarantine attribute.
4. Autostart: `./install.sh --service` creates the LaunchAgent `~/Library/LaunchAgents/com.claude-agent-team.dashboard.plist` and runs `launchctl bootstrap gui/<uid> <plist>`. Status: `launchctl print gui/$(id -u)/com.claude-agent-team.dashboard`; manual stop: `launchctl bootout gui/$(id -u)/com.claude-agent-team.dashboard`. Logs: `~/.claude/dashboard/server.log`.
5. Shortcut: `--shortcut` → `~/Applications/Agents Dashboard.command` (double-click).
6. Notifications use `osascript`; on first use macOS may ask for permission in "System Settings → Notifications".
7. tmux: `brew install tmux`, then use `claude-tmux` as on Linux.

## 3. Windows 10/11

1. **Node.js 18+:** [nodejs.org](https://nodejs.org) or `winget install OpenJS.NodeJS.LTS`. Close and reopen PowerShell; `node -v`.
2. **Claude Code CLI** and signing in: [CLAUDE_SETUP.md](CLAUDE_SETUP.md) ([official documentation](https://docs.anthropic.com/en/docs/claude-code); it describes shell requirements for Windows).
3. **git**: [git-scm.com](https://git-scm.com/download/win).
4. Clone and install (PowerShell 5.1+):
   ```powershell
   git clone https://github.com/kravza3026/claude-agent-team.git claude-agent-team; cd claude-agent-team
   .\install.ps1 --dry-run
   .\install.ps1
   ```
   **ExecutionPolicy.** If you see "running scripts is disabled on this system", choose one of:
   - one-off, without changing the system: `powershell -ExecutionPolicy Bypass -File .\install.ps1`;
   - for the current window: `Set-ExecutionPolicy -Scope Process Bypass`, then `.\install.ps1`;
   - without PowerShell: double-click `install.cmd` (or `install.cmd --dry-run` in `cmd`);
   - or directly: `node installer\install.js`.
   Scripts downloaded as an archive from a browser may carry the "Mark of the Web": `Unblock-File .\install.ps1`.
5. Dashboard: `node "$env:USERPROFILE\.claude\dashboard\start.js"` (or `start.cmd` / `start.ps1` in that directory) → http://127.0.0.1:7777.
6. Autostart: `.\install.ps1 --service` creates a Scheduled Task `ClaudeAgentTeamDashboard` (at logon of the current user, no administrator rights, hidden start through `wscript.exe` + `dashboard\start-hidden.vbs`). If `schtasks` fails, a copy of the launcher is placed in the Startup folder. Check: `schtasks /Query /TN ClaudeAgentTeamDashboard`.
7. Shortcut: `--shortcut` → `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Agents Dashboard.lnk`.
8. **Paths and quoting in hooks.** A hook is written as `node "C:\Users\Name\.claude\dashboard\hook.js"` (in JSON, with doubled backslashes). If the path contains spaces or non-ASCII characters, the quotes are mandatory; the installer adds them itself.
9. Limitations: tmux mode is unavailable (dashboard commands go through the queue via the `deliver.js` hooks); `claude-tmux`/`claude-run` are not used.

## 4. What changes in `settings.json`

The installer reads `<CLAUDE_DIR>/settings.json` as JSON, makes a backup, adds **only** what is listed below and writes the file atomically (temporary file + rename). If the file does not exist, a minimal one is created. If the JSON is invalid, the file is **not touched**: the installer reports this and exits with code 3 (agent and skill files are still installed).

**Hooks** (each is a separate entry `{ "hooks": [ { "type": "command", ... } ] }`; `node <absolute path>/dashboard/...`):

| Event | Script | Mode |
|---|---|---|
| SubagentStart | `hook.js` | async |
| SubagentStop | `hook.js` | async |
| PreToolUse | `hook.js` | async |
| PreToolUse | `deliver.js` | synchronous |
| PostToolUse | `hook.js` | async |
| UserPromptSubmit | `hook.js` | async |
| UserPromptSubmit | `deliver.js` | synchronous |
| Stop | `deliver.js` | synchronous |
| Stop | `hook.js` | async |
| SessionStart | `hook.js` | async |
| Notification | `hook.js` | async |
| PermissionRequest | `hook.js` | async |

All with `"timeout": 5`. 12 entries in 9 events in total.

**statusLine:** `{ "type": "command", "command": "node <path>/dashboard/statusline.js", "refreshInterval": 30 }`, set **only if no statusLine exists**. If you already have your own, it is not overwritten; the installer prints the line for manual setup (or overwrite it with `--force`: the old one is kept in the backup and restored on uninstall).

**Never changed:** `permissions` (`allow`/`deny`), `env`, `model`, `language`, `autoMode`, `enabledPlugins`, any other keys and your own hooks. No duplicates are created: our hooks are recognized by the path to `dashboard/hook.js|deliver.js|statusline.js`.

The file format (indentation, key order) is preserved. Backup: `<CLAUDE_DIR>/backups-agent-team/<time>/settings.json`.

## 5. Installer options

`node installer/install.js [options]` (the wrappers `install.sh`/`install.ps1`/`install.cmd` pass arguments through unchanged).

| Option | Effect |
|---|---|
| `--target <dir>` | target directory (default `$CLAUDE_CONFIG_DIR` or `~/.claude`) |
| `--dry-run` | show the actions without writing anything |
| `--yes`, `-y` | no prompts (applied automatically in non-interactive mode, e.g. CI) |
| `--force` | overwrite files you modified (always with a backup) and a foreign `statusLine` |
| `--no-agents` / `--no-skills` / `--no-dashboard` | do not install that part |
| `--no-hooks` | do not touch `settings.json` |
| `--service` | dashboard autostart |
| `--shortcut` | "open dashboard" shortcut |
| `--port <n>` | dashboard port 1024-65535 (default 7777; variable `AGENTS_DASHBOARD_PORT`) |
| `--update` | update an existing installation (manifest required) |
| `--uninstall` [`--purge`] | remove what was installed; `--purge` also removes dashboard data |
| `--list` | what the kit contains and its state in the target |
| `--lang uk\|en` | installer message language (default from `LANG`/locale: `uk*` → Ukrainian, otherwise English) |
| `--help`, `--version` | help, version |

Exit codes: `0` success; `1` environment error (Node < 18, no permissions, no manifest); `2` invalid arguments; `3` `settings.json` invalid/unusual and left unchanged.

Behavior:

- **Idempotency.** Rerunning skips identical files; `settings.json` is not changed and no duplicates appear.
- **Files you modified** (agents/skills/dashboard code) are skipped with a warning unless `--force` is given; in interactive mode the installer asks. A backup is made before overwriting.
- **Updates without your changes** (the file equals the previously installed version) happen automatically, and obsolete kit files are removed.
- **Path substitution:** in `agents/orchestrator.md` the text `{{CLAUDE_DIR}}` is replaced with the real installation directory (for calling `log.js`).
- Startup checks: Node version, presence of `claude` in PATH (warning only), write permission, OS.

## 6. Verifying success

```sh
node installer/install.js --list                 # everything "up to date"
node ~/.claude/dashboard/start.js --no-open      # prints the dashboard URL (http://127.0.0.1:7777)
curl -s http://127.0.0.1:7777/agents | head -c 200   # agents JSON (Windows: open the URL in a browser)
claude --agent orchestrator                      # inside your project
```
`settings.json` should contain 12 hooks with your path to `dashboard`. After the first action in Claude Code, events appear in the dashboard. If not, see `TROUBLESHOOTING.md`.

## 7. Backups and rollback

All backups are in `<CLAUDE_DIR>/backups-agent-team/<YYYYMMDD-HHMMSS>/` with relative paths preserved (`settings.json`, `agents/...`). Rollback: copy the file back. Full removal: section 8.

## 8. Uninstalling

```sh
node installer/install.js --uninstall [--purge] [--target <dir>]
```
Removes only files whose hash matches the manifest (modified ones are kept and listed), removes our hooks/`statusLine` from `settings.json` (with a backup; restores your previous `statusLine` if you used `--force`), and stops and removes autostart and shortcuts. Dashboard data (events, token) stays unless `--purge` is given. Stop a running dashboard process separately (see TROUBLESHOOTING).

## 9. Common errors

| Message | Cause / fix |
|---|---|
| `Node.js 18 or newer is required` | update Node (`node -v`) |
| `Node.js not found` (wrapper) | install Node, open a new terminal |
| `settings.json NOT modified (invalid JSON...)` | fix the file (e.g. a comma/quote), rerun the install |
| `SKIPPED (modified by you)` | you edited the file; `--force` overwrites it after a backup |
| `settings.json already has YOUR statusLine` | add our line manually (the installer prints it) or use `--force` |
| `No write permission` | choose another `--target` or fix permissions |
| `Missing agent-team-manifest.json` | nothing was installed in the target by this installer |

## 10. Manual installation (without the installer)

1. Copy the directories:
   ```sh
   mkdir -p ~/.claude/agents ~/.claude/skills ~/.claude/dashboard
   cp agents/*.md ~/.claude/agents/
   cp -r skills/* ~/.claude/skills/
   cp -r dashboard/* ~/.claude/dashboard/
   ```
   (Windows PowerShell: `Copy-Item agents\*.md $env:USERPROFILE\.claude\agents\`, `Copy-Item -Recurse skills\* ...`, `Copy-Item -Recurse dashboard\* ...`.)
2. In `~/.claude/agents/orchestrator.md` replace `{{CLAUDE_DIR}}` with the absolute path of the directory (with forward slashes), e.g. `sed -i "s#{{CLAUDE_DIR}}#$HOME/.claude#g" ~/.claude/agents/orchestrator.md`.
3. Back up `settings.json` (`cp ~/.claude/settings.json ~/.claude/settings.json.bak`) and add the `hooks` block and `statusLine` by hand following the table in section 4, for example for one event:
   ```json
   "hooks": {
     "SubagentStart": [ { "hooks": [ { "type": "command", "command": "node /home/USER/.claude/dashboard/hook.js", "async": true, "timeout": 5 } ] } ]
   }
   ```
   If you already have a `hooks` section, append entries to the existing event arrays instead of replacing them. On Windows the path goes in quotes: `"node \"C:\\Users\\USER\\.claude\\dashboard\\hook.js\""`.
4. Add `statusLine` (only if you do not have one yet) as described in section 4.
5. On Linux/macOS: `chmod +x ~/.claude/dashboard/*.js ~/.claude/dashboard/claude-tmux ~/.claude/dashboard/claude-run`.
6. Start `node ~/.claude/dashboard/start.js`.

`agent-team-manifest.json` is not created by a manual install, so `--uninstall` will not remove anything afterwards: clean up by hand.

## 11. Optional: Telegram

You can control the orchestrator from your phone through the official Claude Code plugin. The installer does **not** configure Telegram and does not install the plugin. Step-by-step guide: [TELEGRAM.md](TELEGRAM.md).
