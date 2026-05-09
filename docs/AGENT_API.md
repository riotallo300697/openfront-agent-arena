# Agent API

This document will describe how agents connect to OpenFront Agent Arena.

Current status: placeholder for a future stage.

The Agent API is not implemented yet. We first need to research whether OpenFront core can run without the browser.

Expected future topics:

- observation format;
- action format;
- validation rules;
- local HTTP API;
- WebSocket or live event format;
- examples for external agents.

## Current Local Prototype

The first local prototype is not an external API yet.

`npm run arena:local` runs two built-in agents inside the same Node.js process. Each agent receives a very small observation:

- current tick;
- own client ID and name;
- whether it has spawned;
- owned tile count;
- basic public data for all players.

The first supported local actions are:

- `spawn`;
- `wait`;
- `attack` against neutral territory.

This is intentionally small. It proves the runner can ask agents for decisions and convert those decisions into OpenFront turns.

The current local match settings live in `arena/runner/src/localMatchConfig.ts` as `LocalMatchConfig`. For now this is just a local TypeScript config object, not an external config system.

Current local match settings include:

- match ID;
- map label;
- max tick count;
- agent decision timeout in milliseconds;
- players;
- built-in agents;
- supported action types.

The local match config can be checked without running a match:

```text
npm.cmd run arena:config
```

The current local TypeScript shapes live in:

```text
arena/runner/src/types.ts
```

This includes two agent caller shapes:

- `LocalAgent`: built-in agent used by the local runner;
- `ExternalAgentClient`: future external-agent boundary with async `decide(observation): Promise<unknown>`.

`ExternalAgentClient` is not an HTTP client yet. It is only the small TypeScript contract that lets the runner wait for an external decision later.

The first HTTP client skeleton lives in:

```text
arena/runner/src/httpAgentClient.ts
```

It implements `ExternalAgentClient` by sending:

```text
POST <endpoint>
{ observation }
```

It expects a JSON response shaped like:

```text
{ action }
```

The returned `action` is still treated as raw `unknown` and goes through the normal action input parser and game validation.

The HTTP client skeleton can be checked without real network calls:

```text
npm.cmd run arena:http-client
```

This command uses mocked fetch responses. It does not start an HTTP server.

The first live HTTP example agent lives in:

```text
arena/agents/httpExampleAgent.ts
```

It exposes a local `/decide` endpoint for smoke checks. The endpoint accepts `{ observation }` and returns `{ action }`.

The live example can be checked with:

```text
npm.cmd run arena:http-example
```

This check starts the example agent on a local random port, calls it through `HttpAgentClient`, verifies a `spawn` decision, advances the headless game, verifies a later `wait` decision, and closes the server. It is an example agent server, not an Arena Agent API server.

The live HTTP example agent can also participate in a small mixed match:

```text
npm.cmd run arena:http-match
```

This check runs one HTTP example agent through `HttpAgentClient` and one built-in baseline agent in the same headless match loop. It verifies that both agents make decisions across multiple ticks, spawn, stay alive, and own tiles.

Mixed match settings live in:

```text
arena/runner/src/httpMixedMatchConfig.ts
```

They can be checked directly:

```text
npm.cmd run arena:http-match-config
```

It also writes and checks a mixed-match replay:

```text
arena/replays/arena-http-mixed-match.jsonl
```

The mixed replay uses `runner: "mixed-http-local"` in `replay_metadata`.

The current local JSON Schema contract lives in:

```text
arena/runner/src/agentContractSchema.ts
```

It currently describes two payloads:

- `AgentObservation`: what the runner gives to an agent;
- `AgentAction`: what an agent gives back to the runner.

The schema contract can be checked without running a match:

```text
npm.cmd run arena:contract
```

This check accepts valid examples and rejects malformed examples such as unknown action types, extra fields, bad spawn coordinates, bad attack targets, and observation objects with unexpected fields.

The current runtime shape checker lives in:

```text
arena/runner/src/agentContractValidation.ts
```

This checker is intentionally small. It protects the current local contract before the future HTTP Agent API exists.

The current raw action input parser lives in:

```text
arena/runner/src/agentActionInput.ts
```

It accepts an `unknown` value and returns either:

- an accepted, safe `AgentAction`;
- or a rejected result with a path and human-readable reason.

This is the first small boundary layer for future external agent payloads. It does not start an HTTP server yet.

The parser can be checked directly:

```text
npm.cmd run arena:action-input
```

The current local agent turn pipeline lives in:

```text
arena/runner/src/agentTurnPipeline.ts
```

It combines the current decision flow:

```text
observation -> raw or async agent output -> input validation -> game validation -> intent -> replay decision
```

The pipeline accepts both current synchronous local agents and future asynchronous external clients.

