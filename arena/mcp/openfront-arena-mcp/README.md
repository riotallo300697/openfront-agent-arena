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

Read-only match and session artifact tools call the configured local Arena API server over HTTP. Set it with:

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

### `openfront_get_replay_metadata`

Input:

```json
{
  "matchID": "arena-api-smoke-match"
}
```

Returns replay metadata and the replay path from the local Arena API server. It does not read the replay file.

### `openfront_list_session_artifacts`

Lists completed session artifact metadata from the local Arena API server.

This calls the Arena API summary endpoint. The returned metadata intentionally excludes completed turn/action history.

### `openfront_get_session_artifact_metadata`

Input:

```json
{
  "sessionID": "arena-session-artifact"
}
```

Returns completed session artifact metadata from the local Arena API server summary endpoint. It does not read replay contents and does not expose action/session controls.

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

The smoke check uses the official SDK client and in-memory transport. It starts a local Arena API server only inside the smoke check process so it can verify the read-only match and session artifact tools. It does not touch `src/core`.

It also verifies negative MCP boundaries:

- unknown matches are returned as MCP tool errors;
- unknown session artifacts are returned as MCP tool errors;
- non-localhost or non-HTTP `ARENA_API_URL` values are rejected before server startup.

## Next Slices

Useful next MCP slices:

- use `docs/MCP_STAGE11_REVIEW.md` as the read-only Stage 11 closure note;
- use `docs/MCP_SESSION_MODEL.md` as the design gate for future action/session tools;
- implement action/session tools only after a separate approved package wires pull-style runner behavior behind Arena API session endpoints.
