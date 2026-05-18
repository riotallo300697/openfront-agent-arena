# MCP Session Model

This document describes the proposed future session model for MCP action tools.

Status: first Arena API session lifecycle slice exists. It supports local in-memory session create/list/get, agent join endpoints, observation-state reads, action envelope validation, a minimal internal in-memory pending ticket model for smoke coverage, a runner-facing helper that creates pending tickets from `AgentObservation`, one-shot internal retrieval of accepted submitted actions, an internal pending-ticket expiry boundary, a runner-facing turn-state helper, a session coordinator skeleton, an internal session runner skeleton with local tick/collection state, an internal API server runner registry created with sessions, runner-to-session progress sync for `currentTick`, `status`, and `completedAt`, an internal session completion summary with decision counts, completed turns, and final observation snapshots, an internal session match artifact adapter for future persistence wiring, an internal API server artifact registry populated when a session runner completes, read-only HTTP lookup endpoints for session artifacts, a separate JSONL store boundary for session match artifacts, and optional API server wiring for that artifact store. Replay audit for pull-style actions, live game advancement, gameplay side effects, and MCP action tools are not implemented yet.

The current MCP adapter remains read-only. It exposes rules, completed match records, results, and replay metadata through the local Arena API server. It does not expose action tools yet.

## Goal

Future MCP-compatible agents should be able to play through Arena without giving the MCP adapter direct access to the runner, filesystem, shell, replay files, `src/core`, or private user data.

The adapter should stay thin:

```text
MCP client -> MCP adapter -> localhost Arena API session endpoints -> runner
```

The Arena API server should own match/session state. The MCP adapter should only translate MCP tool calls into local Arena API requests.

## Why Sessions Are Needed

The current Arena API match endpoint is synchronous:

```text
POST /arena/matches
```

It runs a complete match by calling each agent's HTTP `/decide` endpoint. That model works for HTTP agents because Arena can push observations to each agent.

MCP action tools need the opposite flow:

```text
agent asks for observation -> agent submits action -> Arena advances when actions/timeouts resolve
```

That pull-style flow needs session state:

- active match sessions;
- joined agent identities;
- current pending observation per agent;
- turn IDs or action tickets;
- action deadlines;
- timeout/rejection behavior;
- final result and replay linkage.

Without that state, MCP action tools would either duplicate runner logic inside the adapter or create ambiguous action timing. Both are outside the intended adapter boundary.

## Proposed Session Objects

A future Arena API session record should include:

- `sessionID`: stable session identifier;
- `matchID`: match identifier used for result/replay lookup;
- `status`: `waiting`, `running`, `completed`, `cancelled`, or `failed`;
- `agents`: joined agent identities and display names;
- `createdAt` and optional `completedAt`;
- `currentTick`;
- optional `result` after completion;
- optional `replay` metadata after completion.

A pending action ticket should include:

- `sessionID`;
- `matchID`;
- `clientID`;
- `turnID`;
- `tick`;
- `observation`;
- `deadlineAt`;
- `supportedActions`.

`turnID` is important: `submit_action` must apply only to the current pending observation. Late or duplicate submissions should be rejected and recorded in replay audit by Arena.

Current endpoint:

```text
GET /arena/sessions/:sessionID/agents/:clientID/observation
POST /arena/sessions/:sessionID/agents/:clientID/actions
GET /arena/session-artifacts
GET /arena/session-artifacts/:sessionID
```

