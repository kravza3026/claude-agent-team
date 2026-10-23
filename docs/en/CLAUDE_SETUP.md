[🇺🇦 Українська](../CLAUDE_SETUP.md) | **🇬🇧 English**

# Setting up Claude Code

A step-by-step guide: install Claude Code, sign in, and start the agent team from this kit. The official documentation is the primary source: <https://docs.anthropic.com/en/docs/claude-code>. Anything that changes quickly (install commands, package names, `/...` menus) should be checked there.

Markers: **[verified]** means the command or flag was confirmed by the output of `claude --help` / `claude <command> --help` (Claude Code 2.1.309, Linux) on the author's machine; **[check]** means it could not be verified against the CLI help, so check the current official documentation.

## 1. What you need

- **An Anthropic account:** a Claude subscription (browser sign-in) **or** an API key (pay per use). Claude Code does not work without one of them.
- **Node.js 18+** is needed only for this kit's dashboard and installer (not for Claude Code itself if you use the native build).
- **git** to clone the kit repository.
- A terminal: any on Linux/macOS; PowerShell (or WSL) on Windows. See the official documentation for Windows shell requirements.

## 2. Installing Claude Code

There are two ways. Always take the exact commands from the official installation page, as it is kept up to date.

**Native installer (the route recommended in the official documentation) [check].** The command/script for your OS (Linux, macOS, Windows) is given in the installation section of the official documentation. We deliberately do not copy script URLs here and do not recommend `curl ... | sh` from memory. Once `claude` is in your PATH, other versions can be installed with `claude install [stable|latest|<version>]` **[verified]** (`--force` reinstalls forcibly **[verified]**).

**Via npm [check].** For those who already have Node.js 18+: `npm install -g @anthropic-ai/claude-code`. Confirm the package name and whether this route is still current in the official documentation (installation section). Do not use `sudo npm ...`; if npm needs permissions, configure the global package prefix as described in the npm documentation.

**Verify:**
```sh
claude --version        # [verified] prints e.g. "2.1.309 (Claude Code)"
claude doctor           # [verified] installation health check
```
Windows PowerShell: the same commands. If the command is not found, see section 7.

**Updating.** `claude update` (alias `claude upgrade`) **[verified]** checks for updates and installs them; if Claude Code was installed with a package manager (npm, etc.), the update goes through it (as stated by `claude update --help`). Alternatively, rerun the install command.

## 3. Signing in and keys

**Claude subscription (browser).** Run `claude` and execute `/login` **[check]** (a session command). From the terminal, `claude auth login`, `claude auth status` and `claude auth logout` are also available **[verified]**. If the browser did not open, copy the link shown by Claude Code and open it by hand (section 7).

**Alternative: an API key.** Claude Code reads the key from the `ANTHROPIC_API_KEY` environment variable **[verified: it is mentioned in `claude --help` for `--bare` mode; confirm the general behavior in the documentation]**. Set it **in the user environment**, never in the repository:

- Linux/macOS (bash/zsh), for one session: `export ANTHROPIC_API_KEY="...your key..."` in the terminal. Permanently: add that line to `~/.bashrc` or `~/.zshrc` (the file is not in git; check permissions with `chmod 600`).
- Windows PowerShell, for one session: `$env:ANTHROPIC_API_KEY = "...your key..."`. Permanently for the user: `[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "...your key...", "User")` and open a new window.
- Never paste a real key into examples, scripts, the shell history of a shared computer, chats or screenshots.

**Check:** `/status` in a session **[check]** or `claude auth status` in the terminal **[verified]**. **Sign out:** `/logout` **[check]** or `claude auth logout` **[verified]**.

For a long-lived subscription token there is `claude setup-token` **[verified: "Set up a long-lived authentication token (requires Claude subscription)"]**; its purpose and safe storage are covered by the official documentation.

**Key safety.** Keys and tokens: do not commit them (`.env` files belong in `.gitignore`), do not print them in replies or logs, do not paste them into prompts. The agents in this kit do not read `.env`; if a key does end up in git or a chat, revoke it in the Anthropic console and create a new one.

## 4. First run in a project directory

