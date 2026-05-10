# Arena API Server Contract

This document describes the planned minimal local Arena API server.

Current status: `GET /arena/health`, `POST /arena/matches`, read endpoints for completed match records, optional local JSONL match persistence, and local WebSocket spectator events are implemented.

This is separate from `docs/API.md`, which describes the public OpenFront API.

No OpenFront core game rules should change for this stage.

## Goal

The first Arena API server should prove this path:

```text
HTTP agent endpoints -> local Arena API server -> headless runner -> result + JSONL replay + spectator events
```

The server should make the current runner usable through HTTP without adding frontend, database, ratings, tournaments, MCP, Docker, authentication, or public hosting.

Stage 9 adds local lightweight SDK helpers over this same contract:

- TypeScript in `arena/sdk/typescript/arenaClient.ts`;
- Python in `arena/sdk/python/arena_client.py`.

These helpers do not create published npm/PyPI packages and do not change the HTTP or WebSocket API shape.

## MVP Decision

For the first server prototype, Arena calls each agent endpoint during the match.

That means agents expose:

```text
POST /decide
```

Arena sends:

```json
{
  "observation": {}
}
```

The agent returns:

```json
{
  "action": {}
}
```

This matches the current `HttpAgentClient` and live HTTP example agent.

The older pull-style idea, where an agent asks Arena for observation and then posts an action back, is still useful later. It is not the first server MVP because it needs match sessions, pending turns, and more state management.

## Local-Only Scope

The first server is local development only.

Allowed:

- listen on localhost;
- accept HTTP agent endpoints from the request body;
- run one headless match at a time or a very small in-memory match list;
- write replay files to `arena/replays`;
- keep completed match records in memory while the process is alive;
- optionally load and save completed match records through a local JSONL match store;
- return match result and replay file path;
- stream local spectator events over WebSocket.

Not allowed yet:

- public internet endpoint;
- authentication or API keys;
- database;
- frontend;
- MCP adapter;
- ratings or leaderboard;
- tournaments;
- hosted user code execution;
- changes to `src/core`, game loop, or game rules.

## Minimal Endpoints

### Health

```http
GET /arena/health
```

Returns:

```json
{
  "ok": true,
  "service": "openfront-agent-arena",
  "mode": "local"
}
```

### List Matches

```http
GET /arena/matches
```

Returns completed in-memory match records while the server process is alive.

Current behavior: the response is empty before any match completes.

```json
{
  "matches": []
}
```

### Validate And Run Match

```http
POST /arena/matches
```

Validates a match request and runs a match using the current headless runner path.

Current behavior: valid requests run the match synchronously and return `200 completed`. Invalid JSON returns `400 invalid_json`. Oversized request bodies return `413 request_body_too_large`. Invalid match configs return the shared `400 invalid_match_request` error shape. Reusing an existing or currently reserved `matchID` returns `409 match_already_exists`.

This endpoint currently runs the match immediately and returns after it completes. That keeps the server simple and avoids a job queue.

If a localhost agent endpoint is unreachable during the match, the runner records each failed decision as a rejected replay decision and still returns a completed match record when the match can continue.

Request:

```json
{
  "matchID": "arena-api-smoke-match",
  "map": "tests/testdata/maps/plains",
  "maxTicks": 12,
  "agentDecisionTimeoutMs": 1000,
  "agents": [
    {
      "clientID": "agent-a",
      "name": "AgentA",
      "endpoint": "http://127.0.0.1:5001/decide",
      "spawn": {
        "x": 10,
        "y": 10
      }
    },
    {
      "clientID": "agent-b",
      "name": "AgentB",
      "endpoint": "http://127.0.0.1:5002/decide",
      "spawn": {
        "x": 30,
        "y": 30
      }
    }
  ]
}
```

MVP constraints:

- `agents.length` must be `2`;
- `endpoint` must be a localhost HTTP URL such as `http://127.0.0.1:5001/decide` or `http://localhost:5001/decide`;
- `maxTicks` must be a positive integer;
- `agentDecisionTimeoutMs` must be a positive integer;
- map support can start with the current test plains map only;
- spawn points can start as required explicit coordinates.

Response:

