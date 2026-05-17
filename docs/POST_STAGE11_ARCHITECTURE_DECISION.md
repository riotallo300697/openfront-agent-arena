# Post Stage 11 Architecture Decision

This note frames the next architecture choice after the read-only MCP adapter slice.

Status: Option A selected and implemented as the persistence foundation. Local session endpoints are now the active direction after persistence. The first session slice supports in-memory session lifecycle and agent join only; observation/action endpoints remain future work.

## Context

Stage 11 has a complete read-only local MCP adapter:

- rules access;
- completed match listing;
- match status;
- match result;
- replay metadata;
- smoke coverage in `npm.cmd run arena:check`;
- localhost-only Arena API access;
- no shell, filesystem, replay-file, `src/core`, or action/session access.

Two follow-up directions are now possible:

1. Move to Stage 12 database/persistence.
2. Add local Arena API session endpoints first so future MCP action tools have something safe to wrap.

Both are architecture decisions and should be approved before code begins.

## Option A: Stage 12 Persistence First

This follows the project plan order.

The next code package would start local persistence for completed agents/matches/results while keeping replay files on disk.

Likely first slice:

- choose a local storage approach;
- define minimal persisted match/result schema;
- persist completed Arena API match records;
- keep replay JSONL as files and store only replay metadata/path;
- add focused persistence smoke checks;
- keep the current synchronous `POST /arena/matches` flow.

Benefits:

- aligns with the existing stage order;
- gives completed match history beyond process memory;
- supports later UI, rankings, and replay browsing;
- avoids changing match execution/session architecture yet.

Costs and risks:

- does not unblock MCP action tools;
- introduces storage decisions and migration questions;
- adds another state layer before sessions are designed.

Choose this if the product priority is durable match history, future UI, ratings, and replay catalog work.

## Option B: Local Session Endpoints First

This pauses Stage 12 and adds a new local Arena API session slice before persistence.

The next code package would not add MCP action tools directly. It would add Arena API session endpoints that MCP can later wrap.

Likely first slice:

- document local session endpoint contract;
- create in-memory session records;
- model pending observation/action tickets with `turnID`;
- keep validation and replay audit owned by Arena;
- add smoke checks for join, observation, submit action, timeout/late-action rejection;
- keep the MCP adapter read-only until those endpoints are proven.

Benefits:

- directly unblocks future MCP-controlled agents;
- keeps action/session state out of the MCP adapter;
- validates the pull-style agent flow before persistence;
- makes `docs/MCP_SESSION_MODEL.md` executable later.

Costs and risks:

- is a bigger architecture change than persistence-first;
- may touch runner/server orchestration more deeply;
- must define timing, pending turns, duplicate actions, and resign semantics;
- may be easier after persistence exists, depending on how sessions should survive process restarts.

Choose this if the product priority is MCP agents actively playing matches soon.

## Recommendation

Prefer Option A, Stage 12 persistence first, unless MCP-controlled live agents are the immediate priority.

Reasoning:

- the project plan already puts database/persistence after MCP;
- current Arena API match execution is stable and synchronous;
- persistence improves the usefulness of existing completed matches without changing runner timing;
- session endpoints can be designed more safely after match/result storage boundaries are clearer.

If choosing Option A, keep `docs/MCP_SESSION_MODEL.md` as a deferred design gate and do not add MCP action tools yet.

If choosing Option B, treat it as a new architecture approval before implementation.

## Decision Needed

Before the next code package, choose one:

```text
Option A: Stage 12 persistence first
Option B: local session endpoints first
```

Decision: Option A is selected first. Option B remains next after the persistence foundation.
