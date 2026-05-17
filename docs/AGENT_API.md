# Agent API

This document describes the current agent-facing contract for OpenFront Agent Arena.

Current status: the local Arena API server can run a synchronous two-agent HTTP match through `POST /arena/matches`, read completed match records through `GET` endpoints, optionally persist completed records through a local JSONL match store or PostgreSQL match store, create and join in-memory local sessions for future pull-style agents, and stream live spectator events through local WebSocket `GET /arena/events`. It also has a first read-only local MCP adapter slice for rules access. It is still localhost-only and does not expose a public HTTP server, frontend, ratings, or tournaments.

The proposed first PostgreSQL schema for Stage 12 is documented in:

```text
docs/POSTGRES_SCHEMA_PROPOSAL.md
```

Local PostgreSQL setup and migration commands are documented in:

```text
docs/POSTGRES_LOCAL_SETUP.md
```

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
docs/AGENT_RULES.md
docs/RUNNER_OVERVIEW.md
docs/RUNNER_CHECKS.md
docs/ARENA_API_SERVER_CONTRACT.md
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

The planned minimal local Arena API server contract is documented in:

```text
docs/ARENA_API_SERVER_CONTRACT.md
```

## Arena API Server Examples

Start the local Arena API server:

```text
$env:ARENA_API_PORT="5000"
npm.cmd run arena:server
```

The command prints the local server URL, for example `http://127.0.0.1:5000`.

In a second terminal, start two local example agents:

```text
npm.cmd run arena:http-example-server
```

This starts:

- `http://127.0.0.1:5001/decide`;
- `http://127.0.0.1:5002/decide`.

Check health:

```text
curl.exe http://127.0.0.1:5000/arena/health
```

Run a two-agent HTTP match. Both agent endpoints must already be running locally and must answer `POST /decide` with `{ "action": ... }`.

```text
curl.exe -X POST http://127.0.0.1:5000/arena/matches ^
  -H "content-type: application/json" ^
  -d "{\"matchID\":\"arena-api-curl-smoke\",\"map\":\"tests/testdata/maps/plains\",\"maxTicks\":12,\"agentDecisionTimeoutMs\":1000,\"agents\":[{\"clientID\":\"agent-a\",\"name\":\"AgentA\",\"endpoint\":\"http://127.0.0.1:5001/decide\",\"spawn\":{\"x\":10,\"y\":10}},{\"clientID\":\"agent-b\",\"name\":\"AgentB\",\"endpoint\":\"http://127.0.0.1:5002/decide\",\"spawn\":{\"x\":30,\"y\":30}}]}"
```

Read the completed match, final result, and replay metadata:

```text
curl.exe http://127.0.0.1:5000/arena/matches
curl.exe http://127.0.0.1:5000/arena/matches/arena-api-curl-smoke
curl.exe http://127.0.0.1:5000/arena/matches/arena-api-curl-smoke/result
curl.exe http://127.0.0.1:5000/arena/matches/arena-api-curl-smoke/replay
```

Completed match records include both the final runner result and the original match metadata needed for persistence: `map`, `maxTicks`, `agentDecisionTimeoutMs`, `runner`, and the request `agents` list.

## WebSocket Spectator Events

HTTP remains the main control path:

- `POST /arena/matches` starts and runs a match;
- each agent still answers Arena through its own HTTP `/decide` endpoint.

WebSocket is currently spectator-only. It lets a local client watch match events as they happen, but it does not accept agent actions.

Connect to:

```text
ws://127.0.0.1:5000/arena/events
```

Manual spectator example:

```text
$env:ARENA_API_URL="http://127.0.0.1:5000"
npm.cmd run arena:server-spectator
```

Current event types:

- `match.started`;
- `action.accepted`;
- `action.rejected`;
- `match.tick`;
- `match.ended`.

## Local TypeScript SDK Example

The first Stage 9 SDK slice is a local lightweight TypeScript helper, not a published npm package.

It lives in:

```text
arena/sdk/typescript/arenaClient.ts
```

Usage notes live in:

