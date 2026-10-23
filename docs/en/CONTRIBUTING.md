[🇺🇦 Українська](../CONTRIBUTING.md) | **🇬🇧 English**

# Contributing

## Structure

```
agents/ skills/ dashboard/    <- content that gets installed
installer/install.js          <- the single installer implementation (Node >= 18, no dependencies)
install.* uninstall.*         <- thin wrappers (check Node and call install.js)
tools/gen-docs.js             <- generates tables in docs from frontmatter
tests/smoke.js                <- smoke tests (node tests/smoke.js)
docs/                         <- documentation (Ukrainian), docs/en/ (English), docs/i18n/ (English descriptions)
```

## Before a pull request

```sh
node tools/gen-docs.js     # refresh the agent/skill tables in docs
node tests/smoke.js        # full smoke test
```
`smoke.js` checks: syntax of all `.js` files, frontmatter of agents and skills (`name`, `description`, `name` = directory/file name, `skills:` references exist), install/idempotency/uninstall in a temporary directory, safe handling of `settings.json`, freshness of `docs`, documentation parity (UA/EN), and absence of personal data, tokens and keys.

## Bilingual docs (UA/EN)

- The primary language is Ukrainian: `README.md`, `docs/*.md`. English counterparts: `README.en.md`, `docs/en/*.md`, a complete translation with the same sections (the number of `##` headings must match) and unchanged code blocks. Every file starts with a switcher line `🇺🇦 Українська | 🇬🇧 English`.
- English descriptions of agents and skills (for the English tables) live in `docs/i18n/descriptions.en.json` (`agents.<name>`, `skills.<name>`); the frontmatter of agents/skills stays Ukrainian so that no non-standard keys are added. A new agent/skill without an English description will not pass `node tools/gen-docs.js --check`.
- Tables are generated for both languages by `node tools/gen-docs.js`. `tests/smoke.js` checks file parity, the switchers, the `##` counts, absence of Cyrillic in the English files (only the switcher line and inline code are allowed) and absence of broken relative links.
- Installer messages are written in Ukrainian in the code; the English ones are in the `EN` table in `installer/install.js` (`--lang en`). A new message means a new entry in the table (a test checks that English output contains no Cyrillic).

## Rules

- Documentation and agent text are in Ukrainian (primary); technical terms and identifiers stay in the original.
- Cross-platform: `path.join`, `os.homedir()`, no bash-isms in `.js`; `.sh` scripts are POSIX sh; Windows gets separate `.ps1`/`.cmd`.
- No personal data, names of other people's projects/clients, paths of your machine, or tokens. Use neutral examples.
- The installer must not change foreign `settings.json` keys and must not delete files modified by the user.
- We add no new dependencies (Node stdlib only).
- In `docs/en/CLAUDE_SETUP.md` mark Claude Code commands **[verified]** only after checking `claude --help` of the current version, otherwise **[check]**; do not invent URLs or flags (see [CLAUDE_SETUP.md](CLAUDE_SETUP.md)).
- New agent/skill: see `docs/en/AGENTS.md` and `docs/en/SKILLS.md`.
- Check the Windows/macOS branches at least with string-building unit tests (`tests/smoke.js`, the platform section) and, if you can, on a real OS; state what exactly you ran.

## License

Contributions are provided under the MIT license (`LICENSE`).
