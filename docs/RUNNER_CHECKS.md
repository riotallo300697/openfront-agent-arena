# Runner Checks

This document lists the current OpenFront Agent Arena runner checks.

All checks are local runner checks. They do not modify OpenFront core game rules.

For the current runner architecture and agent decision path, see `docs/RUNNER_OVERVIEW.md`.

## Combined Check

```text
npm.cmd run arena:check
```

Runs the current safe runner check suite in order:

1. `arena:config`
2. `arena:agent-state`
3. `arena:contract`
4. `arena:action-input`
5. `arena:pipeline`
6. `arena:match-loop`
7. `arena:match-result`
8. `arena:replay-lifecycle`
9. `arena:replay-reader`
10. `arena:http-client`
11. `arena:http-example`
12. `arena:http-example-server-smoke`
13. `arena:http-match-config`
14. `arena:http-match`
15. `arena:server-smoke`
16. `arena:server-events-smoke`
17. `arena:sdk-typescript-smoke`
18. `arena:sdk-python-smoke`
19. `arena:mcp-smoke`
20. `arena:validate`
21. `arena:observation`
22. `arena:intent`
23. `arena:local`
24. `arena:replay`
25. `arena:smoke`

Use this after each implementation package.

## Individual Checks

```text
npm.cmd run arena:config
```

Checks `arena/runner/src/localMatchConfig.ts` before a match runs. It verifies that the match ID and map label are present, max tick count is positive, agent decision timeout is positive, players are configured, player client IDs are unique, every player has an agent, there are no extra agents, and supported actions are present.

```text
npm.cmd run arena:agent-state
```

Checks `arena/runner/src/agentStateAssertions.ts`. It verifies that valid final agent summaries pass and that missing, unspawned, tile-less, or dead final agents are rejected.

```text
npm.cmd run arena:contract
```

Checks the current local agent contract. It verifies that the runner exports JSON Schema objects for `AgentObservation` and `AgentAction`, accepts valid observation/action examples, and rejects common malformed payloads.

The current JSON Schema objects live in `arena/runner/src/agentContractSchema.ts`. The small runtime shape checker lives in `arena/runner/src/agentContractValidation.ts`.

```text
npm.cmd run arena:action-input
```

Checks the current raw action input parser. This is the small boundary layer for future external agent payloads: it accepts an `unknown` value and returns either a safe `AgentAction` or a clear rejection reason.

The parser lives in `arena/runner/src/agentActionInput.ts`.

```text
npm.cmd run arena:pipeline
```

Checks the local agent turn pipeline. This is the small shared flow that builds an observation, receives raw or async agent output, runs input validation, runs game-state validation, creates an OpenFront intent when allowed, and returns one replay-ready decision.

The pipeline lives in `arena/runner/src/agentTurnPipeline.ts`. The smoke check includes a mocked async `ExternalAgentClient` so future external-agent wiring has a contract to reuse.

It also checks agent failure handling: thrown errors and timed-out decisions become rejected replay decisions instead of crashing the match. The local match timeout value is configured in `localMatchConfig.agentDecisionTimeoutMs`.

```text
npm.cmd run arena:match-loop
```

Checks the shared replay-writing match loop in `arena/runner/src/matchLoop.ts`. It runs a small headless match with one normal baseline agent and one agent that returns one malformed action before spawning normally. The check verifies decisions, intents, accepted attack intents, rejected action counting, tick count, and update count.

```text
npm.cmd run arena:match-result
```

Checks `arena/runner/src/matchResult.ts`. It verifies common replay result building, local result building with supported actions, and conversion to a replay `match_end` event.

```text
npm.cmd run arena:replay-lifecycle
```

Checks `arena/runner/src/replayLifecycle.ts`. It verifies replay agent list building, replay metadata/start writing, match-end event construction, and reading the generated lifecycle replay back.

```text
npm.cmd run arena:replay-reader
```

Checks `arena/runner/src/replayReader.ts`. It verifies that valid JSONL replay events can be read and that malformed JSONL, non-object lines, and unknown replay event types are rejected before semantic replay checks run.

```text
npm.cmd run arena:http-client
```

Checks the current HTTP agent client skeleton with mocked fetch responses. It verifies that the client sends `{ observation }`, returns raw `{ action }` into the existing pipeline, and converts HTTP errors or malformed response bodies into rejected agent decisions.

This check does not start a server and does not make real network calls.

The client lives in `arena/runner/src/httpAgentClient.ts`.

```text
npm.cmd run arena:http-example
```

Starts the live HTTP example agent on a local random port, calls `/decide` through `HttpAgentClient`, verifies the first `spawn` decision, advances the headless game, verifies a later `wait` decision, and closes the server.

The example agent lives in `arena/agents/httpExampleAgent.ts`.

This is not an Arena Agent API server. It is only a small external-agent example used by the runner smoke check.

For manual Arena API server demos, use:

```text
npm.cmd run arena:http-example-server
```

That command keeps two example `/decide` agents running on `127.0.0.1:5001` and `127.0.0.1:5002` until the process is stopped. It is not part of `npm.cmd run arena:check` because it is a long-running manual helper.

```text
npm.cmd run arena:http-example-server-smoke
```

Checks the manual demo launcher without leaving a long-running process behind. It starts two example agents on random local ports, calls both `/decide` endpoints, verifies their `spawn` responses, and closes them. This smoke check is included in `npm.cmd run arena:check`.

```text
npm.cmd run arena:http-match-config
```

Checks `arena/runner/src/httpMixedMatchConfig.ts` before the mixed HTTP/local match runs. It verifies match ID, runner marker, map label, max tick count, timeout, players, supported actions, agent ownership, and spawn points.

