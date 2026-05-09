# Arena API Server Contract

This document describes the planned minimal local Arena API server.

Current status: `GET /arena/health`, `POST /arena/matches`, and read endpoints for completed in-memory match records are implemented.

This is separate from `docs/API.md`, which describes the public OpenFront API.

No OpenFront core game rules should change for this stage.

## Goal

The first Arena API server should prove this path:

```text
HTTP agent endpoints -> local Arena API server -> headless runner -> result + JSONL replay
```

The server should make the current runner usable through HTTP without adding frontend, database, ratings, tournaments, MCP, Docker, authentication, or public hosting.

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
- return match result and replay file path.

Not allowed yet:

- public internet endpoint;
- authentication or API keys;
- database;
- frontend;
- WebSocket spectator events;
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

### Validate And Run Match

```http
POST /arena/matches
```

Validates a match request and runs a match using the current headless runner path.

Current behavior: valid requests run the match synchronously and return `200 completed`. Invalid requests return the shared `400 invalid_match_request` error shape.

This endpoint currently runs the match immediately and returns after it completes. That keeps the server simple and avoids a job queue.

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

Returns the in-memory match record while the server process is alive.

Current behavior: completed matches are stored in memory after `POST /arena/matches`.

Response:

```json
{
  "matchID": "arena-api-smoke-match",
  "status": "completed",
  "createdAt": "2026-05-09T00:00:00.000Z",
  "completedAt": "2026-05-09T00:00:01.000Z",
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

- `400`: invalid request shape or unsupported match config;
- `404`: match not found;
- `409`: match exists but is not ready for the requested operation;
- `502`: agent endpoint failed;
- `504`: agent decision timed out;
- `500`: unexpected Arena server error.

Agent failures during a match should still be recorded as rejected decisions in replay when the runner can continue.

## Server Storage

The first server should use:

- in-memory match records for status and result;
- JSONL files in `arena/replays` for replay audit.

No database is needed yet.

This keeps the stage small and matches the current runner behavior.

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
