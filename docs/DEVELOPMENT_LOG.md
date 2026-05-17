# Development Log

## 2026-05-17 - Added session action-submit boundary

Extended the local session API with a boundary-only action submission endpoint:

```text
POST /arena/sessions/:sessionID/agents/:clientID/actions
```

The endpoint validates the `turnID` envelope and `AgentAction` shape, then returns `409 no_pending_action` for joined agents because the pull-style runner does not create pending action tickets yet.

Covered boundaries:

- `no_pending_action`;
- `invalid_turn`;
- `invalid_session_action`;
- `session_not_found`;
- `client_not_joined`.

Updated:

- `arena/server/src/arenaSessionValidation.ts`;
- `arena/server/src/arenaSessionStore.ts`;
- `arena/server/src/arenaApiServer.ts`;
- `arena/server/src/arenaApiServerSessionsSmoke.ts`;
- session/API docs.

Verification:

- ran `npm.cmd run arena:server-sessions-smoke`; it passed.
- ran `npm.cmd run arena:server-smoke`; it passed.

This does not start pull-style matches, generate live game observation tickets, apply submitted actions, implement timeouts, write pull-style replay audit events, add MCP action tools, change persistence, add frontend, touch `src/core`, change the OpenFront game loop, or change game rules.

## 2026-05-17 - Added session observation-state endpoint

Extended the first local session endpoint slice with a read-only observation-state endpoint for future pull-style agents:

```text
GET /arena/sessions/:sessionID/agents/:clientID/observation
```

The endpoint currently returns `reason: "no_pending_action"` and `pendingAction: null` for joined session agents. It also enforces `session_not_found` and `client_not_joined` boundaries.

Updated:

- `arena/server/src/arenaSessionStore.ts`;
- `arena/server/src/arenaApiServer.ts`;
- `arena/server/src/arenaApiServerSessionsSmoke.ts`;
- session/API docs.

Verification:

- ran `npm.cmd run arena:server-sessions-smoke`; it passed.
- ran `npm.cmd run arena:server-smoke`; it passed.

This does not start pull-style matches, generate live game observation tickets, accept submitted actions, implement timeouts, write pull-style replay audit events, add MCP action tools, change persistence, add frontend, touch `src/core`, change the OpenFront game loop, or change game rules.

## 2026-05-17 - Added first local session lifecycle endpoints

Started the post-persistence local session endpoint track for future pull-style agents.

Added:

- `arena/server/src/arenaSessionValidation.ts`;
- `arena/server/src/arenaSessionStore.ts`;
- `arena/server/src/arenaApiServerSessionsSmoke.ts`;
- npm script `arena:server-sessions-smoke`.

Updated `arena/server/src/arenaApiServer.ts` with in-memory local session endpoints:

- `GET /arena/sessions`;
- `POST /arena/sessions`;
- `GET /arena/sessions/:sessionID`;
- `POST /arena/sessions/:sessionID/agents`.

The first slice supports creating a session, listing sessions, reading a session, and joining two local agent identities. It covers invalid create requests, duplicate `sessionID`, duplicate `matchID`, duplicate agent joins, full session rejection, and missing session lookup.

Verification:

- ran `npm.cmd run arena:server-sessions-smoke`; it passed.
- ran `npm.cmd run arena:server-smoke`; it passed.

This does not start pull-style matches, generate observation tickets, accept submitted actions, implement timeouts, write pull-style replay audit events, add MCP action tools, change persistence, add frontend, touch `src/core`, change the OpenFront game loop, or change game rules.

## 2026-05-10 - Added PostgreSQL-backed match store adapter

Added the first PostgreSQL write/read adapter for completed Arena API match records.

Added:

- `arena/server/src/arenaPostgresPsql.ts`;
- `arena/server/src/arenaPostgresMatchStore.ts`;
- `arena/server/src/arenaPostgresMatchStoreSmoke.ts`;
- npm scripts: `arena:postgres-store-smoke` and `arena:server-postgres`.

Updated:

- `arena/server/src/arenaPostgresMigrate.ts` to share the Docker Compose `psql` helper;
- `arena/server/src/arenaApiServer.ts` so manual runs can use `ARENA_MATCH_STORE=postgres`;
- Stage 12 and API documentation.

The PostgreSQL match store writes completed records into:

- `arena_matches`;
- `arena_match_players`;
- `arena_match_results`;
- `arena_match_agent_results`;
- `arena_replays`.

Replay contents remain in JSONL files. PostgreSQL stores replay metadata and path only.

Verification:

- ran `npm.cmd run arena:postgres-store-smoke`; it passed.
- ran `npm.cmd run arena:postgres-migration-smoke`; it passed.

Docker CLI is not available in this environment, so the live `arena:postgres-up`, `arena:postgres-migrate`, and `arena:server-postgres` flow was not run here.

This does not add users, API keys, ratings, tournaments, sessions, frontend, action/session MCP tools, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Persisted match request metadata for PostgreSQL mapping

Prepared the completed Arena API match record for the next Stage 12 PostgreSQL writer slice.

Updated:

- `arena/server/src/arenaMatchStore.ts`;
- `arena/server/src/arenaApiServer.ts`;
- `arena/server/src/arenaApiServerSmoke.ts`;
- `arena/server/src/arenaMatchStoreSmoke.ts`;
- `arena/sdk/typescript/arenaClient.ts`;
- Stage 12 and API documentation.

Completed match records now include:

- `map`;
- `maxTicks`;
- `agentDecisionTimeoutMs`;
- `runner`;
- request `agents`.

The JSONL match store validates those fields on load, and the server/store smoke checks verify that they are saved and loaded across restart.

Verification:

- ran `npm.cmd run arena:server-store-smoke`; it passed.
- ran `npm.cmd run arena:server-smoke`; it passed.
- ran `npm.cmd run arena:check`; it passed.

This does not write completed matches to PostgreSQL yet. It does not add users, API keys, ratings, tournaments, sessions, frontend, action/session MCP tools, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Added local PostgreSQL migration setup

Implemented the first Stage 12 PostgreSQL setup package after the schema proposal was approved.

Added:

