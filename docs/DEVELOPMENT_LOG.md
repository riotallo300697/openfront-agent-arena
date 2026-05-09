# Development Log

## 2026-05-08 - Project workspace foundation started

Started Stage 1: workspace preparation for OpenFront Agent Arena.

Created the planned documentation and arena folder structure before adding any OpenFront game code.

Important note: the current local folder does not yet contain a cloned OpenFrontIO repository. There is no `.git` folder, no `package.json`, and no `src/core` directory yet. The next step is to fork OpenFrontIO on GitHub, clone the fork locally, and then decide how to place or merge this prepared project structure into that working copy.

No OpenFront game logic was changed.

## 2026-05-08 - Researched OpenFront core for headless feasibility

Completed Stage 2 research and added `docs/OPENFRONT_CORE_RESEARCH.md`.

Main conclusion: OpenFront core looks suitable for headless use, but the first implementation should use small Node adapters for map loading and avoid browser worker/client dependencies.

Recommended next small step: add a minimal `npm run arena:smoke` command that proves a game can be created and ticked from Node without changing OpenFront game logic.

Verification: ran `.\node_modules\.bin\vitest.cmd run tests\core\executions\WinCheckExecution.test.ts`; 1 test file passed, 14 tests passed.

No OpenFront game logic was changed.

## 2026-05-08 - Added minimal arena smoke check

Started Stage 3 by adding `npm run arena:smoke`.

The smoke check creates an OpenFront game from Node.js, loads the small `plains` test map, spawns two players, runs several ticks, and prints a simple success result.

Verification: ran `npm run arena:smoke` through `npm.cmd` on Windows. The smoke check passed, reached tick 5, and both players owned tiles.

This is only a headless feasibility check. It does not add Agent API, MCP, frontend, database, ratings, or replay writing.

No OpenFront game logic was changed.

## 2026-05-08 - Extended smoke check through GameRunner turns

Extended `npm run arena:smoke` so it now verifies two paths:

1. Direct core path: create `Game`, add spawn executions, and tick the simulation.
2. Runner path: create `GameRunner`, send turns with `spawn` intents, and tick the simulation through the normal intent-to-execution flow.

Verification: ran `npm.cmd run arena:smoke`. Both checks passed, reached tick 5, emitted 5 runner updates, and both players owned tiles.

No OpenFront game logic was changed.

## 2026-05-08 - Added first local baseline-agent match

Added `npm run arena:local`.

This runs two built-in baseline agents in the same Node.js process. Each agent receives a minimal observation and can return either `spawn` or `wait`. The runner converts those actions into OpenFront turns and executes them through `GameRunner`.

This is not an external Agent API yet. It is the first small proof that agents can drive a headless OpenFront match loop.

Verification: ran `npm.cmd run arena:local`. The local match completed, reached tick 20, emitted 20 updates, and both baseline agents spawned and stayed alive with owned tiles.

No OpenFront game logic was changed.

## 2026-05-08 - Added first local attack action

Extended the local baseline agents so they can return an `attack` action after the spawn phase.

The first attack target is neutral territory. This keeps the prototype simple while proving that local agent decisions can become real OpenFront `attack` intents.

Verification: ran `npm.cmd run arena:local`. The local match completed, reached tick 140, emitted 140 updates, created 6 attack intents, and both agents expanded beyond their spawn tiles.

No OpenFront game logic was changed.

## 2026-05-08 - Added simple JSONL replay writer

Added a minimal JSONL replay writer for `npm run arena:local`.

The local match now writes `arena/replays/arena-local-match.jsonl` with `match_start`, `tick`, and `match_end` events.

The replay is currently for debugging and audit only. It is not a visual replay viewer.

Verification: ran `npm.cmd run arena:local` and `npm.cmd run arena:smoke`. The replay file was created with 142 JSONL lines: 1 `match_start`, 140 `tick`, and 1 `match_end`. Git reports the generated replay as ignored.

