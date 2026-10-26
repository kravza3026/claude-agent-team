[🇺🇦 Українська](../MCP_SETUP.md) | **🇬🇧 English**

# Connecting MCP servers (Figma, Playwright)

How to connect to Claude Code the two MCP servers the agents of this kit need. The commands were checked against the output of `claude mcp --help` and `claude mcp add --help` (Claude Code 2.1.309, Linux). Everything else is in the official Claude Code documentation.

## 1. Why MCP is needed

An MCP server gives an agent extra tools (names like `mcp__<server>__<tool>`).

| Agent | Required MCP | Purpose |
|---|---|---|
| `figma-reader` | `mcp__figma` | reading the Figma design, `docs/design-spec.md` |
| `tester` | `mcp__playwright` | browser checks: responsive layout, console, network, FPS |
| `pagespeed` | `mcp__playwright` | before/after measurements |

If a server is not connected, the matching tools are unavailable: `figma-reader` cannot read the design, and `tester`/`pagespeed` cannot open the page in a browser. The other agents do not need MCP.

## 2. Figma MCP

1. Connect (HTTP transport, syntax `claude mcp add --transport http <name> <url>`):
   ```sh
   claude mcp add --transport http figma https://mcp.figma.com/mcp
   ```
2. Authenticate the HTTP server: `claude mcp login figma`; sign out: `claude mcp logout figma`.
3. Check: `claude mcp list`. A connected server is shown as `figma: https://mcp.figma.com/mcp (HTTP) - ✔ Connected`.
4. In the task, give the agent the link to the Figma frame (a URL with `node-id`).
5. `figma-reader` reads the design and writes `docs/design-spec.md` (tokens, grid, components, states, assets); it writes no code and records gaps under "Open questions".
6. The file must be accessible to your Figma account.

## 3. Playwright MCP

1. Connect (stdio, syntax `claude mcp add <name> -- <command> [args]`):
   ```sh
   claude mcp add playwright -- npx -y @playwright/mcp@latest --headless
   ```
2. Check: `claude mcp list` shows `playwright: npx -y @playwright/mcp@latest --headless - ✔ Connected`.
3. Kit rule: one browser at a time; `tester` and `pagespeed` must not run in parallel against the same server.
4. `tester` opens pages at 375/768/1440 px, reads the console and network, and writes `docs/test-report.md`; `pagespeed` measures before/after and writes `docs/perf-report.md`.

## 4. Configuration scopes and security

`claude mcp add` has the option `-s, --scope <scope>` with values `local`, `user`, `project` (default `local`). `claude mcp reset-project-choices` resets the approved and rejected choices for `.mcp.json` servers in the project; such servers without approval are shown as "Pending approval" and are not connected (`claude mcp get <name>`, `claude mcp list`).

Example: `claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp`.

Risks:
- An MCP server runs code on your machine (stdio) or acts on behalf of your account (HTTP). Connect only trusted servers.
- Never commit tokens, `--header "Authorization: ..."` headers or `-e KEY=...` values into `.mcp.json`; review `git diff` before committing.
- Remove a server: `claude mcp remove <name>`.

## 5. Checking from the agent team side

1. Start the orchestrator: `claude --agent orchestrator` (see [CLAUDE_SETUP.md](CLAUDE_SETUP.md)).
2. Figma: "Read the design <frame URL> and prepare docs/design-spec.md". Expected: a `figma-reader` call and the file `docs/design-spec.md`.
3. Playwright: "Test http://localhost:8000/ at 375 and 1440 px". Expected: a `tester` call and a PASS/FAIL verdict in `docs/test-report.md`.
4. Agents see `mcp__figma` / `mcp__playwright` because those tools are listed in their frontmatter (`figma-reader`, `tester`, `pagespeed`; see [AGENTS.md](AGENTS.md)).

## 6. Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| The server is missing from `claude mcp list` | not added, or a different scope | `claude mcp add ...` in the right scope |
| Figma: needs authentication | not signed in | `claude mcp login figma` |
| Figma: stale token | the sign-in session expired | `claude mcp logout figma`, then `claude mcp login figma` |
| Figma: no access to the file | the file is not available to your account | grant access in Figma or sign in with another account |
| Playwright does not start | no Node/`npx` or no network | `node -v`, `npx -v` |
| Playwright: hangs, out of memory | several browsers at once | one browser; close extras |
| A `.mcp.json` server does not connect | waiting for approval (Pending approval) | `claude mcp get <name>`; approve the server |

Other problems with the kit: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
