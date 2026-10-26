[🇺🇦 Українська](../TROUBLESHOOTING.md) | **🇬🇧 English**

# Troubleshooting

## Node not found / old version
- Error in the `install.sh`/`install.ps1`/`install.cmd` wrapper or `Node.js 18 or newer is required`. `node -v` must show 18 or higher.
- You installed Node but the command is not found: open a **new** terminal (PATH is refreshed). Windows: `where node`; Linux/macOS: `command -v node`. If Node comes from nvm, it is available only in shells where nvm is loaded; Claude Code hooks call `node` from the PATH of the environment that started `claude`.
- Hooks cannot see Node (different PATH than in your shell): write the absolute path to `node`/`node.exe` into the hooks by hand (`"command": "/path/to/node /path/to/dashboard/hook.js"`).

## Port in use
- Message "Port N is in use" (printed by the dashboard in Ukrainian). Use another port: `node ~/.claude/dashboard/start.js --port 17777` or the variable `AGENTS_DASHBOARD_PORT=17777`. For autostart: reinstall with `--service --port 17777`.
- Who holds it: Linux/macOS `lsof -i :7777`; Windows `netstat -ano | findstr :7777`.
- "Already running: ..." means the dashboard is already running on this port.

## Hooks do not fire / no events
1. Does `settings.json` contain the hooks? `node installer/install.js --list`, then look at the file: every event should have an entry with a path to `dashboard/hook.js`.
2. Restart the `claude` session: hook settings are read at startup.
3. Does the path in the hook exist? Run it by hand: `echo '{"hook_event_name":"SessionStart","session_id":"abcdef12"}' | node ~/.claude/dashboard/hook.js`, then check that a line appeared in `dashboard/events.jsonl`. (Windows PowerShell: `'{"hook_event_name":"SessionStart","session_id":"abcdef12"}' | node "$env:USERPROFILE\.claude\dashboard\hook.js"`.)
4. Is the dashboard running? http://127.0.0.1:7777 must respond. The hook writes events regardless of the server, but the page sees them only while the server runs.
5. Did the install go to another directory (`--target`/`CLAUDE_CONFIG_DIR`)? Claude Code reads the `settings.json` that matches its own `CLAUDE_CONFIG_DIR`.
6. `settings.json` is invalid → the installer did not touch it; fix it and rerun.

## The dashboard is empty although hooks work
- Look at `dashboard/events.jsonl` (are there lines?) and `dashboard/server.log`. The page refreshes itself; press Ctrl+F5.
- Limits are not shown: `statusLine` is not connected (a foreign statusLine is not overwritten: add ours manually following the installer's hint) or the session has not refreshed its status yet.
- Tokens/costs: the server reads `<CLAUDE_DIR>/projects/**/*.jsonl`; the first count takes some time after the first start.

## tmux mode
- Works only on Linux/macOS and only when the session was started through `claude-tmux`. Check `tmux -V`; the dashboard should show "tmux: N" at the top.
- A command went to the "queue" instead of the terminal: the session is busy, waiting for permission, or a dialog is open in the terminal. This is the safe behavior; the queue is delivered by the hook.
- Windows: there is no tmux mode; use the queue.
- Model selection for the current session also needs tmux; the default model and agent models can be changed without it.

## Windows: paths and quoting
- A hook looks like `node "C:\Users\Name\.claude\dashboard\hook.js"`; in JSON the backslashes are doubled. Do not use single quotes.
- `running scripts is disabled` → see INSTALL.md, section 3 (ExecutionPolicy). Garbled characters in `cmd` → `chcp 65001`.
- Autostart does not start: `schtasks /Query /TN ClaudeAgentTeamDashboard /V`; run manually with `schtasks /Run /TN ClaudeAgentTeamDashboard`; the fallback is a file in the Startup folder (`shell:startup`).
- An antivirus blocks `wscript.exe`/the VBS launcher → run `start.cmd` by hand or do not use `--service`.

## macOS
- Notifications do not appear: allow them for "Script Editor" (osascript) in Notifications settings.
- The LaunchAgent did not load: `launchctl print gui/$(id -u)/com.claude-agent-team.dashboard`; log: `dashboard/server.log`. Reload: `launchctl bootout gui/$(id -u)/com.claude-agent-team.dashboard`, then `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claude-agent-team.dashboard.plist`.

## Linux
- `systemctl --user status agents-dashboard`, `journalctl --user -u agents-dashboard`. Without an active user session (SSH, container) enable `loginctl enable-linger $USER` or start the dashboard manually.
- No notifications: install `libnotify-bin` (`notify-send`).

## Telegram
A separate document: [TELEGRAM.md](TELEGRAM.md), section 9.

## Claude Code (`claude`) does not work
Installation, sign-in, `claude: command not found`, updates: [CLAUDE_SETUP.md](CLAUDE_SETUP.md), section 7.

## MCP (Figma, Playwright)
Server not connected, authentication needed, browser not installed: [MCP_SETUP.md](MCP_SETUP.md), section 6.

## Rollback and backups
- Backups: `<CLAUDE_DIR>/backups-agent-team/<time>/` (`settings.json`, modified agent/skill files). To restore, copy the file back.
- Remove the hooks completely: `node installer/install.js --uninstall` (or manually delete our entries from `hooks` and `statusLine` in `settings.json`).
- If `settings.json` is damaged, restore the newest backup; the dashboard (default model selection) also stores copies in `dashboard/backups/`.
- Stop the dashboard: see DASHBOARD.md, the "Running" section.