No OpenFront game logic was changed.

## 2026-05-08 - Added compact per-tick replay summary

Extended the local JSONL replay so every `tick` event includes a compact summary for each built-in agent.

The summary records the agent name, client ID, spawn status, owned tile count, and alive status. This makes the replay easier to inspect before a visual replay viewer exists.

Verification: ran `npm.cmd run arena:local` and `npm.cmd run arena:smoke`. The local match completed with 140 ticks, 140 updates, 6 attack intents, and both agents alive. The replay file still has 142 JSONL lines, and tick events now include per-agent summaries.

No OpenFront game logic was changed.

## 2026-05-08 - Added local action validation

Added a small validation step before local agent actions are converted into OpenFront intents.

The runner now rejects invalid local actions such as spawning twice, spawning outside the map, attacking before spawn, or sending a negative troop count. Rejected actions stay in the replay for debugging, but they are not sent into OpenFront.

Verification: ran `npm.cmd run arena:local` and `npm.cmd run arena:smoke`. The local match completed with 140 ticks, 140 updates, 6 attack intents, and 0 rejected actions. The replay file still has 142 JSONL lines, and decisions now include a validation status.

No OpenFront game logic was changed.

## 2026-05-08 - Extracted local runner agent types

Moved the local runner TypeScript shapes for observation, action, validation, agent interface, and replay summary into `arena/runner/src/types.ts`.

This keeps `localMatch.ts` focused on running the match and gives future runner, SDK, or API work a single small place to reuse these early data shapes.

Verification: ran `npm.cmd run arena:local` and `npm.cmd run arena:smoke`. The local match still completed with 140 ticks, 140 updates, 6 attack intents, and 0 rejected actions. The replay file still has 142 JSONL lines.

No OpenFront game logic was changed.

## 2026-05-08 - Extracted local action validation

Moved local action validation out of `localMatch.ts` and into `arena/runner/src/actionValidation.ts`.

The rules did not change. The local match still rejects invalid actions before converting accepted actions into OpenFront intents, while `localMatch.ts` stays focused on running the match loop.

Verification: ran `npm.cmd run arena:local` and `npm.cmd run arena:smoke`. The local match still completed with 140 ticks, 140 updates, 6 attack intents, and 0 rejected actions. The replay file still has 142 JSONL lines.

No OpenFront game logic was changed.

## 2026-05-08 - Added action validation smoke check

Added `npm run arena:validate`.

This command checks the local action validator without running a full match. It verifies accepted actions and common rejected actions, including repeated spawn, spawn outside the map, attack before spawn, and negative attack troops.

Verification: ran `npm.cmd run arena:validate`, `npm.cmd run arena:local`, and `npm.cmd run arena:smoke`. The validation smoke check passed 8 cases: 3 accepted cases and 5 rejected cases. The local match still completed with 140 ticks, 140 updates, 6 attack intents, and 0 rejected actions. The replay file still has 142 JSONL lines.

No OpenFront game logic was changed.

## 2026-05-08 - Extracted baseline agents

Moved the built-in `FixedSpawnExpandAgent` out of `localMatch.ts` and into `arena/runner/src/baselineAgents.ts`.

The agent behavior did not change. This keeps `localMatch.ts` focused on running a match and gives future baseline agents a dedicated place to live.

Verification: ran `npm.cmd run arena:validate`, `npm.cmd run arena:local`, and `npm.cmd run arena:smoke`. The validation smoke check still passed 8 cases. The local match still completed with 140 ticks, 140 updates, 6 attack intents, and 0 rejected actions. The replay file still has 142 JSONL lines.

No OpenFront game logic was changed.

## 2026-05-08 - Extracted observation builder

Moved local observation building out of `localMatch.ts` and into `arena/runner/src/observation.ts`.

The observation shape did not change. This keeps the code that builds what an agent sees separate from the code that runs the match loop.

