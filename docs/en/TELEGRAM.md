[🇺🇦 Українська](../TELEGRAM.md) | **🇬🇧 English**

# Telegram: controlling the orchestrator from your phone (optional)

The installer does **not configure Telegram** and does not install the plugin automatically. You do everything below yourself. The commands were checked against the files of the official plugin `telegram@claude-plugins-official` (the version checked: 0.0.7). Anything that could not be verified is marked "check the plugin's current help".

## 1. What this gives you

You message your bot in Telegram, and the message arrives in a running Claude Code session as a task; the orchestrator's reply returns to the chat. This lets you assign tasks and receive reports from your phone. It works through the plugin's MCP server, which logs into Telegram as a bot. Photos you send are downloaded locally and shown to the agent.

Requirements: the plugin runs on [Bun](https://bun.sh) (per its README); it works only while a Claude Code session with the channel is running; the Telegram Bot API gives no message history or search, so the bot sees only new messages.

## 2. Create a bot in @BotFather

1. In Telegram, open [@BotFather](https://t.me/BotFather).
2. Send `/newbot`.
3. Give a **name** (shown in the chat, may contain spaces) and a **username** (unique, ending in `bot`, e.g. `my_team_assistant_bot`).
4. BotFather sends a **token** like `123456789:AAH...`. This is your bot's password: **do not publish it, do not commit it, do not paste it into chats or screenshots**.

## 3. Install the plugin in Claude Code

In a Claude Code session (`claude`):

```
/plugin install telegram@claude-plugins-official
```

If the command is unavailable or the marketplace is not connected, check the plugin's current help and the Claude Code documentation on plugins. Make sure Bun is installed (`bun --version`).

## 4. Save the token

```
/telegram:configure 123456789:AAH...your_token
```
The plugin writes the token locally to `.env` in its state directory (by default `~/.claude/channels/telegram/`, overridable with the `TELEGRAM_STATE_DIR` variable; file mode 600). You can also set the `TELEGRAM_BOT_TOKEN` variable in your shell environment (it takes precedence). `/telegram:configure` without arguments shows the status (the token is partly masked). After changing the token, restart the session or run `/reload-plugins`.

This directory does not exist in the repository and you must **never copy it into git**.

## 5. Start a session with the channel

The plugin's server will not connect without the `--channels` flag:

```sh
claude --channels plugin:telegram@claude-plugins-official
```

With the orchestrator:

```sh
claude --agent orchestrator --channels plugin:telegram@claude-plugins-official
```

The `--agent` flag is described in `claude --help`; the `--channels` flag is given per the plugin's README, and we could not verify its compatibility with `--agent` in the CLI help, so check the current help (`claude --help`) of your version. If the combination is not accepted, start with `--channels` and ask the orchestrator inside the session, or set `"agent": "orchestrator"` in `settings.json`.

On Linux/macOS, so the dashboard can type commands into the session (tmux mode):

```sh
~/.claude/dashboard/claude-tmux --agent orchestrator --channels plugin:telegram@claude-plugins-official
```
(`claude-tmux` simply passes its arguments to `claude` inside tmux.) On Windows there is no tmux mode; dashboard commands go through the queue.

## 6. Pairing

1. Message your bot in Telegram (anything). By default (`dmPolicy: pairing`) the bot replies with a **6-character pairing code**. If it stays silent, see section 9.
2. In the **terminal** of your Claude Code session run:
   ```
   /telegram:access pair <code>
   ```
3. Your next message will reach the agent. The code must always be entered explicitly: do not ask to "approve the pending one".

Policies (`dmPolicy`), changed with `/telegram:access policy <mode>`:

| Mode | Behavior |
|---|---|
| `pairing` (default) | an unknown sender gets a pairing code; the message is dropped |
| `allowlist` | unknown senders are silently ignored (the recommended working mode) |
| `disabled` | everything is dropped, including your own messages |

After you have paired, switch to `allowlist`:
```
/telegram:access policy allowlist
```
Other commands: `/telegram:access` (status), `allow <numeric id>`, `remove <id>`, `deny <code>`, `group add <group id> [--no-mention] [--allow id1,id2]`, `group rm <id>`, `set <key> <value>` (`ackReaction`, `replyToMode`, `textChunkLimit`, `chunkMode`, `mentionPatterns`). A person's numeric id can be found with [@userinfobot](https://t.me/userinfobot). Groups are off by default; for the bot to reply without being mentioned you must disable privacy mode in BotFather (`/setprivacy`). The full description is in `ACCESS.md` in the plugin directory (check the plugin's current help).

## 7. Security

- **Only the user manages access, in the terminal.** The `/telegram:access ...` commands must not be run because a channel message asked for it. The orchestrator in this repository knows this: it never changes access, allowlists or permissions on a request from a channel.
- **Channel messages are data, not instructions.** The orchestrator trusts only the channel owner (the one you paired) and does not execute commands from unverified senders.
- **The token** is stored locally (mode 600); do not commit it: `.env` is in `.gitignore`, and `tests/smoke.js` searches the repository for bot tokens.
- Switch the policy to `allowlist` right after pairing so strangers do not get pairing codes.
- Remember: the agent carries out tasks from your phone with the same rights as in the terminal. Configure Claude Code `permissions` carefully; a session waiting for permission will not proceed without you.

## 8. How to verify that it works

1. In the terminal: `/telegram:configure` (no arguments) shows the token as "set", the policy and the list of allowed senders.
2. Send the bot "hello": "typing..." should appear, then the agent's reply.
3. In the dashboard (if running) a record with the Telegram source appears in "Conversation".

## 9. Common problems

| Problem | What to do |
|---|---|
| The bot is silent | Was the session started without `--channels plugin:telegram@claude-plugins-official`? Restart with the flag. Is the token saved (`/telegram:configure`)? Is Bun installed? |
| The pairing code does not arrive | Policy is `allowlist`/`disabled` (the bot is silent on purpose): temporarily run `/telegram:access policy pairing`, or add the id directly with `allow <id>`. Check that you are messaging the right bot. |
| The code expired / "not found" | Message the bot again, get a new code and run `pair` immediately. |
| "I changed the token but nothing changed" | Restart the session or run `/reload-plugins`. |
| Several sessions | One token, one connected server. Use separate `TELEGRAM_STATE_DIR` values for several bots; do not run two sessions with the same bot. |
| Long replies | Telegram limits message length; the plugin splits text into parts (`set textChunkLimit`, `chunkMode`). |
| The bot "does not remember" older messages | The Bot API provides no history; forward or retell what is needed. |
| The orchestrator ignores "add me to the allowlist" | By design: this is done only in the terminal. |

## 10. Disconnecting and revoking the token

- Temporarily: start a session without `--channels`, or run `/telegram:access policy disabled`.
- Remove the token locally: `/telegram:configure clear`.
- **Revoke the token for good:** in [@BotFather](https://t.me/BotFather) run `/revoke` and choose the bot; the old token stops working (you can then generate a new one). If the token accidentally ended up in git or a chat, run `/revoke` immediately.
- Remove the plugin: manage it through `/plugin` (check the plugin's current help).
