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

The current local match settings live in `arena/runner/src/localMatch.ts` as `LocalMatchConfig`. For now this is just an in-file object, not an external config system.

The current local TypeScript shapes live in:

```text
arena/runner/src/types.ts
```

The current local observation builder lives in:

```text
arena/runner/src/observation.ts
```

The current built-in baseline agents live in:

```text
arena/runner/src/baselineAgents.ts
```

The current local adapter from Agent Arena actions to OpenFront intents lives in:

```text
arena/runner/src/intentAdapter.ts
```

The current local replay summary builder lives in:

```text
arena/runner/src/replaySummary.ts
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

## Current Local Replay

`npm run arena:local` writes a simple JSONL replay file to:

```text
arena/replays/arena-local-match.jsonl
```

Each line is one JSON object.

Current event types:

- `match_start`;
- `tick`;
- `match_end`.

Each `tick` event includes a compact `summary` field for every local agent:

- agent name;
- client ID;
- whether the agent has spawned;
- owned tile count;
- whether the agent is alive.

Each decision also includes a `validation` field with either `accepted` or `rejected`.

This replay format is for debugging only. It is not the final visual replay format.
