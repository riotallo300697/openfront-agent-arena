# Runner Overview

This document summarizes the current OpenFront Agent Arena runner path.

The runner is still local-only. It now has a local Arena API server, local WebSocket spectator event stream, lightweight local TypeScript/Python SDK helpers, and a first read-only MCP adapter slice. It does not expose frontend, database, ratings, or tournaments yet.

No OpenFront core game rules are changed by the runner work.

## Current Goal

The current runner proves this path:

```text
headless OpenFront game -> local agents -> validated actions -> OpenFront intents -> JSONL replay
```

The current direction is a minimal local Arena API server. Its contract is documented in `docs/ARENA_API_SERVER_CONTRACT.md`. The server can now run a synchronous two-agent HTTP match through `POST /arena/matches`, read completed in-memory records through simple `GET` endpoints, and stream spectator events through `ws://.../arena/events`.

The first SDK helpers are local-only and live in `arena/sdk/typescript/arenaClient.ts` and `arena/sdk/python/arena_client.py`. They wrap the current server contract without introducing published packages or a new API shape.

Agent-facing rules are documented in `docs/AGENT_RULES.md`.

The first MCP adapter slice lives in `arena/mcp/openfront-arena-mcp`. It exposes only read-only rules access through `openfront_get_rules` and `openfront://rules`.

## Main Commands

Run all current runner checks:

```text
npm.cmd run arena:check
```

Run the local baseline-agent match:

```text
npm.cmd run arena:local
```

Check the generated replay:

```text
npm.cmd run arena:replay
```

Individual checks are documented in:

```text
docs/RUNNER_CHECKS.md
```

The planned local server contract is documented in:

```text
docs/ARENA_API_SERVER_CONTRACT.md
```

## Main Modules

Current runner files live in:

```text
arena/runner/src
```

Important modules:

- `headless.ts`: creates a headless OpenFront `GameRunner` using the local test map;
- `localMatchConfig.ts`: local match settings, players, agents, supported actions, and agent decision timeout;
- `httpMixedMatchConfig.ts`: mixed HTTP/local match settings, players, agent names, spawn points, and runner marker;
- `baselineAgents.ts`: built-in baseline agents;
- `observation.ts`: builds `AgentObservation`;
- `arena/agents/httpExampleAgent.ts`: live HTTP example agent for local smoke checks;
- `agentContractSchema.ts`: JSON Schema objects for observation and action payloads;
- `agentContractValidation.ts`: runtime shape checks for observation and action payloads;
- `agentActionInput.ts`: turns an unknown raw action value into accepted `AgentAction` or a rejection reason;
- `httpAgentClient.ts`: HTTP client skeleton for future external agents, checked with mocked fetch only;
- `actionValidation.ts`: checks whether a contract-valid action is legal in the current game situation;
- `intentAdapter.ts`: converts accepted `AgentAction` values into OpenFront intents;
- `agentTurnPipeline.ts`: combines observation, agent decision, validation, intent creation, and replay decision output;
- `arena/server/src/arenaApiServer.ts`: local Arena API server skeleton with `GET /arena/health` and synchronous `POST /arena/matches`;
- `arena/server/src/arenaHttpMatchRunner.ts`: runs validated two-agent HTTP matches through the shared runner and replay helpers;
- `arena/server/src/arenaApiEvents.ts`: local spectator event types and decision-to-event conversion;
- `arena/server/src/arenaApiSpectatorClientExample.ts`: simple manual WebSocket spectator client;
- `arena/server/src/arenaMatchRequestValidation.ts`: validates minimal local Arena match requests before match execution exists;
- `arena/sdk/typescript/arenaClient.ts`: local TypeScript SDK helper for Arena API server REST calls and spectator events;
- `arena/sdk/typescript/arenaClientSmoke.ts`: checks the local TypeScript SDK helper against a live local server and example agents;
- `arena/sdk/python/arena_client.py`: local Python SDK helper for Arena API server REST calls;
- `arena/sdk/python/arenaClientSmoke.ts`: starts a live local server and example agents, then runs the Python SDK smoke check;
- `arena/sdk/python/arena_client_smoke.py`: checks the Python SDK helper against live local endpoints;
- `arena/mcp/openfront-arena-mcp/src/server.ts`: local MCP adapter server factory and stdio entrypoint;
- `arena/mcp/openfront-arena-mcp/src/rules.ts`: embedded read-only MCP rules summary;
- `arena/mcp/openfront-arena-mcp/src/smoke.ts`: checks the MCP tool/resource over the official SDK in-memory transport;
- `matchLoop.ts`: runs the shared per-turn loop for current replay-writing matches;
- `matchResult.ts`: builds shared match result objects and converts them to replay `match_end` events;
- `agentStateAssertions.ts`: shared final-agent state assertions for match and replay checks;
- `localMatch.ts`: runs the baseline-agent match and writes replay events;
- `replayLifecycle.ts`: builds shared replay agent lists and writes common replay start/end events;
- `replayLifecycleSmoke.ts`: checks replay lifecycle event construction directly;
- `replayWriter.ts`: writes JSONL replay events;
- `replayReader.ts`: reads JSONL replay events and checks known event types;
- `replayReaderSmoke.ts`: checks replay reader success and malformed replay rejection cases;
- `replaySemanticValidation.ts`: checks replay metadata, match start, tick sequence, decision audit fields, and final result for any current runner replay;
- `replaySmoke.ts`: checks the local baseline replay through the shared replay semantic validator.