- `arena/server/docker-compose.postgres.yml`;
- `arena/server/migrations/001_create_arena_match_history.sql`;
- `arena/server/src/arenaPostgresMigrate.ts`;
- `arena/server/src/arenaPostgresMigrationSmoke.ts`;
- `docs/POSTGRES_LOCAL_SETUP.md`;
- npm scripts: `arena:postgres-up`, `arena:postgres-down`, `arena:postgres-migrate`, and `arena:postgres-migration-smoke`.

The first migration creates only match-history tables:

- `arena_matches`;
- `arena_match_players`;
- `arena_match_results`;
- `arena_match_agent_results`;
- `arena_replays`.

The migration smoke check validates the migration bundle without requiring Docker, and it is included in `npm.cmd run arena:check`.

Updated PostgreSQL schema proposal, Runner Checks, Arena API server contract, Agent API, Working Agreement, and Project Plan docs.

Verification:

- ran `npm.cmd run arena:postgres-migration-smoke`; it passed.
- ran `npm.cmd run arena:check`; it passed.
- checked for Docker CLI; it is not available in this environment, so `arena:postgres-up` and `arena:postgres-migrate` were not run here.

This does not wire Arena API match writes into PostgreSQL yet. It does not add users, API keys, ratings, tournaments, sessions, frontend, action/session MCP tools, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Proposed first PostgreSQL schema

Added `docs/POSTGRES_SCHEMA_PROPOSAL.md` for the first Stage 12 PostgreSQL review.

The proposal keeps the first migration slice focused on match history:

- `arena_matches`;
- `arena_match_players`;
- `arena_match_results`;
- `arena_match_agent_results`;
- `arena_replays`.

It keeps replay contents in JSONL files and stores only replay metadata/path in PostgreSQL. It explicitly leaves users, API keys, ratings, tournaments, sessions, and full replay event storage out of the first slice.

Updated Project Plan, Working Agreement, Arena API server contract, and Agent API docs.

Verification: documentation-only package, so `npm.cmd run arena:check` was not run.

This does not add PostgreSQL, Docker, migrations, frontend, ratings, session endpoints, action/session MCP tools, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Hardened local match store loading

Extended the Stage 12 JSONL match store boundary.

Updated `arena/server/src/arenaMatchStore.ts` so JSONL store loading now rejects:

- malformed JSONL with a line-specific error;
- invalid match record shapes;
- duplicate `matchID` records.

Extended `arena/server/src/arenaMatchStoreSmoke.ts` to cover those negative cases before the existing restart/load persistence check.

Updated Runner Checks and Arena API server contract docs.

Verification:

- ran `npm.cmd run arena:server-store-smoke`; it passed.
- ran `npm.cmd run arena:check`; it passed.

This does not add PostgreSQL, Docker, migrations, frontend, ratings, session endpoints, action/session MCP tools, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Added local match persistence boundary

Started Stage 12 persistence first after the post-Stage 11 decision.

Added:

- `arena/server/src/arenaMatchStore.ts` with an `ArenaMatchStore` interface, in-memory store, and JSONL file store;
- optional `matchStore` support in `arena/server/src/arenaApiServer.ts`;
- CLI default JSONL store at `arena/.local/matches.jsonl` for manual `npm.cmd run arena:server`;
- `arena/server/src/arenaMatchStoreSmoke.ts`;
- `npm.cmd run arena:server-store-smoke`;
- inclusion of `arena:server-store-smoke` in `npm.cmd run arena:check`.

The new smoke check runs a completed local Arena API match, closes the server, starts another server with the same JSONL store, and verifies that completed match records load through the existing read endpoints.

This first persistence package keeps replay JSONL contents in `arena/replays` and persists only completed match record/result data plus replay metadata/path. PostgreSQL remains a later Stage 12 storage layer after schema and migration decisions.

Updated Agent API, Arena API server contract, Runner Overview, Runner Checks, Project Plan, Working Agreement, and the post-Stage 11 architecture decision docs.

Verification:

- ran `npm.cmd run arena:server-store-smoke`; it passed.
- ran `npm.cmd run arena:check`; it passed.

This does not add PostgreSQL, Docker, migrations, frontend, ratings, session endpoints, action/session MCP tools, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Added post-Stage 11 architecture decision note

Added `docs/POST_STAGE11_ARCHITECTURE_DECISION.md` to frame the next architecture choice after the read-only MCP adapter slice.

The note compares:

- Option A: move to Stage 12 persistence first;
- Option B: add local Arena API session endpoints first.

It recommends Stage 12 persistence first unless MCP-controlled live agents are the immediate priority, and records that no code should start for either path until the direction is chosen.

Updated MCP Stage 11 Review, Agent API, Project Plan, and Working Agreement docs.

Verification: documentation-only package, so `npm.cmd run arena:check` was not run.

This does not add persistence, session endpoints, action/session MCP tools, shell access, filesystem access, direct replay file reads, frontend, database, ratings, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Added Stage 11 MCP closure review

Added `docs/MCP_STAGE11_REVIEW.md` as the closure note for the read-only Stage 11 MCP adapter slice.

The review records:

- completed read-only MCP tools/resources;
- smoke coverage and inclusion in `npm.cmd run arena:check`;
- safety boundaries that remain closed;
- deferred action/session tools;
- the future dependency on `docs/MCP_SESSION_MODEL.md` and explicit Arena API session endpoints.

Updated MCP README, Agent API, Project Plan, and Working Agreement docs.

Verification: documentation-only package, so `npm.cmd run arena:check` was not run.

This does not add action/session MCP tools, Arena API session endpoints, shell access, filesystem access, direct replay file reads, frontend, database, ratings, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Documented MCP session model design gate

Added `docs/MCP_SESSION_MODEL.md` as the design-only gate for future MCP action/session tools.

The document keeps the current MCP adapter read-only and describes the future pull-style session model at a contract level:

- Arena API owns match/session state;
- MCP adapter remains a thin localhost request/response wrapper;
- future tools can include `openfront_join_match`, `openfront_get_observation`, `openfront_submit_action`, and `openfront_resign`;
- action submission should use `turnID`/pending action tickets so late or duplicate actions can be rejected and audited;
- implementation must wait for explicit Arena API session endpoints and a separate architecture approval.

Updated MCP README, Agent API, Project Plan, and Working Agreement docs.

