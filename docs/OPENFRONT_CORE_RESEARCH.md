# OpenFront Core Research

Date: 2026-05-08

Stage: 2 - technical research of OpenFront core.

This document is research only. No OpenFront game logic was changed.

## Main Findings

OpenFront already has a strong separation between the visual client and the deterministic game simulation.

The most important finding: the simulation lives mostly in `src/core`, and tests already run many pieces of the simulation from Node.js. That is a good sign for a future headless runner.

The recommended direction is:

```text
B - use OpenFront core, but add small adapter/shim files for headless use.
```

In simple terms: we probably do not need to rewrite the game. We need a small arena layer that loads maps from files, creates turns, feeds intents into the core, reads updates, and writes replay data.

## Relevant Files

Key core files:

- `src/core/GameRunner.ts` - high-level runner that receives turns, converts intents into executions, advances ticks, and emits updates.
- `src/core/game/GameImpl.ts` - main mutable game state and tick execution.
- `src/core/game/Game.ts` - core interfaces, player types, units, teams, map enums, and game concepts.
- `src/core/Schemas.ts` - Zod schemas for intents, turns, game start info, server messages, and replay-like records.
- `src/core/execution/ExecutionManager.ts` - converts stamped intents into concrete execution classes.
- `src/core/execution/*Execution.ts` - actions that actually mutate game state.
- `src/core/execution/WinCheckExecution.ts` - checks win conditions.
- `src/core/game/GameUpdates.ts` - update format emitted after each tick.
- `src/core/game/TerrainMapLoader.ts` - turns map binary data into `GameMap` objects.
- `src/core/worker/Worker.worker.ts` - browser worker wrapper around `GameRunner`.
- `tests/util/Setup.ts` - important proof that tests can create a game in Node.js using local map files.

Key client/server files:

- `src/server/GameServer.ts` - collects client intents into turns and broadcasts turns.
- `src/client/Transport.ts` - turns UI actions into intent messages.
- `src/client/ClientGameRunner.ts` - connects server turns, worker ticks, game view, and renderer.

## Game Loop

There are two layers:

1. `GameRunner.executeNextTick()`
2. `GameImpl.executeNextTick()`

`GameRunner` is the outer layer:

- stores incoming `Turn[]`;
- takes the next turn;
- asks `ExecutionManager` to convert intents into executions;
- adds those executions to the game;
- calls `game.executeNextTick()`;
- packages updates for the caller.

`GameImpl` is the inner simulation:

- clears the update buffer;
- ticks active executions;
- initializes newly added executions;
- removes inactive executions;
- emits player/hash/water/tile updates;
- increments the tick counter.

This means a future arena runner can probably drive the game by repeatedly feeding turns into `GameRunner` or by calling `GameImpl` more directly in tests/smoke checks.

## Player Intents

OpenFront actions are called `intents`.

The intent types are defined in `src/core/Schemas.ts`.

Examples:

- `spawn`
- `attack`
- `boat`
- `allianceRequest`
- `breakAlliance`
- `donate_gold`
- `donate_troops`
- `build_unit`
- `upgrade_structure`
- `move_warship`
- `delete_unit`
- `toggle_pause`

The server wraps each player action with a `clientID`. That wrapped form is called `StampedIntent`.

A `Turn` contains:

```text
turnNumber
intents[]
optional hash
```

## How Intents Become Game Changes

The flow is:

```text
UI or agent action
-> intent
-> server stamps clientID
-> turn
-> GameRunner.addTurn()
-> GameRunner.executeNextTick()
-> ExecutionManager.createExecs(turn)
-> concrete Execution classes
-> GameImpl.executeNextTick()
-> GameUpdates
```

Examples:

- `attack` becomes `AttackExecution`.
- `spawn` becomes `SpawnExecution`.
- `boat` becomes `TransportShipExecution`.
- `build_unit` becomes `ConstructionExecution`.
- `allianceRequest` becomes `AllianceRequestExecution`.

The important idea: intents are like orders, executions are the code that applies those orders to the game.

## Game State

The main game state is held in `GameImpl`.

Important state includes:

- players;
- teams;
- units;
- alliances;
- alliance requests;
- map ownership;
- tile updates;
- motion plans;
- tick number;
- winner;
- stats;
- rail and water/pathfinding helpers.

The public `Game` interface exposes many read methods that can become useful for future agent observations.

## Win Condition

Win checking is handled by `src/core/execution/WinCheckExecution.ts`.

It runs every 10 ticks.

For FFA:

- if it is a ranked 1v1 and only one connected human remains, that player wins;
- otherwise the player with the most land can win after reaching the configured land percentage;
- max timer and hard time limit can also force a result.

For team games:

- tile ownership is summed by team;
- the leading team can win after reaching the configured land percentage;
- max timer and hard time limit can also force a result.

## Game Updates And Replay Clues

`GameImpl.executeNextTick()` returns `GameUpdates`.