Verification: ran `npm.cmd run arena:validate`, `npm.cmd run arena:local`, and `npm.cmd run arena:smoke`. The validation smoke check still passed 8 cases. The local match still completed with 140 ticks, 140 updates, 6 attack intents, and 0 rejected actions. The replay file still has 142 JSONL lines.

No OpenFront game logic was changed.

## 2026-05-08 - Extracted intent adapter

Moved local conversion from Agent Arena actions to OpenFront intents out of `localMatch.ts` and into `arena/runner/src/intentAdapter.ts`.

The action behavior did not change. Accepted local actions still become the same OpenFront intents before being sent to `GameRunner`.

Verification: ran `npm.cmd run arena:validate`, `npm.cmd run arena:local`, and `npm.cmd run arena:smoke`. The validation smoke check still passed 8 cases. The local match still completed with 140 ticks, 140 updates, 6 attack intents, and 0 rejected actions. The replay file still has 142 JSONL lines.

No OpenFront game logic was changed.

## 2026-05-08 - Extracted replay summary builder

Moved local replay summary building out of `localMatch.ts` and into `arena/runner/src/replaySummary.ts`.

The replay summary shape did not change. Tick events and match-end events still record each agent name, client ID, spawn status, owned tile count, and alive status.

Verification: ran `npm.cmd run arena:validate`, `npm.cmd run arena:local`, and `npm.cmd run arena:smoke`. The validation smoke check still passed 8 cases. The local match still completed with 140 ticks, 140 updates, 6 attack intents, and 0 rejected actions. The replay file still has 142 JSONL lines.

No OpenFront game logic was changed.

## 2026-05-08 - Added local match config object

Added a small `LocalMatchConfig` object inside `arena/runner/src/localMatch.ts`.

The config gathers the local match ID, replay map label, max tick count, players, built-in agents, and supported actions in one place. This is not an external config system yet; it only makes the local match easier to adjust without copying the match loop.

Verification: ran `npm.cmd run arena:validate`, `npm.cmd run arena:local`, and `npm.cmd run arena:smoke`. The validation smoke check still passed 8 cases. The local match still completed with 140 ticks, 140 updates, 6 attack intents, and 0 rejected actions. The replay file still has 142 JSONL lines.

No OpenFront game logic was changed.

## 2026-05-08 - Added combined arena check command

Added `npm run arena:check`.

This command runs the current Agent Arena runner checks in order: action validation smoke check, local baseline-agent match, and headless OpenFront smoke check.

Verification: ran `npm.cmd run arena:check`. The combined check passed: validation smoke check passed 8 cases, the local match completed with 140 ticks, 140 updates, 6 attack intents, and 0 rejected actions, and the headless smoke check passed. The replay file still has 142 JSONL lines.

No OpenFront game logic was changed.

## 2026-05-08 - Added replay metadata record

Added a first-line `replay_metadata` record to the local JSONL replay.

The metadata records the debug replay format, format version, match ID, runner kind, map label, seed value, max tick count, agents, and supported actions. The current local runner does not set an explicit seed, so the replay writes `seed: null`.

Verification: ran `npm.cmd run arena:check`. The combined check passed, and the generated replay now starts with `replay_metadata` followed by `match_start`.

No OpenFront game logic was changed.

## 2026-05-08 - Added observation smoke check

Added `npm run arena:observation`.

This check creates a headless local runner, reads an `AgentObservation` before spawn, spawns two players through normal turns, advances a few ticks, and checks the post-spawn observation. It verifies the current observation contract fields for `tick`, `self`, and public `players` data.

Verification: ran `npm.cmd run arena:observation` and `npm.cmd run arena:check`. The observation check passed with 2 checked observations and both players spawned with owned tiles. The combined check now runs action validation, observation smoke, the local baseline-agent match, and the headless smoke check.

No OpenFront game logic was changed.

## 2026-05-08 - Added replay smoke check