Verification: documentation-only package, so `npm.cmd run arena:check` was not run.

This does not add action/session MCP tools, Arena API session endpoints, shell access, filesystem access, direct replay file reads, frontend, database, ratings, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Hardened MCP smoke boundaries

Extended the Stage 11 MCP smoke check for the current read-only adapter.

Added negative smoke coverage for:

- unknown match IDs returning MCP tool errors;
- non-HTTP `ARENA_API_URL` values being rejected before server startup;
- non-localhost `ARENA_API_URL` values being rejected before server startup.

Updated MCP README, Agent API, and Runner Checks docs.

Verification:

- ran `npm.cmd run arena:mcp-smoke`; it passed.
- ran `npm.cmd run arena:check`; it passed.

This does not add action/session MCP tools, shell access, filesystem access, direct replay file reads, frontend, database, ratings, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Added MCP replay metadata tool

Extended the Stage 11 read-only MCP adapter with:

- `openfront_get_replay_metadata`.

The new tool reads replay metadata from the configured local Arena API server through the existing TypeScript SDK helper. It returns the replay format and path from `GET /arena/matches/:matchID/replay` without reading the JSONL replay file directly.

Updated the MCP smoke check so it verifies the new tool is listed as read-only and returns metadata for a completed local match.

Updated MCP README, Agent API, Runner Overview, Runner Checks, Project Plan, and Working Agreement docs.

Verification:

- ran `npm.cmd run arena:mcp-smoke`; it passed.
- ran `npm.cmd run arena:check`; it passed.

This does not add action/session MCP tools, shell access, filesystem access, direct replay file reads, frontend, database, ratings, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Added read-only MCP Arena API tools

Extended the Stage 11 MCP adapter while keeping it read-only and localhost-only.

Added MCP tools:

- `openfront_list_matches`;
- `openfront_get_match_status`;
- `openfront_get_result`.

The tools read completed in-memory match records and results from the configured local Arena API server through the existing TypeScript SDK helper. `ARENA_API_URL` must be a localhost HTTP URL and defaults to `http://127.0.0.1:5000`.

Updated the MCP smoke check so it starts a local Arena API server, starts local example agents, creates a short match through the normal SDK path, and reads the completed match through MCP tools.

Updated MCP README, Agent API, Agent Rules, Runner Overview, Runner Checks, Project Plan, and Working Agreement docs.

Verification:

- ran `npm.cmd run arena:mcp-smoke`; it passed.

This does not add action/session MCP tools, shell access, filesystem access, replay file reads, frontend, database, ratings, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Added first read-only MCP adapter slice

Started Stage 11 after confirming the MCP SDK direction: use the official TypeScript MCP SDK and keep the adapter as a thin local layer.

Added:

- `@modelcontextprotocol/sdk`;
- `arena/mcp/openfront-arena-mcp/src/server.ts`;
- `arena/mcp/openfront-arena-mcp/src/rules.ts`;
- `arena/mcp/openfront-arena-mcp/src/smoke.ts`;
- `arena/mcp/openfront-arena-mcp/README.md`;
- `npm.cmd run arena:mcp`;
- `npm.cmd run arena:mcp-smoke`;
- inclusion of `arena:mcp-smoke` in `npm.cmd run arena:check`.

The first MCP slice exposes only:

- read-only tool `openfront_get_rules`;
- read-only resource `openfront://rules`.

The adapter embeds a concise rules summary instead of reading local files at runtime. It does not expose shell tools, filesystem tools, replay file reads, direct OpenFront core access, private data access, or action/session tools.

Updated Agent API, Agent Rules, Runner Overview, Runner Checks, Architecture, Project Plan, and Working Agreement docs.

Verification:

- ran `npm.cmd run arena:mcp-smoke`; it passed.

This does not add frontend, database, ratings, `src/core`, OpenFront game loop changes, game rule changes, hosted user code, or public endpoints.

## 2026-05-10 - Wrote first full Agent Rules document

Completed Stage 10 documentation for `docs/AGENT_RULES.md`.

Replaced the placeholder with a practical first version for people and LLM agents. It now covers:

- current local-only Arena limits;
- match lifecycle;
- observation and response formats;
- supported actions: `spawn`, `wait`, and neutral `attack`;
- legal and illegal actions;
- decision time limits;
- hidden information boundaries;
- current scoring and audit penalties;
- anti-cheat rules;
- replay audit behavior;
- 3 valid action examples and 3 invalid action examples;
- simple LLM-agent advice.

Updated `docs/AGENT_API.md`, `docs/RUNNER_OVERVIEW.md`, and `docs/WORKING_AGREEMENT.md` to link or reflect the new rules stage.

No code changed. `npm.cmd run arena:check` was not run for this documentation-only package.

## 2026-05-09 - Added local Python REST SDK helper

Completed the next Stage 9 SDK package using the same local-helper direction as the TypeScript SDK.

Added:

- `arena/sdk/python/arena_client.py` with a small `ArenaClient` for the current local Arena API server REST endpoints;
- REST helpers for `health`, `create_match`, `list_matches`, `get_match`, `get_result`, and `get_replay`;
- `ArenaClientHTTPError` for shared Arena API error responses;
- `arena/sdk/python/arena_client_smoke.py`;
- `arena/sdk/python/arenaClientSmoke.ts`, which starts the live local Arena server and example agents before running the Python smoke check;
- `npm.cmd run arena:sdk-python-smoke`;
- inclusion of the Python SDK smoke check in `npm.cmd run arena:check`.

The Python helper uses only the standard library and is not packaged for PyPI.

Python WebSocket spectator helpers remain a later small slice, because they need a dependency choice or a deliberately REST-only SDK decision.

Updated Agent API, Arena API server contract, runner checks, runner overview, architecture, and working agreement docs.

Verification:

- ran `npm.cmd run arena:sdk-python-smoke`; it passed.

This does not add published SDK packages, frontend, MCP, database, ratings, `src/core`, OpenFront game loop changes, or game rule changes.

## 2026-05-09 - Added local TypeScript SDK helper

Completed the first Stage 9 SDK package using the approved local-helper direction instead of published npm or PyPI packages.

Added:

- `arena/sdk/typescript/arenaClient.ts` with a small `ArenaClient` for the current local Arena API server;
- REST helpers for `health`, `createMatch`, `listMatches`, `getMatch`, `getResult`, and `getReplay`;
- spectator helpers for `ws://.../arena/events`;
- `arena/sdk/typescript/arenaClientSmoke.ts`;
- `npm.cmd run arena:sdk-typescript-smoke`;
- inclusion of the SDK smoke check in `npm.cmd run arena:check`.

The smoke check starts a local Arena API server, starts the local HTTP example agents, creates a match through the SDK, verifies match/result/replay/list reads, and verifies the spectator event stream.

Updated Agent API, Arena API server contract, and runner checks docs.

Python remains a documented next SDK slice and was not packaged.

Verification:

- ran `npm.cmd run arena:sdk-typescript-smoke`; it passed.

This does not add published SDK packages, frontend, MCP, database, ratings, `src/core`, OpenFront game loop changes, or game rule changes.

## 2026-05-09 - Added local WebSocket spectator event stream

Completed the first Stage 8 WebSocket package after confirming the architecture direction: WebSocket is spectator-only for now, while HTTP remains the control path and agents still answer through HTTP `/decide`.

Added:

- `arena/server/src/arenaApiEvents.ts` for Arena API event types and decision-to-event conversion;
- WebSocket upgrade handling in `arena/server/src/arenaApiServer.ts` at `/arena/events`;
- live event emission from `arena/server/src/arenaHttpMatchRunner.ts`;
- a post-tick hook in `arena/runner/src/matchLoop.ts`;
- `arena/server/src/arenaApiSpectatorClientExample.ts`;
- `arena/server/src/arenaApiServerEventsSmoke.ts`;
- `npm.cmd run arena:server-spectator`;
- `npm.cmd run arena:server-events-smoke`.

The initial spectator event stream emits:

- `match.started`;
- `action.accepted`;
- `action.rejected`;
- `match.tick`;
- `match.ended`.

Spectator connections are read-only. Sending a WebSocket message closes the connection with policy code `1008`.

Updated Agent API, Arena API server contract, runner checks, runner overview, and project plan docs.

Verification:

- ran `npm.cmd run arena:server-events-smoke`; it passed;
- ran `npm.cmd run arena:check`; it passed.

This does not move agent actions to WebSocket, add frontend, MCP, database, ratings, `src/core`, OpenFront game loop changes, or game rule changes.

## 2026-05-09 - Hardened Arena API server MVP behavior

Completed a compact Arena API server hardening and documentation package.

Server behavior now includes:

- `409 match_already_exists` for repeated or currently reserved `matchID` values;
- predictable completed match responses when local agent endpoints are unreachable and the runner can continue;
- replay audit entries for unreachable-agent decisions as rejected `agent.decide` decisions;
- `400 invalid_json` for malformed JSON request bodies;
- `413 request_body_too_large` for oversized match request bodies;
- `405 method_not_allowed` for unsupported methods on existing routes;
- `GET /arena/matches` for the current in-memory completed match list.

Extended `arena/server/src/arenaApiServerSmoke.ts` to cover duplicate match IDs, unreachable local agents, invalid JSON, oversized bodies, method rejection, empty match lists, completed match lists, read endpoints, and replay validation.

Updated Arena API docs with current localhost `/decide` MVP behavior, curl examples, list endpoint docs, and the current check rule that documentation-only packages do not need `npm.cmd run arena:check`.

Verification during the code packages:

- ran `npm.cmd run arena:server-smoke`; it passed;
- ran `npm.cmd run arena:check`; it passed.

The final `DEVELOPMENT_LOG.md` update was documentation-only, so `npm.cmd run arena:check` was not rerun for this note.

This does not add database persistence, frontend, MCP, ratings, `src/core`, OpenFront game loop changes, or game rule changes.

Follow-up usability package in the same milestone:

- added `arena/agents/httpExampleAgentLauncher.ts`;
- added `npm.cmd run arena:http-example-server` for two long-running local `/decide` example agents on ports `5001` and `5002`;
- added `arena/agents/httpExampleAgentLauncherSmoke.ts`;
- added `npm.cmd run arena:http-example-server-smoke`;
- included `arena:http-example-server-smoke` in `npm.cmd run arena:check`;
- documented the manual Arena API server demo flow.

Verification for the follow-up package:

- ran `npm.cmd run arena:http-example-server-smoke`; it passed;
- ran `npm.cmd run arena:check`; it passed.

## 2026-05-09 - Added Arena match read endpoints

Completed a small server read-endpoint package.

Updated `arena/server/src/arenaApiServer.ts` so completed `POST /arena/matches` results are stored in memory while the process is alive.

Added read support for:

- `GET /arena/matches/:matchID`;
- `GET /arena/matches/:matchID/result`;
- `GET /arena/matches/:matchID/replay`.

Extended `arena/server/src/arenaApiServerSmoke.ts` to run a match, read the completed match record, read the result, read replay metadata, and check `404 match_not_found` for an unknown match.

Updated Agent API, runner checks, runner overview, and Arena API server contract docs.

Verification before full check: ran `npm.cmd run arena:server-smoke`; it passed.

Full verification: ran `npm.cmd run arena:check`; it passed.

This does not add database persistence, frontend, MCP, ratings, `src/core`, OpenFront game loop changes, or game rule changes.

## 2026-05-09 - Connected Arena match endpoint to HTTP match execution

Completed the first match-running Arena API server package.

Added `arena/server/src/arenaHttpMatchRunner.ts`. It turns a validated `POST /arena/matches` request into:

- headless OpenFront runner setup;
- two `HttpAgentClient` instances;
- shared replay start events;
- shared `matchLoop.ts` execution;
- shared match result building;
- JSONL replay `match_end`.

Updated `arena/server/src/arenaApiServer.ts` so valid `POST /arena/matches` requests now run synchronously and return `200 completed` with result and replay path. Invalid requests still return `400 invalid_match_request`.

Updated `arena/server/src/arenaApiServerSmoke.ts` so it starts two live HTTP example agents, calls `POST /arena/matches`, verifies the completed result, and validates the generated replay through `replaySemanticValidation.ts`.

