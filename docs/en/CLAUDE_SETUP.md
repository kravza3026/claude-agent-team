[🇺🇦 Українська](../CLAUDE_SETUP.md) | **🇬🇧 English**

# Setting up Claude Code

A step-by-step guide: install Claude Code, sign in, and start the agent team from this kit. The commands in this document were checked against the output of `claude --help` / `claude <command> --help` (Claude Code 2.1.309, Linux). Everything else is in the official Claude Code documentation.

## 1. What you need

- **An Anthropic account:** a Claude subscription (browser sign-in) **or** an API key (pay per use). Claude Code does not work without one of them.
- **Node.js 18+** is needed only for this kit's dashboard and installer (not for Claude Code itself if you use the native build).
- **git** to clone the kit repository.
- A terminal: any on Linux/macOS; PowerShell on Windows.

## 2. Installing Claude Code

The first installation of Claude Code follows the instructions in the official Claude Code documentation. Once `claude` is in your PATH, the native build or a specific version can be installed with `claude install [stable|latest|<version>]` (`--force` reinstalls forcibly).

**Verify:**
```sh
claude --version        # prints e.g. "2.1.309 (Claude Code)"
claude doctor           # installation health check
```
Windows PowerShell: the same commands. If the command is not found, see section 7.

**Updating.** `claude update` (alias `claude upgrade`) checks for updates and installs them; if Claude Code was installed with a package manager (npm, etc.), the update goes through it (as stated by `claude update --help`). Alternatively, rerun the install command.

## 3. Signing in and keys

**Claude subscription (browser).** Run `claude auth login` in the terminal; `claude auth status` and `claude auth logout` are also available. If the browser did not open, copy the link shown by Claude Code and open it by hand (section 7).

**Alternative: an API key.** The `ANTHROPIC_API_KEY` environment variable is mentioned in `claude --help` (`--bare` mode). Set it **in the user environment**, never in the repository:

- Linux/macOS (bash/zsh), for one session: `export ANTHROPIC_API_KEY="...your key..."` in the terminal. Permanently: add that line to `~/.bashrc` or `~/.zshrc` (the file is not in git; check permissions with `chmod 600`).
- Windows PowerShell, for one session: `$env:ANTHROPIC_API_KEY = "...your key..."`. Permanently for the user: `[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "...your key...", "User")` and open a new window.
- Never paste a real key into examples, scripts, the shell history of a shared computer, chats or screenshots.

**Check:** `claude auth status`. **Sign out:** `claude auth logout`.

For a long-lived subscription token there is `claude setup-token` (the help says: "Set up a long-lived authentication token (requires Claude subscription)").

**Key safety.** Keys and tokens: do not commit them (`.env` files belong in `.gitignore`), do not print them in replies or logs, do not paste them into prompts. The agents in this kit do not read `.env`; if a key does end up in git or a chat, revoke it in the Anthropic console and create a new one.

## 4. First run in a project directory

1. `cd your-project` and run `claude`.
2. **Folder trust.** On the first run in a new folder, Claude Code asks whether you trust it. Agree only for your own projects: in a trusted folder, project settings and hooks may apply.
3. **Permission modes.** By default Claude asks permission for actions (read/write/commands). The `--permission-mode` flag accepts `acceptEdits`, `auto`, `bypassPermissions`, `manual`, `dontAsk`, `plan`; to begin with, keep the default (ask). Do not enable `bypassPermissions` / `--dangerously-skip-permissions` outside an isolated environment. Do not weaken the `deny` rules in your `settings.json`: the kit does not change them.
4. Type a request in the prompt. The model is set with the launch flag `--model <model>`; you can also change it from the dashboard: the "Claude model" card (see [DASHBOARD.md](DASHBOARD.md)).

## 5. Starting the agent team

After installing the kit ([INSTALL.md](INSTALL.md)):

```sh
cd your-project
claude --agent orchestrator        # --agent <agent>: the agent for the current session
```
An example first task: "Analyze the project structure and propose a plan for adding a contacts page with a form; do not change anything yet." The orchestrator will call the planner and, with your approval, the other roles (see [AGENTS.md](AGENTS.md)).

When plain `claude` is enough: quick questions, small edits in one file, getting to know the code. Orchestration is overkill there.

**Checking that the dashboard hooks work.**
1. Start the dashboard: `node ~/.claude/dashboard/start.js` (Windows: `node "$env:USERPROFILE\.claude\dashboard\start.js"`).
2. In a project, start `claude` (or the orchestrator) and do anything, for example ask it to read a file.
3. Events should appear in the dashboard (http://127.0.0.1:7777). If not, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md), the "Hooks do not fire" section. More about the dashboard: [DASHBOARD.md](DASHBOARD.md).

**A session in tmux (Linux/macOS only).** `~/.claude/dashboard/claude-tmux --agent orchestrator` starts Claude inside a tmux session; this lets the dashboard type commands straight into an idle session (without tmux they wait in the queue and are delivered by hooks). It requires `tmux` to be installed. There is no such mode on Windows.

## 6. Limitations and tips

- **State-changing git** (`add`, `commit`, `push`, `reset`, `switch`, ...) is done by you. Agents do not commit or push. Use a separate terminal for that.
- Agents do not read `.env` and do not print secrets; do not ask them to.
- Run no more than one Playwright browser at a time (memory limits).
- For long tasks, watch limits and costs in the dashboard; adjust agent models (`model:` in `agents/*.md`) to your budget.
- Controlling from your phone via Telegram is a separate guide: [TELEGRAM.md](TELEGRAM.md).

## 7. Common problems

| Problem | What to do |
|---|---|
| `claude: command not found` | Open a new shell (PATH is refreshed at startup). Check `command -v claude` (Windows: `where claude`). Add the directory containing the `claude` executable to PATH. |
| Sign-in error / the browser did not open | Copy the link from the terminal and open it in a browser by hand; on a remote server, open it on your own machine. Try `claude auth login`; check `claude auth status`. |
| Update does not install | `claude update`; if installed through a package manager, update with it; `claude doctor` will show installation problems. |
| Windows | Use PowerShell. If scripts are forbidden, see [INSTALL.md](INSTALL.md), section 3 (ExecutionPolicy). |
| Agents/hooks cannot see `node` | [TROUBLESHOOTING.md](TROUBLESHOOTING.md), the "Node not found" section. |

## 8. Official documentation

- CLI help: `claude --help`, `claude <command> --help`.
- Next in this repository: [INSTALL.md](INSTALL.md) → [AGENTS.md](AGENTS.md) → [DASHBOARD.md](DASHBOARD.md).