1. `cd your-project` and run `claude`.
2. **Folder trust.** On the first run in a new folder, Claude Code asks whether you trust it. Agree only for your own projects: in a trusted folder, project settings and hooks may apply.
3. **Permission modes.** By default Claude asks permission for actions (read/write/commands). The `--permission-mode` flag accepts `acceptEdits`, `auto`, `bypassPermissions`, `manual`, `dontAsk`, `plan` **[verified]**; to begin with, keep the default (ask). Do not enable `bypassPermissions` / `--dangerously-skip-permissions` outside an isolated environment. Do not weaken the `deny` rules in your `settings.json`: the kit does not change them.
4. Type a request in the prompt. Useful session commands **[check]**: `/help` (help), `/model` (choose the model; the launch flag is `--model <model>` **[verified]**), `/permissions` (view and edit permission rules). You can also change the model from the dashboard: the "Claude model" card (see [DASHBOARD.md](DASHBOARD.md)).

## 5. Starting the agent team

After installing the kit ([INSTALL.md](INSTALL.md)):

```sh
cd your-project
claude --agent orchestrator        # [verified] --agent <agent>: the agent for the current session
```
An example first task: "Analyze the project structure and propose a plan for adding a contacts page with a form; do not change anything yet." The orchestrator will call the planner and, with your approval, the other roles (see [AGENTS.md](AGENTS.md)).

When plain `claude` is enough: quick questions, small edits in one file, getting to know the code. Orchestration is overkill there.

**Checking that the dashboard hooks work.**
1. Start the dashboard: `node ~/.claude/dashboard/start.js` (Windows: `node "$env:USERPROFILE\.claude\dashboard\start.js"`).
2. In a project, start `claude` (or the orchestrator) and do anything, for example ask it to read a file.
3. Events should appear in the dashboard (http://127.0.0.1:7777). If not, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md), the "Hooks do not fire" section. More about the dashboard: [DASHBOARD.md](DASHBOARD.md).

**A session in tmux (Linux/macOS only).** `~/.claude/dashboard/claude-tmux --agent orchestrator` starts Claude inside a tmux session; this lets the dashboard type commands straight into an idle session (without tmux they wait in the queue and are delivered by hooks). It requires `tmux` to be installed. There is no such mode on Windows.

## 6. Limitations and tips

- **State-changing git** (`add`, `commit`, `push`, `reset`, `switch`, ...) is done by you. Agents do not commit or push. To run a command inside the session itself, prefix it with `!`, e.g. `! git status` **[check]**; or use a separate terminal.
- Agents do not read `.env` and do not print secrets; do not ask them to.
- Run no more than one Playwright browser at a time (memory limits).
- For long tasks, watch limits and costs in the dashboard; adjust agent models (`model:` in `agents/*.md`) to your budget.
- Controlling from your phone via Telegram is a separate guide: [TELEGRAM.md](TELEGRAM.md).

## 7. Common problems

| Problem | What to do |
|---|---|
| `claude: command not found` | Open a new shell (PATH is refreshed at startup). Check `command -v claude` (Windows: `where claude`). The native install puts the file in a user directory (usually something like `~/.local/bin`; the exact location is in the official documentation): add it to PATH. If you installed through npm and Node is managed by nvm, activate the right Node version (`nvm use`) and check the npm global prefix (`npm config get prefix`) and its `bin` directory in PATH. |
| Sign-in error / the browser did not open | Copy the link from the terminal and open it in a browser by hand; on a remote server/WSL, open it on your own machine. Try `claude auth login` **[verified]**; check `claude auth status`. |
| Corporate network / proxy | Claude Code needs internet access. `HTTPS_PROXY`/`HTTP_PROXY` are the standard way for CLIs, but for Claude Code **[check]** the network/proxy section of the official documentation; do not invent other variables. |
| Update does not install | `claude update` **[verified]**; if installed through a package manager, update with it; `claude doctor` will show installation problems. |
| Windows | Use PowerShell. If scripts are forbidden, see [INSTALL.md](INSTALL.md), section 3 (ExecutionPolicy). The alternative is WSL (the Linux instructions apply inside WSL; open the dashboard at http://127.0.0.1:port in the Windows browser, making sure the port is reachable). |
| Agents/hooks cannot see `node` | [TROUBLESHOOTING.md](TROUBLESHOOTING.md), the "Node not found" section. |

## 8. Official documentation

- Claude Code: <https://docs.anthropic.com/en/docs/claude-code> (installation, sign-in, permissions, settings, hooks, proxy).
- CLI help: `claude --help`, `claude <command> --help`; inside a session `/help`.
- Next in this repository: [INSTALL.md](INSTALL.md) → [AGENTS.md](AGENTS.md) → [DASHBOARD.md](DASHBOARD.md).