```text
npm.cmd run arena:http-match
```

Runs a small headless match with one live HTTP example agent and one built-in baseline agent. It verifies that both agents make accepted decisions across multiple ticks, spawn, stay alive, and own tiles.

It writes and checks `arena/replays/arena-http-mixed-match.jsonl`, whose metadata uses `runner: "mixed-http-local"`.

The generated replay is checked with the shared replay semantic validator, the same helper used by `arena:replay` for the local baseline replay.

The repeated match turn loop is shared with the local baseline match through `arena/runner/src/matchLoop.ts`.

This check starts and closes the HTTP example agent locally. It does not start an Arena Agent API server.

```text
npm.cmd run arena:server-smoke
```

Starts the local Arena API server skeleton on a random localhost port, checks `GET /arena/health`, checks the shared error shape for an unknown route, checks method rejection on existing routes, checks invalid JSON, checks oversized request body rejection, checks invalid `POST /arena/matches` request validation, checks localhost-only endpoint validation, runs a valid two-agent HTTP match through `POST /arena/matches`, checks `409 match_already_exists` for a repeated `matchID`, checks the completed response and replay audit for unreachable local agent endpoints, validates the generated successful-match replay, checks `GET /arena/matches`, `GET /arena/matches/:matchID`, `GET /arena/matches/:matchID/result`, and `GET /arena/matches/:matchID/replay`, and closes the server.

The server entrypoint lives in `arena/server/src/arenaApiServer.ts`.
The match request validator lives in `arena/server/src/arenaMatchRequestValidation.ts`.
The API HTTP match runner lives in `arena/server/src/arenaHttpMatchRunner.ts`.

For manual local startup, use:

```text
npm.cmd run arena:server
```

The planned follow-up read endpoints are documented in `docs/ARENA_API_SERVER_CONTRACT.md`.

```text
npm.cmd run arena:server-events-smoke
```

Starts the local Arena API server and two local HTTP example agents, connects a WebSocket spectator to `ws://127.0.0.1:<port>/arena/events`, verifies that spectator connections are read-only, runs a short HTTP match, and checks live `match.started`, `action.accepted`, `match.tick`, and `match.ended` events.

The WebSocket endpoint is spectator-only. It does not replace the current HTTP `/decide` agent path.

```text
npm.cmd run arena:sdk-typescript-smoke
```

Starts the local Arena API server and two local HTTP example agents, then uses `arena/sdk/typescript/arenaClient.ts` to check `health`, `createMatch`, `listMatches`, `getMatch`, `getResult`, `getReplay`, and the spectator event collector for `ws://.../arena/events`.

This is a local lightweight SDK helper smoke check, not a published npm package check.

```text
npm.cmd run arena:sdk-python-smoke
```

Starts the local Arena API server and two local HTTP example agents through the existing TypeScript helpers, then runs `arena/sdk/python/arena_client_smoke.py` against those live local endpoints. It checks the local Python REST helper methods: `health`, `create_match`, `list_matches`, `get_match`, `get_result`, and `get_replay`.

This is a local lightweight SDK helper smoke check, not a published PyPI package check. Python WebSocket spectator helpers are not part of this check yet.

```text
npm.cmd run arena:mcp-smoke
```

Checks the local MCP adapter under `arena/mcp/openfront-arena-mcp`. It uses the official MCP SDK client and in-memory transport to verify read-only tools:

- `openfront_get_rules`;
- `openfront_list_matches`;
- `openfront_get_match_status`;
- `openfront_get_result`.

It also verifies the `openfront://rules` resource.

The MCP adapter smoke starts a local Arena API server inside the check so it can verify match read tools. The adapter does not read local files, does not expose shell access, and does not touch `src/core`.

```text
npm.cmd run arena:validate
```

Checks local `AgentAction` validation rules without running a full match. It covers accepted `wait`, `spawn`, and `attack` cases, plus common rejected cases.

```text
npm.cmd run arena:observation
```

Checks the current `AgentObservation` contract against a real headless runner before and after spawn.

```text
npm.cmd run arena:intent
```

Checks the local adapter from `AgentAction` to OpenFront intents. It verifies `spawn`, `wait`, and neutral `attack`.

```text
npm.cmd run arena:local
```

Runs the local baseline-agent match, prints the final `LocalMatchResult`, and writes the JSONL replay.

The repeated match turn loop is shared with the mixed HTTP/local match through `arena/runner/src/matchLoop.ts`.

```text
npm.cmd run arena:replay
```

Checks the generated local JSONL replay. It verifies metadata, match start, tick events, validation records, tick sequence, final tick count, final baseline-agent summaries, and the local match result contract.

The metadata check includes local runner settings such as `maxTicks` and `agentDecisionTimeoutMs`.

The common replay start and end events are built through `arena/runner/src/replayLifecycle.ts` in both the local and mixed HTTP/local match paths.

Final agent state assertions are shared through `arena/runner/src/agentStateAssertions.ts`.

For each decision in a tick event, the check verifies both audit layers:

- `inputValidation`: raw action input contract check;
- `validation`: game-state action check, or `null` when input validation failed.

The check reads the typed replay event union from `arena/runner/src/types.ts`. `arena/runner/src/replayReader.ts` handles JSONL parsing and known event type checks before `arena/runner/src/replaySemanticValidation.ts` runs semantic replay checks. The mixed HTTP/local match smoke uses the same semantic validator for its generated replay.

```text
npm.cmd run arena:smoke
```

Checks headless OpenFront core feasibility through direct core execution and `GameRunner` turns.

## Current Rule

After runner changes, run:

```text
npm.cmd run arena:check
```

When a check is added or changed, update this document and `docs/DEVELOPMENT_LOG.md`.
