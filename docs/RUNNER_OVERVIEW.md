# Runner Overview

This document summarizes the current OpenFront Agent Arena runner path.

The runner is still local-only. It does not expose an HTTP server, WebSocket, MCP, frontend, database, ratings, or tournaments yet.

No OpenFront core game rules are changed by the runner work.

## Current Goal

The current runner proves this path:

```text
headless OpenFront game -> local agents -> validated actions -> OpenFront intents -> JSONL replay
```

The next planned direction is an external Agent API, but the current code only prepares safe runner boundaries for it.

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
- `localMatch.ts`: runs the baseline-agent match and writes replay events;
- `replayWriter.ts`: writes JSONL replay events;
- `replayReader.ts`: reads JSONL replay events and checks known event types;
- `replaySmoke.ts`: checks replay metadata, tick sequence, decision audit fields, and final result.

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

`npm.cmd run arena:http-match` goes one step further: it runs a small headless match with one live HTTP example agent and one built-in baseline agent. It writes `arena/replays/arena-http-mixed-match.jsonl` with `runner: "mixed-http-local"`.

Mixed match settings are checked by `npm.cmd run arena:http-match-config`.

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

Replay details are also documented in:

```text
docs/AGENT_API.md
docs/LOCAL_MATCH_RESULT.md
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

The result contract is documented in:

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