Updated replay metadata runner typing with `api-http`.

Updated Agent API, runner checks, runner overview, and Arena API server contract docs.

Verification before full check: ran `npm.cmd run arena:server-smoke`; it passed.

Full verification: ran `npm.cmd run arena:check`; it passed.

This does not add read endpoints yet. It does not touch frontend, MCP, database, ratings, `src/core`, the OpenFront game loop, or game rules.

## 2026-05-09 - Added Arena match request validation

Completed a small server validation package.

Added `arena/server/src/arenaMatchRequestValidation.ts`. It validates the minimal `POST /arena/matches` request shape before match execution exists:

- non-empty `matchID`;
- current supported plains test map;
- positive `maxTicks`;
- positive `agentDecisionTimeoutMs`;
- exactly two agents;
- unique agent `clientID` values;
- localhost HTTP `/decide` endpoints only;
- non-negative integer spawn coordinates.

Updated `arena/server/src/arenaApiServer.ts` so `POST /arena/matches` validates request JSON. Invalid requests return `400 invalid_match_request`. Valid requests currently return `501 match_execution_not_implemented`, so the API is honest that match execution is not wired in yet.

Extended `arena/server/src/arenaApiServerSmoke.ts` to check invalid match requests, remote endpoint rejection, and the valid-request placeholder response.

Updated Agent API, runner checks, runner overview, and Arena API server contract docs.

Verification before full check: ran `npm.cmd run arena:server-smoke`; it passed.

Full verification: ran `npm.cmd run arena:check`; it passed.

This does not add match execution yet. It does not touch frontend, MCP, database, ratings, `src/core`, the OpenFront game loop, or game rules.

## 2026-05-09 - Added Arena API server health skeleton

Completed the first local Arena API server code package.

Added `arena/server/src/arenaApiServer.ts`. It starts a localhost HTTP server with:

- `GET /arena/health`;
- shared JSON error shape for unknown routes;
- manual startup through `npm.cmd run arena:server`.

Added `arena/server/src/arenaApiServerSmoke.ts` and `npm run arena:server-smoke`. The smoke check starts the server on a random local port, checks the health response, checks an unknown route error, and closes the server.

Included `arena:server-smoke` in `npm run arena:check`.

Updated Agent API, runner checks, runner overview, and Arena API server contract docs.

Verification before full check: ran `npm.cmd run arena:server-smoke`; it passed.

Full verification: ran `npm.cmd run arena:check`; it passed.

This does not add `POST /arena/matches` yet. It does not touch frontend, MCP, database, ratings, `src/core`, the OpenFront game loop, or game rules.

## 2026-05-09 - Added minimal Arena API server contract

Completed a documentation package for the next architecture stage.

Added `docs/ARENA_API_SERVER_CONTRACT.md`. It defines the planned localhost-only Arena API server MVP:

- `GET /arena/health`;
- `POST /arena/matches`;
- `GET /arena/matches/:matchID`;
- `GET /arena/matches/:matchID/result`;
- `GET /arena/matches/:matchID/replay`.

The contract chooses the current proven direction for the first MVP: Arena calls each agent's HTTP `/decide` endpoint through the existing `HttpAgentClient`. The older pull-style observation/action endpoint model is deferred because it needs more session state.

Updated `docs/AGENT_API.md` and `docs/RUNNER_OVERVIEW.md` to link to the new server contract.

Updated `docs/WORKING_AGREEMENT.md` so the current stage no longer points at the old first local baseline-agent match step. The current stage is now the transition from runner/replay foundation to a minimal local Arena API server.

Verification: ran `npm.cmd run arena:check`; it passed.

This is documentation only. It does not add an Arena Agent API server yet, and it does not touch frontend, MCP, database, ratings, `src/core`, the OpenFront game loop, or game rules.

## 2026-05-09 - Added replay reader negative smoke check

Completed a grouped replay reader safety step.

Added `arena/runner/src/replayReaderSmoke.ts` and `npm run arena:replay-reader`.

The new smoke check verifies that `replayReader.ts` accepts a valid replay event and rejects:

- malformed JSONL;
- non-object JSON lines;
- unknown replay event types.

Updated `replayReader.ts` so malformed JSON now reports the replay line number before semantic replay checks run.

Included `arena:replay-reader` in `npm run arena:check`.

Updated Agent API, runner checks, runner overview, and development log.

Verification before full check: ran `npm.cmd run arena:replay-reader`; it passed.

Full verification: ran `npm.cmd run arena:check`; it passed.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Reviewed runner cleanup after commit

Completed a short post-cleanup review of the current runner/replay layer.

Confirmed that the project is still in the runner/replay foundation stage: local and mixed HTTP/local headless matches work, replay audit works, and the full Agent API server, frontend, MCP, database, and ratings are still intentionally not started.

Removed the obsolete local match result compatibility wrapper. Current result logic now lives directly in `arena/runner/src/matchResult.ts`.

Cleaned up one duplicate `docs/LOCAL_MATCH_RESULT.md` reference in `docs/RUNNER_OVERVIEW.md`.

Recommended next small technical step: add a focused negative smoke check for `replayReader.ts`, covering malformed JSONL, non-object lines, and unknown replay event types. This stays inside runner/replay safety work and does not touch frontend, MCP, database, ratings, `src/core`, or game rules.

Verification before full check: ran `npm.cmd run arena:check`; it passed.

## 2026-05-09 - Handoff checkpoint after runner/replay cleanup

Current runner status:

- headless local runner works without changing OpenFront core game rules;
- local baseline-agent match writes `arena/replays/arena-local-match.jsonl`;
- mixed HTTP/local match writes `arena/replays/arena-http-mixed-match.jsonl`;
- agent turn pipeline supports sync local agents and async external clients;
- HTTP client skeleton and live local HTTP example agent are covered by smoke checks;
- malformed/failed/timed-out agent decisions become rejected replay decisions.

Current shared runner helpers:

- `arena/runner/src/agentTurnPipeline.ts`: one-agent decision flow;
- `arena/runner/src/matchLoop.ts`: shared per-turn match loop for replay-writing matches;
- `arena/runner/src/matchResult.ts`: shared final match result building;
- `arena/runner/src/replayLifecycle.ts`: shared replay agent list plus metadata/start/end event construction;
- `arena/runner/src/replaySemanticValidation.ts`: shared semantic replay validation;
- `arena/runner/src/agentStateAssertions.ts`: shared final-agent state assertions.

