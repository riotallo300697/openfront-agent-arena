# OpenFront Arena MCP Adapter

Local MCP adapter for OpenFront Agent Arena.

Current status: local read-only Stage 11 adapter.

It uses the official TypeScript MCP SDK:

```text
@modelcontextprotocol/sdk
```

## Safety Boundary

This adapter is intentionally narrow:

- no shell tools;
- no filesystem tools;
- no direct OpenFront core access;
- no direct replay file reads;
- no private data access;
- no hosted user code execution.

The adapter exposes an embedded rules summary instead of reading `docs/AGENT_RULES.md` at runtime. That keeps the adapter useful without giving it filesystem access.

Read-only match tools call the configured local Arena API server over HTTP. Set it with:

```text
$env:ARENA_API_URL="http://127.0.0.1:5000"
```

If `ARENA_API_URL` is not set, the adapter defaults to `http://127.0.0.1:5000`.

Only localhost HTTP URLs are accepted.

## Tools

### `openfront_get_rules`

Returns a concise current Agent Arena rules summary.

This tool is:

- read-only;
- idempotent;
- not open-world;
- not destructive.

### `openfront_list_matches`

Lists completed in-memory match records from the local Arena API server.

### `openfront_get_match_status`

Input:

```json
{
  "matchID": "arena-api-smoke-match"
}
```

Returns match ID, status, creation time, and completion time.

### `openfront_get_result`

Input:

```json
{
  "matchID": "arena-api-smoke-match"
}
```

Returns the final match result from the local Arena API server.

## Resources

### `openfront://rules`

Returns the same concise embedded rules summary as a text resource.

## Manual Stdio Start

```text
npm.cmd run arena:mcp
```

## Smoke Check

```text
npm.cmd run arena:mcp-smoke
```

The smoke check uses the official SDK client and in-memory transport. It starts a local Arena API server only inside the smoke check process so it can verify the read-only match tools. It does not touch `src/core`.

## Next Slices

Useful next MCP slices:

- add `openfront_get_replay_metadata`;
- revisit action/session tools only after the Arena has an explicit session model.