Added `npm run arena:replay`.

This check reads the local JSONL replay, parses every line, and verifies the basic debug replay shape: first-line metadata, match start, tick events with decisions and validation statuses, and match end. The combined `arena:check` now runs this after the local baseline-agent match creates a fresh replay file.

Verification: ran `npm.cmd run arena:replay` and `npm.cmd run arena:check`. The replay check passed with 143 events, 140 tick events, `replay_metadata` as the first event, and `match_end` as the last event. The combined check now runs action validation, observation smoke, the local baseline-agent match, replay smoke, and the headless smoke check.

No OpenFront game logic was changed.

## 2026-05-08 - Added intent adapter smoke check

Added `npm run arena:intent`.

This check creates a headless local runner and verifies that the current local Agent Arena actions convert into the expected OpenFront intents: `spawn` becomes a spawn intent, `wait` returns no intent, and `attack` becomes an attack intent against neutral territory.

Verification: ran `npm.cmd run arena:intent` and `npm.cmd run arena:check`. The intent check passed for 3 action cases. The combined check now runs action validation, observation smoke, intent adapter smoke, the local baseline-agent match, replay smoke, and the headless smoke check.

No OpenFront game logic was changed.

## 2026-05-08 - Strengthened replay smoke consistency checks

Extended `npm run arena:replay`.

The replay smoke check now verifies that the number of `tick` events matches `match_end.ticks`, and that the final `match_end.agents` summary contains both built-in baseline agents with spawned, alive, tile-owning final states.

Verification: ran `npm.cmd run arena:replay` and `npm.cmd run arena:check`. The replay check passed with 140 tick events, `match_end.ticks` equal to 140, and 2 final baseline agents. The combined check passed.

No OpenFront game logic was changed.

## 2026-05-08 - Extracted local match config

Moved `LocalMatchConfig` from `arena/runner/src/localMatch.ts` into `arena/runner/src/localMatchConfig.ts`.

The local match runner and replay smoke check now read the same match ID, players, built-in agents, and supported actions from one place. This removes duplicated baseline-agent names from the replay check without changing local match behavior.

Verification: ran `npm.cmd run arena:local`, `npm.cmd run arena:replay`, and `npm.cmd run arena:check`. The local match still completed with 140 ticks, 6 attack intents, and 0 rejected actions. The replay check still passed with 140 tick events and 2 final baseline agents. The combined check passed.

No OpenFront game logic was changed.

## 2026-05-08 - Checked replay metadata against local match config

Extended `npm run arena:replay`.

The replay smoke check now verifies that `replay_metadata` and `match_start` match `localMatchConfig` for match ID, map label, max tick count, agents, and supported actions. This keeps the replay audit tied to the shared local match config instead of only checking that fields exist.

Verification: ran `npm.cmd run arena:replay` and `npm.cmd run arena:check`. The replay check passed with metadata and match-start records matching the local match config. The combined check passed.

No OpenFront game logic was changed.

## 2026-05-08 - Added local match config smoke check

Added `npm run arena:config`.

This check validates the local match config before a match runs. It verifies that match ID and map label are present, max tick count is positive, players exist, player client IDs are unique, every player has an agent, there are no extra agents, and supported actions are present.

Verification: ran `npm.cmd run arena:config` and `npm.cmd run arena:check`. The config check passed with 2 players, 2 agents, 140 max ticks, and supported actions `spawn`, `wait`, and `attack`. The combined check now starts with the config smoke check and passed.

No OpenFront game logic was changed.

## 2026-05-08 - Hardened runner checks package

Completed a grouped runner-check hardening step.

Added shared smoke assertion helpers in `arena/runner/src/smokeAssert.ts` and updated the current smoke checks to use them. Extended replay smoke validation so tick events must have a stable sequence: `turnNumber` starts at 0 and increments by 1, while `tick` starts at 1 and increments by 1.