Current focused smoke checks:

- `npm.cmd run arena:agent-state`;
- `npm.cmd run arena:match-loop`;
- `npm.cmd run arena:match-result`;
- `npm.cmd run arena:replay-lifecycle`;
- `npm.cmd run arena:pipeline`;
- `npm.cmd run arena:http-client`;
- `npm.cmd run arena:http-example`;
- `npm.cmd run arena:http-match`;
- `npm.cmd run arena:replay`.

Always run the full check after a package:

```text
npm.cmd run arena:check
```

The next safe implementation package is to pause code work, commit this runner/replay cleanup series, push it to GitHub, and continue in a fresh chat with the prompt below. Do not touch `src/core`, the OpenFront game loop, frontend, MCP, database, or ratings.

## 2026-05-09 - Added replay lifecycle smoke check

Completed a grouped replay lifecycle verification step.

Added `arena/runner/src/replayLifecycleSmoke.ts` and `npm run arena:replay-lifecycle`.

The new smoke check verifies:

- replay agent list building;
- `replay_metadata` and `match_start` event writing;
- `match_end` event construction;
- reading the generated lifecycle replay back through `replayReader`.

Included `arena:replay-lifecycle` in `npm run arena:check`.

Updated runner checks, runner overview, and development log handoff.

Verification before full check: ran `npm.cmd run arena:replay-lifecycle`; it passed.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Cleaned up runner documentation roles

Completed a grouped documentation cleanup step after the runner helper extraction series.

Kept `docs/RUNNER_OVERVIEW.md` focused on the runner map and main modules, with detailed focused smoke command descriptions left to `docs/RUNNER_CHECKS.md`.

Rewrote `docs/AGENT_API.md` so it focuses on the current agent-facing contract:

- observation;
- actions;
- HTTP example boundary;
- replay audit;
- where to find the full runner command list.

Updated the development log handoff to point to the next safe implementation package.

Verification before full check: documentation formatting passed.

This does not change runner behavior and does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Added match result smoke check

Completed a grouped match-result verification step.

Added `arena/runner/src/matchResultSmoke.ts` and `npm run arena:match-result`.

The new smoke check verifies:

- common replay result building;
- local result building with `supportedActions`;
- conversion from result data to replay `match_end` event.

Included `arena:match-result` in `npm run arena:check`.

Updated Agent API, runner checks, runner overview, local match result docs, and development log handoff.

Verification before full check: ran `npm.cmd run arena:match-result`; it passed.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Extracted shared match result builder

Completed a grouped match result cleanup step.

Added `arena/runner/src/matchResult.ts`. It builds common final match result fields from shared match-loop counters and final agent summaries, and converts result objects to replay `match_end` events.

Updated `arena/runner/src/types.ts` with a reusable `ReplayMatchResult` type. `LocalMatchResult` now extends that base result with `supportedActions`.

Updated `arena/runner/src/localMatch.ts` so the local baseline match builds a shared replay result first, then adds `supportedActions` for the local console result.

Updated `arena/runner/src/httpMixedMatchSmoke.ts` so the mixed HTTP/local match builds the same shared replay result before writing `match_end`.

Updated Agent API, runner overview, local match result docs, development log, and the handoff checkpoint.

Verification before full check: ran `npm.cmd run arena:local` and `npm.cmd run arena:http-match`; both passed.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

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

Added `LocalMatchResult` and `LocalMatchEndReplayEvent` types in `arena/runner/src/types.ts`, plus local result helpers. The local baseline-agent match now builds one typed result object, prints it, and writes `match_end` from the same result fields.

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

## 2026-05-09 - Added local agent contract JSON Schema checks

Completed a grouped agent contract hardening step.

Added JSON Schema objects for the current local `AgentObservation` and `AgentAction` payloads in `arena/runner/src/agentContractSchema.ts`.

Added a small runtime shape checker in `arena/runner/src/agentContractValidation.ts`. It accepts valid current observation/action payloads and rejects malformed payloads such as unknown action types, extra fields, bad spawn coordinates, bad attack targets, and unexpected observation fields.

Added `npm run arena:contract` and included it in `npm run arena:check`.

Updated the Agent API and runner checks documentation to point to the current TypeScript types, JSON Schema objects, runtime shape checker, and contract check command.

This is still local runner work. It does not add HTTP Agent API, frontend, MCP, database, ratings, or any OpenFront core game logic changes.

## 2026-05-09 - Added raw AgentAction input parser

Completed a grouped input-boundary step for the future external Agent API.

Added `arena/runner/src/agentActionInput.ts`. It accepts an `unknown` value and returns either an accepted typed `AgentAction` or a rejected result with a path and reason.

Added `npm run arena:action-input` with smoke cases for accepted `wait`, `spawn`, and neutral `attack` payloads, plus rejected malformed inputs such as non-objects, unknown action types, extra fields, bad spawn coordinates, and bad attack targets.

Included the new check in `npm run arena:check` and updated the Agent API and runner checks documentation.

This does not start HTTP Agent API yet. It only prepares the safe input boundary that HTTP can reuse later.

## 2026-05-09 - Added replay audit for action input validation

Completed a grouped replay audit step for local agent decisions.

Each replay tick decision now records two separate checks:

- `inputValidation`: whether the raw action input matches the current `AgentAction` contract;
- `validation`: whether a contract-valid action is legal in the current game situation.

If raw input validation fails in the future, the replay decision can record `action: null`, `validation: null`, and `intent: null` with a path and reason in `inputValidation`.

Updated `arena/runner/src/localMatch.ts`, `arena/runner/src/types.ts`, and `arena/runner/src/replaySmoke.ts` so the local replay writes and checks this two-layer audit structure.

Updated the Agent API, runner checks, and local match result documentation.

This remains local runner and replay work. It does not add HTTP Agent API, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Extracted local agent turn pipeline

Completed a grouped runner pipeline extraction step.

Added `arena/runner/src/agentTurnPipeline.ts`. It gathers the local per-agent turn flow in one reusable place:

```text
observation -> raw agent output -> input validation -> game validation -> intent -> replay decision
```

Updated `arena/runner/src/localMatch.ts` so the match loop calls this pipeline instead of carrying all decision plumbing inline.

Added `npm run arena:pipeline` with smoke cases for:

- accepted spawn input that creates a spawn intent;
- rejected raw action input that skips game validation and intent creation;
- contract-valid attack input that is rejected by game-state validation before spawn.

Included the new check in `npm run arena:check` and updated the Agent API and runner checks documentation.

This prepares the runner for a future HTTP Agent API without starting a server or changing OpenFront core game logic.

## 2026-05-09 - Added async ExternalAgentClient contract

Completed a grouped external-agent preparation step without adding HTTP.

Added `ExternalAgentClient` and `AgentDecisionSource` types in `arena/runner/src/types.ts`.

Updated `arena/runner/src/agentTurnPipeline.ts` so `buildLocalAgentDecision` is async and can accept either:

- current synchronous local agents;
- future asynchronous external clients that return `Promise<unknown>`.

Updated `arena/runner/src/localMatch.ts` to await per-agent decisions while keeping the same local baseline-agent behavior.

Extended `npm run arena:pipeline` with a mocked async `ExternalAgentClient` decision.

This does not start an HTTP Agent API server and does not add frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Added async agent decision failure handling

Completed a grouped pipeline hardening step.

Updated `arena/runner/src/agentTurnPipeline.ts` so agent decision calls are protected:

- synchronous thrown errors become rejected decisions;
- rejected promises become rejected decisions;
- decisions that exceed the timeout become rejected decisions.

Failed agent decisions are recorded as `inputValidation` rejections at `agent.decide`. They produce `action: null`, `validation: null`, and `intent: null`, so the match can continue without sending anything into OpenFront.

Extended `npm run arena:pipeline` with smoke cases for throwing agents and timed-out agents.

This is still runner hardening only. It does not add HTTP Agent API, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Moved agent decision timeout into local match config

Completed a grouped local match config clarity step.

Added `agentDecisionTimeoutMs` to `arena/runner/src/localMatchConfig.ts`.

Updated `arena/runner/src/localMatch.ts` so every agent decision uses the configured timeout when calling the agent turn pipeline.

Updated `arena/runner/src/localMatchConfigSmoke.ts` to verify that the timeout is a positive integer, and removed the hidden default timeout from `arena/runner/src/agentTurnPipeline.ts`.

Updated the Agent API, runner checks, local match result docs, and development log so the timeout is documented as a runner setting.

Verification before full check: ran `npm.cmd run arena:config` and `npm.cmd run arena:pipeline`; both passed.

This does not add HTTP Agent API, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Added runner timeout setting to replay metadata

Completed a grouped replay metadata step.

Added `agentDecisionTimeoutMs` to the typed `ReplayMetadataEvent` in `arena/runner/src/types.ts`.

Updated `arena/runner/src/localMatch.ts` so the first `replay_metadata` JSONL record writes the configured agent decision timeout.

Updated `arena/runner/src/replaySmoke.ts` so replay smoke checks that metadata timeout matches `localMatchConfig.agentDecisionTimeoutMs`.

Updated Agent API, runner checks, and local match result documentation to describe the new metadata field.

This does not change OpenFront core game logic and does not add HTTP Agent API, frontend, MCP, database, or ratings.

## 2026-05-09 - Added runner overview documentation

Completed a grouped documentation consolidation step.

Added `docs/RUNNER_OVERVIEW.md`, a compact overview of the current local runner path:

```text
headless OpenFront game -> local agents -> validated actions -> OpenFront intents -> JSONL replay
```

The overview lists the main runner modules, current commands, agent decision pipeline, observation/action contracts, replay event flow, local match success contract, and features that are intentionally not started yet.

Linked the overview from `docs/AGENT_API.md` and `docs/RUNNER_CHECKS.md`.

This is documentation only. It does not change OpenFront core game logic and does not add HTTP Agent API, frontend, MCP, database, or ratings.

## 2026-05-09 - Added HTTP agent client skeleton

Completed a grouped HTTP-client preparation step without adding an HTTP server.

Added `arena/runner/src/httpAgentClient.ts`. It implements `ExternalAgentClient` by sending a `POST` request with `{ observation }` and expecting a JSON response with `{ action }`.

The returned `action` remains raw `unknown`, so it still goes through the existing action input parser, game validation, intent adapter, and replay decision audit.

Added `npm run arena:http-client` with mocked fetch responses. The smoke check verifies:

- successful request and raw action response;
- HTTP error responses become rejected agent decisions through the pipeline;
- malformed response bodies become rejected agent decisions through the pipeline.

Included the new check in `npm run arena:check` and updated Agent API, runner checks, and runner overview documentation.

This does not start an HTTP Agent API server, does not make real network calls in checks, and does not add frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Added live HTTP example agent smoke

Completed a grouped live external-agent example step.

Added `arena/agents/httpExampleAgent.ts`. It starts a small local HTTP server with a `/decide` endpoint that accepts `{ observation }` and returns `{ action }`.

The example agent returns `spawn` while it has not spawned, then `wait` after the headless game shows it as spawned.

Added `npm run arena:http-example`. The smoke check starts the example agent on a local random port, calls it through `HttpAgentClient`, verifies a `spawn` decision, advances the headless game, verifies a later `wait` decision, and closes the server.

Included the new check in `npm run arena:check` and updated Agent API, runner checks, and runner overview documentation.

This is not an Arena Agent API server. It does not add frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Added mixed HTTP/local match smoke

Completed a grouped external-agent match proof step.

Added `arena/runner/src/httpMixedMatchSmoke.ts`.

The smoke check starts the live HTTP example agent, creates a headless match with:

- one HTTP agent connected through `HttpAgentClient`;
- one built-in `FixedSpawnExpandAgent`.

It runs multiple turns, verifies that both agents produce accepted decisions, verifies that the HTTP agent eventually switches from `spawn` to `wait`, and checks that both players spawn, stay alive, and own tiles.

Added `npm run arena:http-match` and included it in `npm run arena:check`.