```text
arena/sdk/typescript/README.md
```

It wraps the current local Arena API server:

- `health()`;
- `createMatch(request)`;
- `listMatches()`;
- `getMatch(matchID)`;
- `getResult(matchID)`;
- `getReplay(matchID)`;
- `connectEvents(...)`;
- `createEventCollector(...)`.

The helper uses the same current request and response shapes documented above. It does not introduce a new Agent API format, package boundary, authentication layer, frontend, database, or public endpoint.

The SDK smoke check starts a local Arena API server, starts local example agents, creates a match through the SDK, verifies list/read/result/replay methods, and checks the spectator event stream:

```text
npm.cmd run arena:sdk-typescript-smoke
```

## Local Python SDK Example

The second Stage 9 SDK slice is a local lightweight Python helper, not a published PyPI package.

It lives in:

```text
arena/sdk/python/arena_client.py
```

Usage notes live in:

```text
arena/sdk/python/README.md
```

It wraps the current local Arena API server REST endpoints:

- `health()`;
- `create_match(request)`;
- `list_matches()`;
- `get_match(match_id)`;
- `get_result(match_id)`;
- `get_replay(match_id)`.

The Python smoke check starts a local Arena API server and local example agents through the existing TypeScript helpers, then verifies the Python client against the live local server:

```text
npm.cmd run arena:sdk-python-smoke
```

Python WebSocket spectator helpers are intentionally not included yet. They should be a later small slice after choosing whether to add a Python WebSocket dependency or keep Python SDK REST-only for now.

## Local MCP Adapter

The first Stage 11 MCP adapter slice lives in:

```text
arena/mcp/openfront-arena-mcp
```

It uses the official TypeScript MCP SDK and currently exposes:

- tool: `openfront_get_rules`;
- tool: `openfront_list_matches`;
- tool: `openfront_get_match_status`;
- tool: `openfront_get_result`;
- tool: `openfront_get_replay_metadata`;
- resource: `openfront://rules`.

The current MCP adapter is intentionally read-only. It does not expose shell access, filesystem access, direct replay file reads, direct OpenFront core access, or agent action tools. `openfront_get_replay_metadata` returns the Arena API replay metadata and path only; it does not read JSONL replay contents.

The match tools call the configured local Arena API server through HTTP. Set:

```text
$env:ARENA_API_URL="http://127.0.0.1:5000"
```

Only localhost HTTP Arena API URLs are accepted. The MCP smoke check covers this boundary and also verifies that missing matches are returned as MCP tool errors.

Future MCP action/session tools are not implemented yet. Their proposed design gate is documented in:

```text
docs/MCP_SESSION_MODEL.md
```

Those tools should wait for explicit Arena API session endpoints instead of putting match/session state inside the MCP adapter.

The first Arena API session endpoints now exist for session lifecycle only:

```text
GET /arena/sessions
POST /arena/sessions
GET /arena/sessions/:sessionID
POST /arena/sessions/:sessionID/agents
GET /arena/sessions/:sessionID/agents/:clientID/observation
POST /arena/sessions/:sessionID/agents/:clientID/actions
```

The observation endpoint currently returns `no_pending_action` for joined agents that do not have an internal pending ticket. A minimal in-memory pending ticket model now covers the internal smoke happy path: `GET observation -> POST matching turnID -> accepted`, and the accepted submission consumes the ticket. This does not create live runner tickets, expose live game observations, apply submitted actions, advance gameplay, write pull-style replay audit events, or add MCP action tools. Timeout handling, replay audit for pull-style actions, and MCP action tools are still deferred.

The read-only Stage 11 MCP closure review is documented in:

```text
docs/MCP_STAGE11_REVIEW.md
```

The post-Stage 11 architecture choice is documented in:

```text
docs/POST_STAGE11_ARCHITECTURE_DECISION.md
```

Useful commands:

```text
npm.cmd run arena:mcp
npm.cmd run arena:mcp-smoke
```

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

The replay reader boundary can be checked with:

```text
npm.cmd run arena:replay-reader
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
