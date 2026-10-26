[🇺🇦 Українська](../DASHBOARD.md) | **🇬🇧 English**

# Dashboard

A local web panel for Claude Code. It shows what the agents are doing, how much of your limits you have used, and lets you send commands from the browser. It runs on Node with no dependencies; three.js is bundled locally in `dashboard/vendor/` (nothing is loaded from the internet).

<!-- BEGIN:counts -->
**Agents: 22, skills: 26.**
<!-- END:counts -->

## Running

| OS | Command |
|---|---|
| Linux/macOS | `node ~/.claude/dashboard/start.js` or `~/.claude/dashboard/start.sh` |
| Windows | `node "%USERPROFILE%\.claude\dashboard\start.js"`, `start.cmd` or `start.ps1` |

`start.js` starts the server in the background (log: `dashboard/server.log`), waits until it is ready and opens the browser (`xdg-open` / `open` / `start`). Options: `--port N`, `--no-open`, `--foreground` (server in this same process), `--stop` (stop the server started by this script; its PID is in `dashboard/server.pid`). Autostart at login: `install --service` (see INSTALL.md). Stopping: `node start.js --stop`; if that fails, find the process `node .../dashboard/server.js` (Linux/macOS: `pkill -f dashboard/server.js`; Windows: Task Manager or `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? CommandLine -like '*dashboard*server.js*' | % { Stop-Process $_.ProcessId }`), or `systemctl --user stop agents-dashboard` / `launchctl bootout ...` / `schtasks /End /TN ClaudeAgentTeamDashboard`.

## Features

- **Real-time agent events:** subagent start/stop, tool calls, errors, permission notifications; filters by type, search, a "Conversation" feed (requests from the terminal, Telegram and the dashboard + replies).
- **Scene/diagram:** a 3D pipeline (orchestrator → preparation → development → verification) with task "packets", states and timers; clicking an agent shows its skills and tools; a fallback 2D mode (SVG) when WebGL is unavailable. Zoom: the ＋/－/◎ buttons and Ctrl(⌘/Shift)+wheel.
- **KPIs:** active agents, calls, errors, commands, sessions, 5-hour limit, last event; an activity timeline; an agents table with statistics; a "Plan" tab (steps from `log.js`).
- **Limits and costs:** limit percentages (5 hours / 7 days) and context come from the `statusLine` (`statusline.js` → `status.json`); the server counts tokens (input/output/cache) from the `projects/**/*.jsonl` transcripts in the background, by 5-hour / 24-hour / 7-day windows, models and projects.
- **Commands from the dashboard:** the "Commands" field → delivery to the main session (see the modes below).
- **Model selection:** (1) the current session: `/model <alias>` typed into the terminal through tmux (Linux/macOS); (2) the default model: the `model` key in `settings.json` (only on your click and with confirmation); (3) agent models: the `model:` line in `agents/<agent>.md`. Allowed values come from a whitelist `fable|opus|sonnet|haiku` (+ `inherit`/`default`). A copy is saved to `dashboard/backups/` (last 10) before writing.
- **Interface language (UA/EN):** a `UA | EN` switch in the header; switching is instant (no reload, scene/tab state is kept). The choice is stored in the browser's `localStorage` (key `lang`); without it the browser language is used (`uk*` → Ukrainian, otherwise English), with Ukrainian as the fallback. Dictionaries are `dashboard/locales/uk.json` and `en.json` (flat keys, 261 of them; served at `GET /locales/uk.json|en.json`). On switching, the page sends `POST /lang {"lang":"uk|en"}` (Host/Origin + `X-Token`; only `uk|en` is accepted, otherwise 400; without the token 403); the server writes the language to the file `dashboard/lang` and uses it for system notifications and API error texts (the response carries a `code` and a translated `why`); `GET /state` returns the current language (field `lang`). Data is not translated (commands, Claude replies, tool details, project names). Check the dictionaries with `node dashboard/tools/check-i18n.js` (key parity, non-empty values, every key used in `index.html`/`server.js` exists). New language: copy `locales/en.json` to `locales/<code>.json`, translate it, add the code to `LANGS`/`LOCALES` in `index.html`, to `LANGS` and the `/locales/` route in `server.js`, add a button to `#langSeg` and a `lang.<code>` key.
- **Roles and clear responsibilities:** the dashboard has the orchestrator and 21 roles (the roster and links come from `dashboard/team.json`) with a clear division of duties. Agents without a role (e.g. the built-in `general-purpose`) are not shown on the diagram: tasks should be assigned to the specialized roles, and the orchestrator delegates only to its own roles. Agent names from `Agent` calls are normalized (the old names `frontend-developer`, `backend-developer`, `developer`, `reviewer` are aliases of the new roles), and tasks stuck in "queued" without a start for over 15 minutes are dropped from the task feed.
- **Diagram:** "Scene"/"Diagram" modes; the ⛶ button toggles full screen, the ↔/↕ button switches between vertical and horizontal layout (the vertical one shows logical links between agents: handoffs, returns for rework, the report to the orchestrator); the background is an n8n-style dot grid.
- **Notifications:** agent completion and plan-step failure: Linux `notify-send`, macOS `osascript`, Windows PowerShell (balloon). Disable with the 🔔 button or by creating an empty file `dashboard/mute`. If the tool is missing, it is silently skipped.