Focused smoke files such as `matchLoopSmoke.ts`, `matchResultSmoke.ts`, and `agentStateAssertionsSmoke.ts` are listed in `docs/RUNNER_CHECKS.md`.

## Agent Decision Path

For each player on each turn, the runner uses this flow:

```text
build observation
  -> call agent.decide(observation)
  -> handle throw/reject/timeout
  -> parse raw action input
  -> validate action against game state
  -> convert accepted action to OpenFront intent
  -> write replay decision audit
```

The pipeline accepts both:

- current synchronous local agents;
- future async external clients that return `Promise<unknown>`.

The current `HttpAgentClient` is one such external-client skeleton. It sends `{ observation }` to an endpoint and expects `{ action }` back, but current checks use mocked fetch and do not start a server.

The current live HTTP example agent starts a local `/decide` endpoint during `npm.cmd run arena:http-example`. It proves the client and pipeline can talk to a real local HTTP endpoint, then closes the server.

For manual Arena API server demos, `npm.cmd run arena:http-example-server` keeps two example `/decide` agents running on `127.0.0.1:5001` and `127.0.0.1:5002`. `npm.cmd run arena:http-example-server-smoke` checks that launcher path on random ports and closes the agents automatically.

`npm.cmd run arena:http-match` goes one step further: it runs a small headless match with one live HTTP example agent and one built-in baseline agent. It writes `arena/replays/arena-http-mixed-match.jsonl` with `runner: "mixed-http-local"`.

Mixed match settings are checked by `npm.cmd run arena:http-match-config`.

The mixed match smoke check reads its generated replay back through the same replay semantic validator used by the local replay smoke check.

The local baseline match and mixed HTTP/local match now use the same `matchLoop.ts` helper for the repeated turn cycle: ask each agent for a decision, collect intents, execute one tick, write one replay tick event, and return match counters.

Both match paths also use `matchResult.ts` to build final result data from loop counters and final agent summaries before writing `match_end`.

If an agent fails, times out, or returns malformed action data, the match can continue. The decision is rejected and no OpenFront intent is sent.

## Current Observation

The current `AgentObservation` is intentionally small:

- current tick;
- own client ID and name;
- own spawn status;
- own owned tile count;
- public player list with IDs, names, alive status, spawn status, and owned tile counts.

The current observation contract is checked by:

```text
npm.cmd run arena:observation
```

## Current Actions

The current `AgentAction` union supports:

- `spawn`;
- `wait`;
- `attack` against neutral territory.

Action handling has two layers:

- input validation: does the raw value match the current `AgentAction` contract?
- game validation: is the contract-valid action legal right now?

The input boundary is checked by:

```text
npm.cmd run arena:action-input
```

The game validation rules are checked by:

```text
npm.cmd run arena:validate
```

## Replay

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

The first event records runner settings such as:

- match ID;
- runner kind;
- map label;
- max tick count;
- agent decision timeout;
- agents;
- supported actions.

Each tick decision records:

- observation;
- action or `null`;
- `inputValidation`;
- `validation`;
- intent or `null`.

Replay files first pass through `arena/runner/src/replayReader.ts`, which rejects malformed JSONL, non-object lines, and unknown event types. The reader boundary is checked by `npm.cmd run arena:replay-reader`.

Both current replay files are then checked by the shared semantic validator in `arena/runner/src/replaySemanticValidation.ts`. That keeps local replay and mixed HTTP/local replay expectations aligned.

Both current match paths also use `arena/runner/src/replayLifecycle.ts` for common replay agent lists plus `replay_metadata`, `match_start`, and `match_end` event construction.

Final agent state checks use `arena/runner/src/agentStateAssertions.ts`, so live match checks and replay semantic checks agree on the same rule: expected agents must exist, have spawned, be alive, and own tiles.

Replay details are also documented in:

```text
docs/AGENT_API.md
```

## Current Local Match Contract

The local baseline-agent match is successful when:

- it reaches configured max ticks;
- both baseline agents spawn;
- both baseline agents stay alive;
- both baseline agents own tiles at the end;
- at least one attack intent is accepted;
- no built-in baseline-agent decisions are rejected;
- replay metadata, tick sequence, and match result pass replay smoke checks.

The local result contract is documented in:

```text
docs/LOCAL_MATCH_RESULT.md
```

## What This Does Not Do Yet

The current runner does not yet include:

- HTTP Agent API server;
- WebSocket spectator events;
- frontend;
- MCP adapter;
- database storage;
- rating or leaderboard;
- tournaments;
- full visual replay viewer.

Those are later stages.