Update types include:

- player updates;
- unit updates;
- alliance updates;
- display events;
- conquest events;
- win update;
- hash update;
- packed tile updates.

The server already stores all turns in memory during a match. The client can also save game data after a win.

For Agent Arena, the simplest first replay format should probably be our own JSONL stream that records:

- match metadata;
- every turn;
- every accepted/rejected agent action;
- selected `GameUpdates`;
- final result.

We should not try to reuse a full visual replay viewer yet.

## Browser And UI Dependencies

The core is mostly independent, but there are some important details.

Known browser/UI dependencies or near-dependencies:

- `src/core/worker/WorkerClient.ts` creates a browser `Worker`. This is not suitable for Node headless use.
- `src/core/worker/Worker.worker.ts` uses worker globals like `self`, `postMessage`, and worker message events.
- `src/core/game/BinaryLoaderGameMapLoader.ts` and `FetchGameMapLoader.ts` use `fetch` to load map assets.
- `src/core/game/UserSettings.ts` uses `localStorage`.
- `src/core/AssetUrls.ts` checks `window` and `globalThis` for asset/CDN information.
- `src/core/GameRunner.ts` imports `placeName` from `src/client/graphics/NameBoxCalculator`.
- `src/core/game/GameImpl.ts` imports `renderNumber` from `src/client/Utils`.
- `src/client/Utils.ts` contains browser-only helpers such as `document`, `canvas`, `localStorage`, and `window`.

Important nuance: some of these imports may not break immediately in Node because browser-only code is inside functions that are not always called. Still, for a clean headless runner, we should avoid depending on client files from arena code.

## Can We Run This Headlessly?

Preliminary answer: yes, likely with small adapters.

Why this looks feasible:

- `src/core/game/GameImpl.ts` is a TypeScript simulation object, not a renderer.
- `tests/util/Setup.ts` already creates `Game` objects in Node.js.
- tests directly call `game.executeNextTick()`.
- tests add executions such as `SpawnExecution`, `AttackExecution`, and others without a browser.
- map binaries can be loaded from local files in tests.

What still needs proof:

- whether `GameRunner` can be imported and used directly from an arena script without pulling in browser-only client code in a problematic way;
- whether we should use `GameRunner` as-is or create a small arena-specific runner around `createGame()`;
- how to load real maps from `resources/maps` in Node without `fetch`;
- how to create clean agent observations without exposing too much game state.

## Blockers

No hard blocker found yet.

Current risks:

1. `GameRunner` imports some client helpers. This is not ideal for headless code.
2. Existing worker classes are browser-oriented.
3. Existing map loaders are browser/CDN-oriented, while tests use local file loading.
4. Existing intent format is built around human client IDs. Agent Arena can reuse the idea, but will need a clean agent-to-player mapping.
5. Existing replay behavior is not yet the replay format we need for arena auditing.

## Architecture Options

### Option A - Use `GameRunner` almost directly

Pros:

- closest to the existing game flow;
- reuses turns, intents, executions, updates, and win checks;
- likely less custom code.

Cons:

- may pull in client helper imports;
- uses current player/client assumptions;
- needs a Node map loader.

### Option B - Use `createGame()` and `GameImpl` directly for the first smoke test

Pros:

- already matches many existing tests;
- avoids browser worker code;
- easiest way to prove headless ticking;
- very small blast radius.

Cons:

- skips some real multiplayer turn flow at first;
- later we still need to map agent actions into turns/executions.

### Option C - Build a separate simplified simulator

Pros:

- fastest if OpenFront core were blocked.

Cons:

- would not be real OpenFront;
- high risk of diverging from game rules;
- not recommended now.

## Recommendation

Start with Option B for the next small step.

That means: create a minimal `arena:smoke` check that uses the same basic approach as tests:

1. load a small test map from local files;
2. create a `Game` with two players;
3. add spawn executions;
4. call `executeNextTick()` a few times;
5. print a simple success result.

After that works, move toward Option A by testing whether `GameRunner` can run from Node with a filesystem map loader.

This keeps the first proof small and avoids changing OpenFront game logic.

## Recommended Next Step

Stage 3 should be:

```text
Add a minimal npm run arena:smoke command.
```

It should only prove headless execution. It should not add Agent API, MCP, frontend, database, ratings, or game rule changes.

## Stage 3 Follow-Up

The first smoke check was added as `npm run arena:smoke`.

It uses the low-risk Option B path from this document: create a `Game` directly, load a local test map, add spawn executions, and tick the simulation from Node.js.

The smoke check was then extended to cover the `GameRunner` path too:

```text
GameRunner
-> Turn
-> stamped spawn intents
-> ExecutionManager
-> SpawnExecution
-> GameImpl.executeNextTick()
-> GameUpdateViewData
```

This confirms that the future arena can likely drive matches through turns and intents, which is closer to how real OpenFront multiplayer works.