## Port, token, security

- The server listens on **127.0.0.1 only**. Port: `--port` for `start.js`, the variable `AGENTS_DASHBOARD_PORT` (`PORT` is also accepted), default 7777. If the port is busy, the server prints a hint and exits.
- Every request checks the `Host` header (only `127.0.0.1:<port>`/`localhost:<port>`); POST requests additionally check `Origin`, `Content-Type: application/json` and the token.
- The token is 24 random bytes in `dashboard/.token` (created on first run; mode `600` on Linux/macOS; on Windows POSIX permissions do not apply, the file sits in your profile). The page receives the token from the server itself.
- Command fields are length-limited and control characters are stripped; at most 20 pending commands, TTL 30 minutes.
- A dashboard command is user input for the agents, but it does NOT grant the right to change access settings/permissions/`settings.json` or to bypass git rules (this is spelled out in `deliver.js` and the orchestrator).
- More: [SECURITY.md](SECURITY.md).

## Command delivery modes

1. **Queue (all OSes).** The command is written to `inbox.jsonl`. The `deliver.js` hook (UserPromptSubmit/PreToolUse/Stop) hands it to the main session as additional context labeled `[джерело: dashboard, id ...]`; acknowledgement goes to `acks.jsonl`. A command in an idle session waits for the next activity (or for the `Stop` hook to "wake" the agent).
2. **tmux (Linux/macOS only, if tmux is installed).** Start Claude through `dashboard/claude-tmux [arguments]` (e.g. `claude-tmux --agent orchestrator`). Hooks remember the session's pane in `panes.json`; the dashboard types the command through `tmux send-keys` only when the session is idle, not waiting for permission and no dialog is open in the terminal; otherwise it automatically falls back to the queue. The text gets the prefix `[dashboard:<id>]`. On Windows this mode is silently disabled.

## How it works

```
Claude Code ──hooks──► hook.js  ──► events.jsonl ──► server.js ──SSE──► browser (index.html)
            ──hook───► deliver.js ◄── inbox.jsonl ◄── POST /command ◄── browser
            ──statusLine─► statusline.js ──► status.json ──► limits
transcripts projects/**/*.jsonl ──► server.js (token counting) ──► usage-cache.json
```

Data files live in `dashboard/`: `events.jsonl` (rotated above 5 MB), `inbox.jsonl`, `acks.jsonl`, `panes.json`, `status.json`, `usage-cache.json`, `.token`, `mute`, `lang`, `server.log`. They are created at runtime and are not part of the repository (`.gitignore`).

The orchestrator writes plan steps with `node dashboard/log.js <agent> <queued|running|done|failed> "<description>"` (it does nothing and never fails if the dashboard is not running).

## Privacy

- Everything is stored locally; the dashboard sends no data anywhere and loads no external resources.
- `hook.js` writes compact events: tool name, a truncated "detail" (command up to 160 characters, file path), the agent's reply text (up to 4000 characters) and your prompts (up to 400). **Secrets are redacted** before writing: values after `api_key|secret|token|password|APP_KEY|authorization`, and tokens like `sk-...`, `ghp_...`, `xox...`, `base64:...`. Redaction is heuristic, so do not paste secrets into prompts; disable collection if needed (see below).
- Token accounting reads Claude Code transcripts only to count `usage`; their content is not copied.
- Disable collection: `install --uninstall` or remove our hooks from `settings.json`; clear data: `--uninstall --purge` or delete `events.jsonl` and the like in `dashboard/`.

## OS limitations

| | Linux | macOS | Windows |
|---|---|---|---|
| Events, scene, limits | yes | yes | yes |
| Command queue | yes | yes | yes |
| tmux mode, model selection for the current session | yes | yes | no |
| Notifications | `notify-send` (libnotify package) | `osascript` | PowerShell balloon (depends on Windows notification settings) |
| Project name from the transcript directory | yes | best-effort | best-effort (`C--Users-...`) |
| `600` permissions on the token | yes | yes | not applicable |

The project in events is derived from the Claude Code transcript directory name (its format depends on the OS); if the format is unknown, the directory name is shown as is.
