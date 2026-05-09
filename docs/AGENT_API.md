# Agent API

This document describes the current agent-facing contract for OpenFront Agent Arena.

Current status: the full Agent API server is not implemented yet. The runner currently proves the contract locally and through a small live HTTP example agent. It does not expose a public HTTP server, WebSocket API, MCP adapter, frontend, database, ratings, or tournaments.

No OpenFront core game rules are changed by this work.

## Current Prototype

`npm.cmd run arena:local` runs two built-in agents inside the same Node.js process.

`npm.cmd run arena:http-match` runs one live local HTTP example agent and one built-in agent in the same headless match.

Both paths use the same runner boundary:

```text
observation -> raw agent output -> input validation -> game validation -> intent -> replay audit
```

The implementation details are summarized in:

```text
docs/RUNNER_OVERVIEW.md
docs/RUNNER_CHECKS.md
```

## Observation

The current `AgentObservation` is intentionally small:

- current tick;
- own client ID and name;
- whether the agent has spawned;
- owned tile count;
- basic public data for all players.

The current TypeScript shape lives in:

```text
arena/runner/src/types.ts
```

The current JSON Schema object lives in:

```text
arena/runner/src/agentContractSchema.ts
```

The observation contract can be checked with:

```text
npm.cmd run arena:observation
```

## Actions

The current `AgentAction` union supports:

- `spawn`;
- `wait`;
- `attack` against neutral territory.

Action handling has two layers:

- input validation: does the raw value match the current `AgentAction` contract?
- game validation: is the contract-valid action legal in the current game situation?

Important files:

```text
arena/runner/src/agentActionInput.ts
arena/runner/src/actionValidation.ts
arena/runner/src/intentAdapter.ts
```

Useful checks:

```text
npm.cmd run arena:contract
npm.cmd run arena:action-input
npm.cmd run arena:validate
npm.cmd run arena:intent
```

## HTTP Example

The first HTTP client skeleton lives in:

```text
arena/runner/src/httpAgentClient.ts
```

It sends:

```text
POST <endpoint>
{ observation }
```

It expects a JSON response shaped like:

```text
{ action }
```

The returned `action` is still raw `unknown`, so it goes through the same input validation, game validation, intent adapter, and replay audit as local agents.

The live example agent lives in:

```text
arena/agents/httpExampleAgent.ts
```

Useful checks:

```text
npm.cmd run arena:http-client
npm.cmd run arena:http-example
npm.cmd run arena:http-match
```

This is not an Arena Agent API server. It is only a local example proving that an external process can participate through the current runner boundary.

## Replay Audit

`npm.cmd run arena:local` writes:

```text
arena/replays/arena-local-match.jsonl
```

`npm.cmd run arena:http-match` writes:

```text
arena/replays/arena-http-mixed-match.jsonl
```

Current replay event types:

- `replay_metadata`;
- `match_start`;
- `tick`;
- `match_end`.

Each tick decision records:

- observation;
- action or `null`;
- `inputValidation`;
- `validation`;
- intent or `null`.

If raw input validation fails, then `action`, `validation`, and `intent` are all `null`.

If input validation passes but game validation fails, then the action is recorded for audit, but no OpenFront intent is sent.

Replay parsing and semantic checks live in:

```text
arena/runner/src/replayReader.ts
arena/runner/src/replaySemanticValidation.ts
```

The local replay can be checked with:

```text
npm.cmd run arena:replay
```

## All Checks

Run all current runner checks with:

```text
npm.cmd run arena:check
```

Use `docs/RUNNER_CHECKS.md` for the full command list.
