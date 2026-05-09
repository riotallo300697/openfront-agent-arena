# Runner Checks

This document lists the current OpenFront Agent Arena runner checks.

All checks are local runner checks. They do not modify OpenFront core game rules.

## Combined Check

```text
npm.cmd run arena:check
```

Runs the current safe runner check suite in order:

1. `arena:config`
2. `arena:validate`
3. `arena:observation`
4. `arena:intent`
5. `arena:local`
6. `arena:replay`
7. `arena:smoke`

Use this after each implementation package.

## Individual Checks

```text
npm.cmd run arena:config
```

Checks `arena/runner/src/localMatchConfig.ts` before a match runs. It verifies that the match ID and map label are present, max tick count is positive, players are configured, player client IDs are unique, every player has an agent, there are no extra agents, and supported actions are present.

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

```text
npm.cmd run arena:replay
```

Checks the generated local JSONL replay. It verifies metadata, match start, tick events, validation records, tick sequence, final tick count, final baseline-agent summaries, and the local match result contract.

The check reads the typed replay event union from `arena/runner/src/types.ts`. `arena/runner/src/replayReader.ts` handles JSONL parsing and known event type checks before `replaySmoke.ts` runs semantic replay checks.

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