Added `docs/RUNNER_CHECKS.md`, a compact reference for the current `arena:*` commands and what each one protects. Updated `docs/WORKING_AGREEMENT.md` to record the project preference for coherent implementation packages instead of approving every micro-change separately.

Verification: ran `npm.cmd run arena:replay` and `npm.cmd run arena:check`. The replay check passed with 140 ordered tick events, and the combined check passed.

No OpenFront game logic was changed.

## 2026-05-08 - Added local match result contract

Completed a grouped local match result contract step.

Added `LocalMatchResult` and `LocalMatchEndReplayEvent` types in `arena/runner/src/types.ts`, plus `arena/runner/src/localMatchResult.ts` helpers. The local baseline-agent match now builds one typed result object, prints it, and writes `match_end` from the same result fields.

Extended `npm run arena:replay` so it checks the `match_end` result contract for the local baseline-agent match: match ID, tick count, update count, accepted attack intent count, rejected action count, and final agent count/state.

Added `docs/LOCAL_MATCH_RESULT.md` to document what counts as a successful local baseline-agent match, and updated the runner/API check docs.

Verification: ran `npm.cmd run arena:local`, `npm.cmd run arena:replay`, and `npm.cmd run arena:check`. The local match printed the typed result, the replay check accepted the matching `match_end`, and the combined check passed.

No OpenFront game logic was changed.

## 2026-05-08 - Added typed replay event union

Completed a grouped runner replay event typing step.

Replaced the loose replay event object type with a typed `ReplayEvent` union in `arena/runner/src/types.ts`. The union currently covers `replay_metadata`, `match_start`, `tick`, and `match_end`. `ReplayWriter` now accepts that typed union, and `replaySmoke.ts` narrows events by `type` before checking event-specific fields.

Updated the replay documentation with the current JSONL event shapes and noted that replay smoke reads the typed event union.

Verification: ran `npm.cmd run arena:replay` and `npm.cmd run arena:check`. The replay check passed with 143 events, 140 tick events, and typed `match_end` validation. The combined check passed.

No OpenFront game logic was changed.

## 2026-05-09 - Extracted replay reader and event type guard

Completed a grouped replay reader and runtime shape guard step.

Added `arena/runner/src/replayReader.ts`. It reads the local JSONL replay file, parses each line, checks that each parsed line is an object, and verifies that each event has one of the known replay event types before returning typed `ReplayEvent` values.

Updated `arena/runner/src/replaySmoke.ts` so it uses the replay reader and focuses on semantic replay checks: metadata, match start, tick sequence, match result, and final agent state.

Updated the replay documentation and runner checks reference to describe the reader/check split.

Verification: ran `npm.cmd run arena:replay` and `npm.cmd run arena:check`. The replay check passed with 143 events, 140 tick events, and the existing semantic checks. The combined check passed.

No OpenFront game logic was changed.

## 2026-05-08 - Prepared structure moved into OpenFrontIO fork

Moved the initial Agent Arena documentation and folder structure into the cloned OpenFrontIO fork at `D:\AI\Codex\openfront\openfront-agent-arena`.

Added local safety rules to `.gitignore` for secrets, local Python environments, and generated arena replay output.

Kept the existing OpenFront `docs/ARCHITECTURE.md` content and added a separate Agent Arena architecture section instead of replacing upstream documentation.

No OpenFront game logic was changed.

## 2026-05-08 - Preserved empty arena folders

Added `.gitkeep` files to empty Agent Arena folders so GitHub will show the planned structure before implementation files exist.

No OpenFront game logic was changed.

## 2026-05-08 - Verified original OpenFront startup

Installed dependencies with `npm run inst`.

Started the original OpenFront development server with `npm run dev`.

The game opened in the browser at `http://localhost:9000/` and worked.

The startup logs included Vite asset warnings about importing assets from the public directory. These warnings came from the existing OpenFront project and were not caused by Agent Arena changes.

No OpenFront game logic was changed.