Before the pull-style runner exists, joined agents without an internal pending ticket receive `reason: "no_pending_action"` and `pendingAction: null`. The server can also hold a minimal in-memory pending ticket created internally from an `AgentObservation`; in that case, the observation endpoint returns that ticket and submitting the matching `turnID` returns `accepted: true` while consuming the ticket. Accepted actions are stored in a one-shot internal buffer so future runner wiring can retrieve the submitted action by matching `turnID`. Non-matching turn IDs return `409 invalid_turn`. Matching late submissions after `deadlineAt` return `409 action_expired`, and an internal expiry helper can consume expired tickets without accepting an action. Runner-facing helpers now combine those primitives into per-turn and per-session coordinator states for joined agents, plus a local tick-state runner skeleton that opens turn batches and collects decisions until all joined agents are resolved. The Arena API server now creates and keeps an internal runner instance alongside each local session; internal smoke coverage opens a runner turn batch, serves the resulting pending observations through HTTP, accepts matching HTTP action submissions, lets the runner collect submitted decisions, verifies that existing session read endpoints reflect runner progress, builds a local completion summary when the session reaches `maxTicks`, adapts that summary into an internal future match artifact shape, and stores that artifact in an internal registry. A separate JSONL artifact store can save/load those artifacts and rejects malformed, invalid, and duplicate records; when provided to the API server, it preloads artifacts and saves completed session artifacts internally. The artifact registry can list artifacts and read them by `sessionID` or `matchID` internally; the first public artifact endpoints expose list and read-by-sessionID only. This still does not expose runner-control endpoints, apply gameplay actions, advance OpenFront game state, write replay audit events, or expose MCP action tools. The endpoints also enforce `session_not_found`, `client_not_joined`, `invalid_turn`, and invalid action boundaries.

## Future MCP Tools

The likely future MCP action tools are:

```text
openfront_join_match
openfront_get_observation
openfront_submit_action
openfront_resign
```

Read tools that already exist should continue to work:

```text
openfront_get_rules
openfront_list_matches
openfront_get_match_status
openfront_get_result
openfront_get_replay_metadata
```

### `openfront_join_match`

Future input:

```json
{
  "matchID": "arena-session-match",
  "agentName": "MyMcpAgent"
}
```

Future output:

```json
{
  "sessionID": "session-001",
  "matchID": "arena-session-match",
  "clientID": "mcp-agent-a",
  "status": "waiting"
}
```

This tool should not create arbitrary hosted code or execute user code. It should only register an MCP-controlled agent slot in a local Arena API session.

### `openfront_get_observation`

Future input:

```json
{
  "sessionID": "session-001",
  "clientID": "mcp-agent-a"
}
```

Future output:

```json
{
  "sessionID": "session-001",
  "matchID": "arena-session-match",
  "clientID": "mcp-agent-a",
  "turnID": "turn-0003-a",
  "tick": 3,
  "deadlineAt": "2026-05-10T12:00:00.000Z",
  "observation": {},
  "supportedActions": ["spawn", "wait", "attack"]
}
```

If no action is currently needed, Arena should return a clear session state such as `waiting`, `running`, or `completed`.

### `openfront_submit_action`

Future input:

```json
{
  "sessionID": "session-001",
  "clientID": "mcp-agent-a",
  "turnID": "turn-0003-a",
  "action": {
    "type": "wait"
  }
}
```

Future output:

```json
{
  "sessionID": "session-001",
  "matchID": "arena-session-match",
  "clientID": "mcp-agent-a",
  "turnID": "turn-0003-a",
  "accepted": true,
  "status": "running"
}
```

Arena, not MCP, should validate the submitted action through the existing input validation and game validation pipeline. Rejected actions should become replay audit records, matching the current runner behavior.

### `openfront_resign`

Future input:

```json
{
  "sessionID": "session-001",
  "clientID": "mcp-agent-a"
}
```

Future output:

```json
{
  "sessionID": "session-001",
  "matchID": "arena-session-match",
  "clientID": "mcp-agent-a",
  "status": "completed"
}
```

The exact game effect of resigning must be designed separately before implementation, because it may touch gameplay semantics.

## Safety Rules

The future MCP action tools must keep these boundaries:

- no shell access;
- no filesystem access;
- no direct replay file reads;
- no direct `src/core` access;
- no private data access;
- no hosted user code execution;
- localhost Arena API URLs only;
- Arena owns validation, timing, replay audit, and result construction;
- MCP tools are thin request/response wrappers.

## Implementation Gate

Do not implement action/session MCP tools until a future package explicitly adds Arena API session endpoints.

Before implementation, confirm:

- session endpoint shapes;
- match creation/joining flow;
- timeout behavior;
- duplicate/late action handling;
- resign semantics;
- replay audit expectations;
- smoke check plan.

That future implementation may require runner or server architecture changes and should be approved as a separate architecture step.
