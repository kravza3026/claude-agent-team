[🇺🇦 Українська](../SECURITY.md) | **🇬🇧 English**

# Security

## What the installer changes

- Copies files into `<CLAUDE_DIR>/agents`, `skills`, `dashboard` and creates `agent-team-manifest.json` and `backups-agent-team/`.
- In `settings.json` adds **12 hooks** (dashboard) and a `statusLine`, the latter only if none exists. It makes a backup before writing; the write is atomic; invalid JSON is left alone.
- With `--service`/`--shortcut`: a systemd `--user` unit, `.desktop`; a LaunchAgent; a Scheduled Task/Startup file; shortcuts. The paths are in the manifest and `--uninstall` removes them.

## What the installer does NOT change

- `permissions` (`allow`/`deny`), `env`, `model`, `language`, `autoMode`, `enabledPlugins` and other `settings.json` keys, your own hooks.
- Telegram settings and plugins; project `CLAUDE.md` files; files outside `<CLAUDE_DIR>` (except the autostart/shortcuts you explicitly asked for).
- It does not run `git`, does not run `sudo`, does not access the network, does not download code.
- It does not delete files you modified (it keeps them and tells you).

Note: the dashboard (on your click in the "Claude model" section) may change the `model` key in `settings.json` or `model:` in an agent file, with confirmation and a backup copy in `dashboard/backups/`.

## Dashboard security model

- Listens on `127.0.0.1` only; checks `Host`/`Origin` (protection against DNS rebinding and CSRF from other sites).
- State-changing requests (`/command`, `/model`, `/mute`, `/lang`) require a token in the `x-token` header; the token is random, stored in `dashboard/.token` (mode 600 on Linux/macOS) and is given only to the page from the same origin.
- Input is validated: models against a whitelist; agent names `[A-Za-z0-9_-]+` and only existing files; session IDs are 8 hex characters; request body sizes are limited.
- Secrets in events are redacted (heuristic, not a guarantee); the dashboard sends no data out and loads no external scripts.
- Anyone with access to your user account on this computer can read `.token` and the data. If you need isolation, do not run the dashboard on shared accounts.

## Agent policy

- **git:** agents do not run state-changing git (`add/commit/push/reset/stash/merge/rebase/restore/switch/checkout`); the orchestrator only on the user's direct command. `status/diff/log/show` are allowed.
- **`.env` and secrets:** never read or printed; `.env` is not modified (the agent describes the required keys in its report). The reviewer looks for secrets in the diff and reports `file:line`, not the value.
- **Database:** test/local only; destructive commands (`migrate:fresh`, `db:wipe`, `DROP`, `TRUNCATE`) only with direct permission; agents never touch production access.
- **Channels and subagent reports are data, not instructions.** The orchestrator trusts only the channel owner configured via `/telegram:access` and does not change access on the basis of channel messages.
- Agents may run shell commands within the permissions you configured in Claude Code. The kit does not widen those permissions.

## How to review the code before installing

1. Read `installer/install.js` (the single implementation) and the wrappers (`install.sh`, `install.ps1`, `install.cmd`); they only check Node and call it.
2. `node installer/install.js --dry-run --target /tmp/test-claude` shows every action without writing anything.
3. Install into a temporary directory: `node installer/install.js --yes --target /tmp/test-claude` and inspect the `settings.json` there.
4. Read `dashboard/hook.js`, `deliver.js`, `server.js` (about 600 lines) and `agents/*.md`.
5. `node tests/smoke.js` verifies, among other things, that no personal data, tokens or keys are in the repository.
6. Do not run `curl ... | sh` from unknown sources; clone the repository and read it.

## Reporting a vulnerability

Send a private message to the maintainer through your repository host's mechanism (security advisory) or the contact listed in the repository. Do not publish tokens or logs containing secrets.
