[🇺🇦 Українська](README.md) | **🇬🇧 English**

# claude-agent-team

A ready-to-use "box" for [Claude Code](https://docs.anthropic.com/en/docs/claude-code): a team of 22 agents (an orchestrator and 21 roles in four groups), 26 skills, and a local dashboard with agent events, limits and commands. It installs with one command on Linux, macOS and Windows and does not touch anything else in your settings.

<!-- BEGIN:counts -->
**Agents: 22, skills: 26.**
<!-- END:counts -->

## Language

The documentation is bilingual: Ukrainian is the primary language (`README.md`, `docs/*.md`), English is in this file and `docs/en/*.md`. The installer (`--lang uk|en`) and the dashboard (UA/EN switch) are bilingual too. Note: the agents' own prompts are written in Ukrainian (the orchestrator answers in Ukrainian by default); see [docs/en/AGENTS.md](docs/en/AGENTS.md) on how to change that.

## What is inside

```
                      ┌────────────────────┐
   you ── terminal ──►│    orchestrator    │◄── Telegram (optional)
   ── dashboard ─────►│ plan · delegation  │
                      └─────────┬──────────┘
        ┌───────────┬───────────┼────────────┬───────────────┐
business-analyst  architect  planner  figma-reader  (analysis & design)
        │                                        │
        ▼                                        ▼
 frontend-engineer ◄── contract ──► backend-engineer ── database-engineer
 (+ devops · ai · mobile · 3d-modeler · content-writer)
        └──────────────┬──────────────────┘
                       ▼
  test-writer ► qa-engineer ► tester ──FAIL──► debugger / engineer (fix → retest loop, up to 3 times)
          │ PERF WARN/FAIL
          ▼
      pagespeed ──► tester ──► spec-validator · code-reviewer · security-reviewer
                       ──► technical-writer ──► report to you
```

- **Agents** (`agents/`) are roles with clear boundaries; the orchestrator does not write large amounts of code itself, it plans, delegates and verifies.
- **Skills** (`skills/`) are knowledge for the roles: design, typography, three.js, Blender, performance, Laravel practices, and more.
- **Dashboard** (`dashboard/`) is a local web panel (127.0.0.1): live events, a 3D/2D scene, limits and costs, commands from the browser, model selection.
- **Installer** (`installer/install.js`) is one Node codebase for all OSes: dry-run, backups, safe merging of `settings.json`, uninstall.

## Requirements

| What | Required? |
|---|---|
| Node.js 18+ | yes (installer and dashboard; no npm dependencies) |
| Claude Code CLI (`claude`) | yes, for the agents to work ([official docs](https://docs.anthropic.com/en/docs/claude-code)); the installer only warns if it is not in PATH |
| git | yes, to clone the repository |
| tmux | no (Linux/macOS: "type commands into the terminal" mode from the dashboard) |
| Blender | no (only for the `3d-modeler` agent) |

## Quick start

**Step 0.** Install Claude Code and sign in: [docs/en/CLAUDE_SETUP.md](docs/en/CLAUDE_SETUP.md).

Repository: <https://github.com/kravza3026/claude-agent-team>. We deliberately do not suggest `curl ... | sh`: clone first and, if you wish, read the code (see `docs/en/SECURITY.md`).

### Linux

```sh
git clone https://github.com/kravza3026/claude-agent-team.git claude-agent-team && cd claude-agent-team
./install.sh --dry-run      # 1) see what would be done (nothing is written)
./install.sh                # 2) install into ~/.claude
```
Check and run:
```sh
node ~/.claude/dashboard/start.js        # dashboard -> http://127.0.0.1:7777
claude --agent orchestrator              # inside your project
```

### macOS

```sh
git clone https://github.com/kravza3026/claude-agent-team.git claude-agent-team && cd claude-agent-team
./install.sh --dry-run
./install.sh
node ~/.claude/dashboard/start.js
claude --agent orchestrator
```
(If Gatekeeper/"unidentified developer" blocks the script: `xattr -d com.apple.quarantine install.sh`, or run `node installer/install.js` directly; details in `docs/en/INSTALL.md`.)

### Windows (PowerShell)

```powershell
git clone https://github.com/kravza3026/claude-agent-team.git claude-agent-team; cd claude-agent-team
.\install.ps1 --dry-run
.\install.ps1
node "$env:USERPROFILE\.claude\dashboard\start.js"
claude --agent orchestrator
```
If PowerShell forbids scripts: `powershell -ExecutionPolicy Bypass -File .\install.ps1`, or double-click `install.cmd` (see `docs/en/INSTALL.md`).

After `node .../start.js`, open http://127.0.0.1:7777 (the browser opens automatically). On all three OSes you can also run the installer directly: `node installer/install.js [options]`.

## How to verify that everything works

1. `node installer/install.js --list` shows which parts of the kit are installed.
2. After any action in Claude Code, events appear in the dashboard.
3. `claude --agent orchestrator` → give it a small task; you will see the agents work in the dashboard.

## Updating

```sh
git pull
node installer/install.js --update       # Windows: .\install.ps1 --update
```
Files you modified are not overwritten (a warning is printed); `--force` overwrites them **after a backup** into `<dir>/backups-agent-team/<time>/`.

## Uninstalling

```sh
node installer/install.js --uninstall          # Windows: .\uninstall.ps1
node installer/install.js --uninstall --purge  # also removes dashboard data (events, token)
```
Only files installed by the installer and not modified by you are removed; from `settings.json` only our hooks and `statusLine` are removed (with a backup).

## What works on which OS

| Capability | Linux | macOS | Windows |
|---|---|---|---|
| Installer, agents, skills | yes | yes | yes |
| Hooks and dashboard | yes | yes | yes |
| Dashboard commands via the queue (`deliver.js` hooks) | yes | yes | yes |
| Commands "into the terminal" (tmux, `claude-tmux`) | yes (tmux required) | yes (tmux required) | no (disabled; the queue works) |
| System notifications | `notify-send` | `osascript` | PowerShell (balloon) |
| Autostart `--service` | systemd `--user` / XDG autostart | LaunchAgent | Scheduled Task / Startup |
| Shortcut `--shortcut` | `.desktop` | `.command` | `.lnk` |
| Tested by the author | yes (smoke + real run) | **no** (string-building unit tests only; CI) | **no** (string-building unit tests only; CI) |

The Windows and macOS branches were verified only statically and in CI (`.github/workflows/ci.yml`); if something does not work, open an issue with the `--dry-run` output.

## Documentation

- [docs/en/CLAUDE_SETUP.md](docs/en/CLAUDE_SETUP.md): connecting Claude Code: install, sign-in, first run
- [docs/en/MCP_SETUP.md](docs/en/MCP_SETUP.md): connecting the Figma and Playwright MCP servers
- [docs/en/INSTALL.md](docs/en/INSTALL.md): step-by-step installation, options, manual install
- [docs/en/AGENTS.md](docs/en/AGENTS.md): the 22 agents, interaction diagram, how to add your own
- [docs/en/SKILLS.md](docs/en/SKILLS.md): the 26 skills, how to add your own
- [docs/en/DASHBOARD.md](docs/en/DASHBOARD.md): the dashboard: features, security, privacy
- [docs/en/TELEGRAM.md](docs/en/TELEGRAM.md): controlling the orchestrator from your phone (optional)
- [docs/en/SECURITY.md](docs/en/SECURITY.md): what changes and what does not; security model
- [docs/en/TROUBLESHOOTING.md](docs/en/TROUBLESHOOTING.md): common problems and rollback
- [docs/en/CONTRIBUTING.md](docs/en/CONTRIBUTING.md): contributing and checks

License: MIT (`LICENSE`); third-party components: `THIRD_PARTY_NOTICES.md`.