This is still not an Arena Agent API server. It does not add frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Added replay for mixed HTTP/local match

Completed a grouped mixed-match replay audit step.

Updated `arena/runner/src/httpMixedMatchSmoke.ts` so `npm run arena:http-match` now writes and checks:

```text
arena/replays/arena-http-mixed-match.jsonl
```

The mixed replay uses the existing replay event types and records `runner: "mixed-http-local"` in `replay_metadata`.

The smoke check reads the replay back and verifies metadata timeout, tick count, per-tick decisions, final tick count, and rejected action count.

Updated `arena/runner/src/types.ts` so replay metadata supports both `local` and `mixed-http-local` runner markers.

Updated `arena/runner/src/replaySummary.ts` so replay summaries can use both local agents and external agent clients.

Updated Agent API, runner checks, runner overview, local match result docs, and development log.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Extracted mixed HTTP/local match config

Completed a grouped mixed-match config step.

Added `arena/runner/src/httpMixedMatchConfig.ts` as the single config source for the mixed HTTP/local smoke match. It records match ID, runner marker, map label, max tick count, agent decision timeout, players, agent names, spawn points, and supported actions.

Added `arena/runner/src/httpMixedMatchConfigSmoke.ts` and `npm run arena:http-match-config`.

Updated `arena/runner/src/httpMixedMatchSmoke.ts` to read match settings from the config instead of local constants.

Included the new config check in `npm run arena:check` and updated Agent API, runner checks, runner overview, and development log.

Verification before full check: ran `npm.cmd run arena:http-match-config` and `npm.cmd run arena:http-match`; both passed.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Extracted shared replay semantic validation

Completed a grouped replay-check cleanup step.

Added `arena/runner/src/replaySemanticValidation.ts` as the shared semantic validator for current JSONL replay files. It checks metadata, match start, ordered tick events, per-decision audit fields, match-end counts, rejected action counts, and final agent summaries.

Updated `arena/runner/src/replaySmoke.ts` so the local baseline replay uses this helper instead of keeping the checks inline.

Updated `arena/runner/src/httpMixedMatchSmoke.ts` so the mixed HTTP/local replay is checked by the same helper after the match writes `arena/replays/arena-http-mixed-match.jsonl`.

Updated Agent API, runner checks, runner overview, local match result docs, and development log.

Verification before full check: ran `npm.cmd run arena:http-match`, `npm.cmd run arena:local`, and `npm.cmd run arena:replay`; all passed.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Extracted shared replay lifecycle helpers

Completed a grouped replay-writing cleanup step.

Added `arena/runner/src/replayLifecycle.ts`. It builds the shared replay agent list and writes the common `replay_metadata`, `match_start`, and `match_end` events used by the current runner replays.

Updated `arena/runner/src/localMatch.ts` so the local baseline match uses the helper for replay start events and agent metadata.

Updated `arena/runner/src/httpMixedMatchSmoke.ts` so the mixed HTTP/local match uses the same helper for replay start and end events.

Updated the local match result conversion so local match-end conversion reuses the shared match-end builder.

Updated Agent API, runner checks, runner overview, local match result docs, and development log.

Verification before full check: ran `npm.cmd run arena:local`, `npm.cmd run arena:http-match`, and `npm.cmd run arena:replay`; all passed.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Extracted shared replay-writing match loop

Completed a grouped runner loop cleanup step.

Added `arena/runner/src/matchLoop.ts`. It runs the shared per-turn flow for current replay-writing matches:

```text
agent decisions -> intents -> one GameRunner tick -> replay tick event -> counters
```

Updated `arena/runner/src/localMatch.ts` so the local baseline match uses the shared loop and still builds the same `LocalMatchResult`.

Updated `arena/runner/src/httpMixedMatchSmoke.ts` so the mixed HTTP/local match uses the same loop while keeping its HTTP-specific assertions.

Updated Agent API, runner checks, runner overview, local match result docs, and development log.

Verification before full check: ran `npm.cmd run arena:local`, `npm.cmd run arena:http-match`, and `npm.cmd run arena:replay`; all passed.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Added match loop smoke check

Completed a grouped match-loop verification step.

Added `arena/runner/src/matchLoopSmoke.ts` and `npm run arena:match-loop`.

The new smoke check runs a small headless match through `arena/runner/src/matchLoop.ts` with:

- one normal `FixedSpawnExpandAgent`;
- one test agent that returns one malformed action, then spawns normally.

It verifies total decisions, accepted intents, accepted attack intents, rejected action counting, tick count, update count, and that the rejected decision has no action, game validation, or intent.

Included `arena:match-loop` in `npm run arena:check`.

Updated Agent API, runner checks, runner overview, local match result docs, and development log.

Verification before full check: ran `npm.cmd run arena:match-loop`; it passed.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Extracted final agent state assertions

Completed a grouped final-state assertion cleanup step.

Added `arena/runner/src/agentStateAssertions.ts`. It checks that expected final agents exist, have spawned, are alive, and own at least one tile.

Updated `arena/runner/src/localMatch.ts` so the local baseline match uses the shared helper instead of an inline final-agent condition.

Updated `arena/runner/src/httpMixedMatchSmoke.ts` so the mixed HTTP/local match uses the same helper for final agent state checks.

Updated `arena/runner/src/replaySemanticValidation.ts` so replay semantic validation also uses the same final-agent rule.

Updated Agent API, runner checks, runner overview, local match result docs, and development log.

Verification before full check: ran `npm.cmd run arena:local`, `npm.cmd run arena:http-match`, and `npm.cmd run arena:replay`; all passed.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

## 2026-05-09 - Added final agent state assertion smoke check

Completed a grouped final-state assertion verification step.

Added `arena/runner/src/agentStateAssertionsSmoke.ts` and `npm run arena:agent-state`.

The new smoke check verifies that valid final agent summaries pass and that missing, unspawned, tile-less, or dead final agents are rejected.

Included `arena:agent-state` in `npm run arena:check`.

Updated Agent API, runner checks, runner overview, local match result docs, and development log.

Verification before full check: ran `npm.cmd run arena:agent-state`; it passed.

This does not add an Arena Agent API server, frontend, MCP, database, ratings, or OpenFront core game logic changes.

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
