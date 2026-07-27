---
name: monitor-discord
description: Start, verify, keep, and stop the workshop Discord-to-Claude Code listener. Use when the user asks Claude Code to watch the configured Discord channel, wait for mobile requests, or stop Discord monitoring.
---

# Monitor Discord

Use the existing `tools/discord-claude` listener. Do not replace it with repeated model polling.

## Start

1. Read `tools/discord-claude/README.md`.
2. Confirm the Claude API environment names exist without printing their values: `JBD_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`.
3. Confirm `data-private/discord-claude/.env` exists without reading or printing its values. The worker loads this file itself.
4. Run `npm install` in `tools/discord-claude` when dependencies are missing.
5. Start `node ./tools/discord-claude/worker.mjs --workspace .` as a long-running background task from the workspace root.
6. Read its startup output and confirm both `ready as` and `watching` before reporting success.
6. Leave the listener running while Claude Code remains open. Discord Gateway events wake the worker; never call the model merely to check whether a message arrived.

## Boundaries

- Listen only to the configured server and channel.
- Ignore messages authored by bots.
- Never request or use a Discord user ID, user token, or user login.
- Never print secret values.
- Accept ordinary Korean messages; do not require slash commands.
- Let `tools/discord-claude/worker.mjs` invoke and resume Claude Code work sessions.

## Stop

Stop only the listener process started by this skill. Do not delete inbox, outbox, state, or result files.