The pipeline also protects the match from agent-side failures:

- if `decide` throws or rejects, the decision is rejected with `path: "agent.decide"`;
- if `decide` takes longer than `localMatchConfig.agentDecisionTimeoutMs`, the decision is rejected with a timeout reason;
- failed agent decisions produce no action, no game validation, and no OpenFront intent.

The pipeline can be checked directly:

```text
npm.cmd run arena:pipeline
```

The current local observation builder lives in:

```text
arena/runner/src/observation.ts
```

The observation contract can be checked without running the full local baseline match:

```text
npm.cmd run arena:observation
```

The current built-in baseline agents live in:

```text
arena/runner/src/baselineAgents.ts
```

The current local adapter from Agent Arena actions to OpenFront intents lives in:

```text
arena/runner/src/intentAdapter.ts
```

The adapter can be checked directly:

```text
npm.cmd run arena:intent
```

This verifies that `spawn` creates a spawn intent, `wait` creates no intent, and `attack` creates an attack intent against neutral territory.

The current local replay summary builder lives in:

```text
arena/runner/src/replaySummary.ts
```

The current local match result contract is documented in:

```text
docs/LOCAL_MATCH_RESULT.md
```

## Current Local Action Validation

The local runner now validates each built-in agent action before converting it into an OpenFront intent.

The current local validation rules live in:

```text
arena/runner/src/actionValidation.ts
```

Current validation rules:

- `wait` is always accepted;
- `spawn` is rejected if the agent has already spawned;
- `spawn` coordinates must be whole numbers;
- `spawn` coordinates must be inside the map;
- `attack` is rejected if the agent has not spawned yet;
- `attack.troops` must be `null` or a non-negative number.

Rejected action input and rejected game actions are written to the replay, but they are not sent into OpenFront.

The validator can be checked without running a full match:

```text
npm.cmd run arena:validate
```

All current Agent Arena runner checks can be run together:

```text
npm.cmd run arena:check
```

This currently runs local match config smoke, agent contract smoke, raw action input smoke, agent turn pipeline smoke, HTTP agent client smoke, live HTTP example-agent smoke, mixed HTTP/local match config smoke, mixed HTTP/local match smoke, action validation, observation smoke, intent adapter smoke, the local baseline-agent match, replay smoke, and the headless smoke check.

The runner checks are summarized in:

```text
docs/RUNNER_CHECKS.md
```

The current runner path is summarized in:

```text
docs/RUNNER_OVERVIEW.md
```

## Current Local Replay

`npm run arena:local` writes a simple JSONL replay file to:

```text
arena/replays/arena-local-match.jsonl
```

Each line is one JSON object.

Current event types:

- `replay_metadata`;
- `match_start`;
- `tick`;
- `match_end`.

The current TypeScript replay event union lives in:

```text
arena/runner/src/types.ts
```

The current JSONL replay reader lives in:

```text
arena/runner/src/replayReader.ts
```

It parses the replay file and checks that each line is an object with a known replay event `type`.

Current event shapes:

```text
replay_metadata: format, version, matchID, runner, map, seed, maxTicks, agentDecisionTimeoutMs, agents, supportedActions
match_start: matchID, map, maxTicks, agents, supportedActions
tick: tick, turnNumber, decisions, intents, summary, updateCount
match_end: matchID, ticks, updates, attackIntents, rejectedActions, agents
```

The first line is always `replay_metadata`. It records the current debug replay format, format version, match ID, runner kind, map label, seed value, max tick count, agent decision timeout, agents, and supported actions. The current local runner has no explicit seed, so this field is written as `null`.

Each `tick` event includes a compact `summary` field for every local agent:

- agent name;
- client ID;
- whether the agent has spawned;
- owned tile count;
- whether the agent is alive.

Each decision includes two audit fields:

- `inputValidation`: checks whether the raw action input matches the current `AgentAction` contract;
- `validation`: checks whether a contract-valid action is legal in the current game situation.

If `inputValidation` is rejected, then `action` is `null`, `validation` is `null`, and `intent` is `null`.

If `inputValidation` is accepted but `validation` is rejected, then the action is recorded for audit, but no OpenFront intent is created.

The local replay file can be checked after running `arena:local`:

```text
npm.cmd run arena:replay
```

This check parses the JSONL file and verifies the basic debug replay shape: first metadata record, match start, tick records with decisions, input validation, game validation, match end, matching tick counts, ordered tick sequence, final baseline-agent summaries, and the current local match result contract. It also checks that `replay_metadata` and `match_start` match the current local match config for match ID, map, max tick count, agent decision timeout, agents, and supported actions.

This replay format is for debugging only. It is not the final visual replay format.
