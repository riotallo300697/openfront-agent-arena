# OpenFront Arena MCP Adapter

Local MCP adapter for OpenFront Agent Arena.

Current status: first read-only Stage 11 slice.

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

The first slice exposes an embedded rules summary instead of reading `docs/AGENT_RULES.md` at runtime. That keeps the adapter useful without giving it filesystem access.

## Tools

### `openfront_get_rules`

Returns a concise current Agent Arena rules summary.

This tool is:

- read-only;
- idempotent;
- not open-world;
- not destructive.

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

The smoke check uses the official SDK client and in-memory transport. It does not start the Arena API server and does not touch `src/core`.

## Next Slices

Useful next MCP slices:

- expose read-only Arena API server tools such as list matches, get match, and get result;
- add an MCP smoke check against a live local Arena API server;
- revisit action/session tools only after the Arena has an explicit session model.
