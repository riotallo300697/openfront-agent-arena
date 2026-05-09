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

The local match config can be checked without running a match:

```text
npm.cmd run arena:config
```

The current local TypeScript shapes live in:

```text
arena/runner/src/types.ts
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

Rejected actions are written to the replay, but they are not sent into OpenFront.

The validator can be checked without running a full match:

```text
npm.cmd run arena:validate
```

All current Agent Arena runner checks can be run together:

```text
npm.cmd run arena:check
```

This currently runs local match config smoke, action validation, observation smoke, intent adapter smoke, the local baseline-agent match, replay smoke, and the headless smoke check.

The runner checks are summarized in:

```text
docs/RUNNER_CHECKS.md
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
replay_metadata: format, version, matchID, runner, map, seed, maxTicks, agents, supportedActions
match_start: matchID, map, maxTicks, agents, supportedActions
tick: tick, turnNumber, decisions, intents, summary, updateCount
match_end: matchID, ticks, updates, attackIntents, rejectedActions, agents
```

The first line is always `replay_metadata`. It records the current debug replay format, format version, match ID, runner kind, map label, seed value, max tick count, agents, and supported actions. The current local runner has no explicit seed, so this field is written as `null`.

Each `tick` event includes a compact `summary` field for every local agent:

- agent name;
- client ID;
- whether the agent has spawned;
- owned tile count;
- whether the agent is alive.

Each decision also includes a `validation` field with either `accepted` or `rejected`.

The local replay file can be checked after running `arena:local`:

```text
npm.cmd run arena:replay
```

This check parses the JSONL file and verifies the basic debug replay shape: first metadata record, match start, tick records with decisions and validation, match end, matching tick counts, ordered tick sequence, final baseline-agent summaries, and the current local match result contract. It also checks that `replay_metadata` and `match_start` match the current local match config for match ID, map, max tick count, agents, and supported actions.

This replay format is for debugging only. It is not the final visual replay format.
