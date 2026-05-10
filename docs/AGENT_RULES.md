# Agent Rules

This document explains how agents should behave in the current OpenFront Agent Arena prototype.

Current status: local-only MVP rules. The Arena can run two-agent matches through local HTTP agent endpoints, write JSONL replay audit files, expose completed match results, and stream spectator-only WebSocket events.

These rules describe the current implemented contract. They do not change OpenFront game rules.

## Goal

An agent plays OpenFront through a small machine-readable interface.

The current practical goal is simple:

1. Read the current observation.
2. Return one valid action.
3. Help the match finish cleanly and auditable.

The Arena validates every action before it becomes an OpenFront intent. Agents should expect invalid or late actions to be rejected and written to replay.

## Current Limits

The current prototype is intentionally small:

- matches use exactly 2 agents;
- agents are called through local HTTP `POST /decide` endpoints;
- only localhost agent endpoints are accepted;
- the supported map is currently `tests/testdata/maps/plains`;
- match storage is in memory while the Arena API server is running;
- replay audit is written to JSONL files under `arena/replays`;
- there is no public hosting, authentication, database, leaderboard, or tournament system yet;
- the current MCP adapter is read-only and exposes only rules access.

## Match Lifecycle

1. The Arena API server receives a match request through `POST /arena/matches`.
2. The request names 2 agents, their local `/decide` endpoints, and their spawn coordinates.
3. The headless runner starts the match.
4. On each turn, the Arena builds an `AgentObservation` for each agent.
5. The Arena sends each observation to the agent endpoint.
6. The agent returns `{ "action": ... }`.
7. The Arena checks the raw action shape.
8. The Arena checks whether the action is legal in the current game state.
9. Accepted actions become OpenFront intents.
10. Rejected actions are not applied, but are recorded in replay.
11. The match ends after the configured tick limit.
12. The Arena writes a final result and replay metadata.

The current `POST /arena/matches` endpoint runs synchronously: it returns after the match completes.

## Observation Format

The Arena sends each agent a small observation object:

```json
{
  "tick": 0,
  "self": {
    "clientID": "agent-a",
    "name": "ExampleAgentA",
    "hasSpawned": false,
    "tilesOwned": 0
  },
  "players": []
}
```

Current observation fields:

- `tick`: current match tick;
- `self.clientID`: stable ID for this agent in the match;
- `self.name`: display name for this agent in the match;
- `self.hasSpawned`: whether this agent has already spawned;
- `self.tilesOwned`: how many tiles this agent currently owns;
- `players`: public summary of all players.

Each `players` entry currently includes:

- `playerID`;
- `clientID`;
- `name`;
- `isAlive`;
- `hasSpawned`;
- `tilesOwned`.

Agents should treat missing future fields as normal. Agents should also ignore unknown future fields so the Arena can extend observations later.

## Agent Response Format

Each agent endpoint receives:

```json
{
  "observation": {}
}
```

It must return:

```json
{
  "action": {}
}
```

The returned `action` is treated as untrusted raw input. It must pass input validation and game-state validation before it is applied.

## Action Format

Current supported action types:

- `spawn`;
- `wait`;
- `attack`.

### Spawn

Use `spawn` when the agent has not spawned yet.

```json
{
  "type": "spawn",
  "x": 10,
  "y": 10
}
```

Current requirements:

- `x` must be a number;
- `y` must be a number;
- the action is legal only when the agent has not spawned yet;
- the target spawn location must be legal in the current game state.

### Wait

Use `wait` when the agent should do nothing this turn.

```json
{
  "type": "wait"
}
```

`wait` is useful when the agent has no safe legal action.

### Attack

The current prototype supports only attacks against neutral territory.

```json
{
  "type": "attack",
  "target": "neutral",
  "troops": null
}
```

Current requirements:

- `target` must be `"neutral"`;
- `troops` may be a number or `null`;
- the agent must be spawned and alive;
- a neutral border target must be available in the current game state.

## Legal Actions

Legal actions are actions that pass both validation layers.

Input validation checks whether the raw JSON has the expected shape.

Game validation checks whether the shaped action makes sense right now.

Examples:

- `spawn` before the agent has spawned, with valid coordinates;
- `wait` with no extra requirements;
- `attack` against neutral territory after the agent has spawned and has a legal neutral target.

## Illegal Actions

Illegal actions are rejected and recorded in replay. They are not applied to the game.

Common illegal action cases:

- action is missing;
- action is not a JSON object;
- action has an unknown `type`;
- `spawn.x` or `spawn.y` is missing or not a number;
- agent tries to spawn after already spawning;
- agent tries to attack before spawning;
- agent tries to attack a non-neutral target;
- agent endpoint fails, times out, or returns malformed JSON.

## Time Limits

Each agent decision has a configured timeout. The current Arena API match request includes:

```json
{
  "agentDecisionTimeoutMs": 1000
}
```

If an agent does not answer in time, the decision is rejected and recorded in replay. The match can continue when the runner can safely continue.

Agents should answer quickly and deterministically. A good local test agent should usually answer in far less than the configured timeout.

## Hidden Information

Agents may only use the observation sent by the Arena and their own local memory.

Agents must not depend on:

- private OpenFront internals;
- direct reads from replay files during a live match;
- direct reads from Arena server memory;
- direct access to another agent process;
- browser, DOM, canvas, or visual renderer state;
- data that is not present in the observation contract.

The current observation is intentionally small. If an agent needs more information, the correct path is to propose an observation contract change, not to bypass the Arena.

## Scoring

The current prototype does not have a rating or leaderboard system yet.

The current match result records:

- match ID;
- ticks;
- update count;
- attack intent count;
- rejected action count;
- final agent summaries;
- replay path.

Future scoring can build on this, but these rules do not define Elo, tournaments, seasons, or leaderboard ranking yet.

## Penalties

Current penalties are audit penalties, not rating penalties.

When an action is rejected:

- no OpenFront intent is sent for that decision;
- the rejection is written to replay;
- the final result includes rejected action counts.

There is no automatic ban, rating loss, or match disqualification yet.

## Anti-Cheat Rules

Agents must stay inside the agent contract.

Allowed:

- inspect the observation sent by Arena;
- keep local memory between turns inside the agent process;
- use deterministic or probabilistic strategy code;
- return any action and let Arena validation accept or reject it;
- read public docs and SDK helper code before a match.

Not allowed:

- modify OpenFront core, game loop, or game rules during a match;
- read or modify Arena replay files during a live match;
- call private Arena internals instead of the HTTP agent contract;
- interfere with another agent endpoint;
- send actions through spectator WebSocket connections;
- send actions through the current read-only MCP adapter;
- rely on hidden renderer or browser state;
- intentionally overload the Arena server or agent endpoints;
- exploit localhost-only development assumptions as if they were public security guarantees.

Spectator WebSocket events are read-only. They are for watching a match, not controlling agents.

## Replay And Audit

Replay is the source of truth for auditing agent behavior.

For each tick, replay records:

- observation;
- raw accepted action or `null`;
- input validation result;
- game validation result or `null`;
- OpenFront intent or `null`;
- agent summary.

If input validation fails, `action`, game validation, and intent are all recorded as `null`.

If input validation passes but game validation fails, the action is recorded, but no intent is sent.

## Valid Action Examples

### Valid spawn

```json
{
  "type": "spawn",
  "x": 10,
  "y": 10
}
```

Valid when the agent has not spawned and the location is legal.

### Valid wait

```json
{
  "type": "wait"
}
```

Valid when the agent chooses to do nothing.

### Valid neutral attack

```json
{
  "type": "attack",
  "target": "neutral",
  "troops": null
}
```

Valid when the agent is spawned, alive, and has a legal neutral target.

## Invalid Action Examples

### Unknown action type

```json
{
  "type": "expand"
}
```

Rejected because `expand` is not a current action type.

### Malformed spawn

```json
{
  "type": "spawn",
  "x": "10",
  "y": 10
}
```

Rejected because `x` must be a number.

### Unsupported attack target

```json
{
  "type": "attack",
  "target": "player",
  "troops": 50
}
```

Rejected because the current prototype supports only `target: "neutral"`.

## Advice For LLM Agents

LLM agents should keep the decision loop simple:

1. Check `observation.self.hasSpawned`.
2. If false, return a valid `spawn`.
3. If true and a simple legal attack is wanted, return neutral `attack`.
4. Otherwise return `wait`.

Do not invent action types. Do not add prose around JSON action responses. The agent endpoint should return only machine-readable JSON shaped like:

```json
{
  "action": {
    "type": "wait"
  }
}
```

When unsure, return `wait`. A clean `wait` is better than malformed output.

## Related Documents

- `docs/AGENT_API.md`;
- `docs/ARENA_API_SERVER_CONTRACT.md`;
- `docs/RUNNER_OVERVIEW.md`;
- `docs/RUNNER_CHECKS.md`;
- `arena/sdk/README.md`.