```json
{
  "matchID": "arena-api-smoke-match",
  "status": "completed",
  "createdAt": "2026-05-09T00:00:00.000Z",
  "completedAt": "2026-05-09T00:00:01.000Z",
  "map": "tests/testdata/maps/plains",
  "maxTicks": 12,
  "agentDecisionTimeoutMs": 1000,
  "runner": "api-http",
  "agents": [
    {
      "clientID": "agent-a",
      "name": "AgentA",
      "endpoint": "http://127.0.0.1:5001/decide",
      "spawn": {
        "x": 10,
        "y": 10
      }
    },
    {
      "clientID": "agent-b",
      "name": "AgentB",
      "endpoint": "http://127.0.0.1:5002/decide",
      "spawn": {
        "x": 30,
        "y": 30
      }
    }
  ],
  "result": {
    "matchID": "arena-api-smoke-match",
    "ticks": 12,
    "updates": 12,
    "attackIntents": 0,
    "rejectedActions": 0,
    "agents": [],
    "replay": "arena/replays/arena-api-smoke-match.jsonl"
  },
  "replay": {
    "format": "openfront-agent-arena-jsonl",
    "path": "arena/replays/arena-api-smoke-match.jsonl"
  }
}
```

### Get Match

```http
GET /arena/matches/:matchID
```

Returns the completed match record.

Current behavior: completed matches are stored in memory after `POST /arena/matches`; manual server runs can also load and save them through the local JSONL match store.

Response:

```json
{
  "matchID": "arena-api-smoke-match",
  "status": "completed",
  "createdAt": "2026-05-09T00:00:00.000Z",
  "completedAt": "2026-05-09T00:00:01.000Z",
  "map": "tests/testdata/maps/plains",
  "maxTicks": 12,
  "agentDecisionTimeoutMs": 1000,
  "runner": "api-http",
  "agents": [
    {
      "clientID": "agent-a",
      "name": "AgentA",
      "endpoint": "http://127.0.0.1:5001/decide",
      "spawn": {
        "x": 10,
        "y": 10
      }
    },
    {
      "clientID": "agent-b",
      "name": "AgentB",
      "endpoint": "http://127.0.0.1:5002/decide",
      "spawn": {
        "x": 30,
        "y": 30
      }
    }
  ],
  "result": {}
}
```

### Get Result

```http
GET /arena/matches/:matchID/result
```

Returns only the final match result.

If the match does not exist, return `404`.

All current matches are synchronous and completed before the create response returns. A future async runner may return `409` for in-progress matches.

### Get Replay

```http
GET /arena/matches/:matchID/replay
```

Current behavior: returns metadata plus the replay file path:

```json
{
  "matchID": "arena-api-smoke-match",
  "format": "openfront-agent-arena-jsonl",
  "path": "arena/replays/arena-api-smoke-match.jsonl"
}
```

Returning the full JSONL body can be added later.

### Spectator Event Stream

```http
GET /arena/events
```

This is a WebSocket endpoint for local spectator clients.

Current behavior:

- clients can connect before starting a match;
- match execution broadcasts live events to all connected spectators;
- spectator connections are read-only;
- sending any WebSocket message closes the connection with policy code `1008`;
- agent actions still go through HTTP `/decide`, not WebSocket.

Current event types:

```text
match.started
action.accepted
action.rejected
match.tick
match.ended
```

Example `match.tick` event:

```json
{
  "type": "match.tick",
  "matchID": "arena-api-smoke-match",
  "tick": 1,
  "turnNumber": 0,
  "summary": []
}
```

## Curl Examples

Start the server:

```text
$env:ARENA_API_PORT="5000"
npm.cmd run arena:server
```

The command prints the local URL. The examples below use `http://127.0.0.1:5000`.

In a second terminal, start the two local example agents used by the create-match request:

```text
npm.cmd run arena:http-example-server
```

This starts `http://127.0.0.1:5001/decide` and `http://127.0.0.1:5002/decide`.

Health:

```text
curl.exe http://127.0.0.1:5000/arena/health
```

Create and run a match:

```text
curl.exe -X POST http://127.0.0.1:5000/arena/matches ^
  -H "content-type: application/json" ^
  -d "{\"matchID\":\"arena-api-curl-smoke\",\"map\":\"tests/testdata/maps/plains\",\"maxTicks\":12,\"agentDecisionTimeoutMs\":1000,\"agents\":[{\"clientID\":\"agent-a\",\"name\":\"AgentA\",\"endpoint\":\"http://127.0.0.1:5001/decide\",\"spawn\":{\"x\":10,\"y\":10}},{\"clientID\":\"agent-b\",\"name\":\"AgentB\",\"endpoint\":\"http://127.0.0.1:5002/decide\",\"spawn\":{\"x\":30,\"y\":30}}]}"
```

Read completed match data:

```text
curl.exe http://127.0.0.1:5000/arena/matches
curl.exe http://127.0.0.1:5000/arena/matches/arena-api-curl-smoke
curl.exe http://127.0.0.1:5000/arena/matches/arena-api-curl-smoke/result
curl.exe http://127.0.0.1:5000/arena/matches/arena-api-curl-smoke/replay
```

Repeated `matchID` values return `409 match_already_exists`. Missing match IDs return `404 match_not_found`.

Watch spectator events:

```text
$env:ARENA_API_URL="http://127.0.0.1:5000"
npm.cmd run arena:server-spectator
```

## Error Shape

All planned Arena API errors should use one simple shape:

```json
{
  "error": {
    "code": "invalid_match_request",
    "message": "agents must contain exactly 2 agents",
    "details": {}
  }
}
```

Suggested status codes:

- `400`: invalid JSON, invalid request shape, or unsupported match config;
- `405`: method not allowed for an existing route;
- `413`: request body is too large;
- `404`: match not found;
- `409`: match ID already exists or is already reserved by a running request;
- `502`: agent endpoint failed;
- `504`: agent decision timed out;
- `500`: unexpected Arena server error.

Agent failures during a match should still be recorded as rejected decisions in replay when the runner can continue.

## Server Storage

The first server should use:

- in-memory match records for status and result;
- JSONL files in `arena/replays` for replay audit.

The first Stage 12 persistence boundary is a local JSONL match store for completed records. Each completed record includes the original match metadata needed by the PostgreSQL match-history schema: `map`, `maxTicks`, `agentDecisionTimeoutMs`, `runner`, and the request `agents` list. The store rejects malformed JSONL, invalid record shapes, and duplicate match IDs on load. PostgreSQL remains a later storage layer after schema and migration decisions.

This keeps the stage small and matches the current runner behavior.

The first PostgreSQL schema proposal is documented in `docs/POSTGRES_SCHEMA_PROPOSAL.md`. Local PostgreSQL setup and migration commands are documented in `docs/POSTGRES_LOCAL_SETUP.md`. The current Arena API server does not write completed matches to PostgreSQL yet.

## Local SDK Helpers

The local TypeScript SDK helper currently supports:

- `GET /arena/health` through `health()`;
- `POST /arena/matches` through `createMatch(request)`;
- `GET /arena/matches` through `listMatches()`;
- `GET /arena/matches/:matchID` through `getMatch(matchID)`;
- `GET /arena/matches/:matchID/result` through `getResult(matchID)`;
- `GET /arena/matches/:matchID/replay` through `getReplay(matchID)`;
- `ws://.../arena/events` through `connectEvents(...)` and `createEventCollector(...)`.

Check it with:

```text
npm.cmd run arena:sdk-typescript-smoke
```

The local Python SDK helper currently supports the same REST read/write path:

- `GET /arena/health` through `health()`;
- `POST /arena/matches` through `create_match(request)`;
- `GET /arena/matches` through `list_matches()`;
- `GET /arena/matches/:matchID` through `get_match(match_id)`;
- `GET /arena/matches/:matchID/result` through `get_result(match_id)`;
- `GET /arena/matches/:matchID/replay` through `get_replay(match_id)`.

Check it with:

```text
npm.cmd run arena:sdk-python-smoke
```

Python WebSocket helpers are intentionally left for a later small slice.

## Expected First Implementation Package

The first code package added the smallest local server proof:

1. Add a local Arena server entrypoint under `arena/server`.
2. Add `npm.cmd run arena:server` and `npm.cmd run arena:server-smoke`.
3. Verify `GET /arena/health`.
4. Verify the shared error shape for an unknown route.

The second code package added request validation for `POST /arena/matches`:

1. Validate required match request fields.
2. Restrict agent endpoints to localhost HTTP `/decide` URLs.
3. Return `400 invalid_match_request` for bad requests.
4. Return `501 match_execution_not_implemented` for valid requests until match execution is wired in.

The third code package added match execution behind the validated endpoint:

1. Reuse `HttpAgentClient`, `matchLoop.ts`, `matchResult.ts`, and replay helpers.
2. Start one or two live HTTP example agents inside the smoke check.
3. Call `POST /arena/matches`.
4. Verify completed result and generated replay.
5. Update docs.
6. Run `npm.cmd run arena:check`.

The fourth code package added read endpoints for completed in-memory match records:

1. `GET /arena/matches/:matchID`;
2. `GET /arena/matches/:matchID/result`;
3. `GET /arena/matches/:matchID/replay`.

The next code package should harden server match behavior around repeated match IDs and failed agent endpoints.

## Acceptance Criteria

The server MVP is ready when:

- `GET /arena/health` returns ok;
- `POST /arena/matches` can run a two-agent local HTTP match;
- `GET /arena/matches/:matchID` can return the completed in-memory match record;
- `GET /arena/matches/:matchID/result` can return the final result;
- `GET /arena/matches/:matchID/replay` can return replay metadata and path;
- invalid match requests return the shared error shape;
- agent failure/timeout behavior still becomes replay audit data when the match can continue;
- replay file is written and passes replay reader plus semantic checks;
- the implementation does not touch `src/core`, the OpenFront game loop, or game rules.
