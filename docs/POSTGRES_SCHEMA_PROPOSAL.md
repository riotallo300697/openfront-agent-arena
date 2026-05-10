# PostgreSQL Schema Proposal

This document proposes the first PostgreSQL schema for OpenFront Agent Arena.

Status: approved for the first Stage 12 implementation slice. The Docker Compose setup, first SQL migration, migration runner, and migration smoke check now exist. Arena API does not write match records to PostgreSQL yet.

## Goal

Persist completed Arena API match history and prepare for later platform features without changing the current runner flow.

The first PostgreSQL slice should preserve the current boundary:

```text
Arena API match -> result object -> replay JSONL file -> persisted metadata/result rows
```

Replay contents should stay in JSONL files. PostgreSQL should store replay metadata and paths, not full replay event streams.

## Scope

In scope for the first schema:

- completed match records;
- players/agents that participated in a match;
- final match result counters;
- final agent summaries;
- replay metadata/path;
- enough timestamps and status fields for future match history pages.

Out of scope for the first schema:

- users;
- authentication;
- API keys;
- ratings;
- tournaments;
- live sessions;
- MCP action/session state;
- full replay event storage;
- public hosting concerns.

Those can be layered later.

## Tables

### `arena_matches`

One row per Arena match.

```sql
CREATE TABLE arena_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('completed')),
  map TEXT NOT NULL,
  max_ticks INTEGER NOT NULL CHECK (max_ticks > 0),
  agent_decision_timeout_ms INTEGER NOT NULL CHECK (agent_decision_timeout_ms > 0),
  runner TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Notes:

- `match_id` is the existing public API identifier.
- `id` gives later tables a stable internal key.
- `status` starts with only `completed` because the current API is synchronous.
- `runner` should hold values such as `api-http`.

### `arena_match_players`

One row per participant in a match.

```sql
CREATE TABLE arena_match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slot_index INTEGER NOT NULL CHECK (slot_index >= 0),
  endpoint_url TEXT,
  spawn_x INTEGER,
  spawn_y INTEGER,
  UNIQUE (match_id, client_id),
  UNIQUE (match_id, slot_index)
);
```

Notes:

- `client_id` mirrors the Agent API player ID.
- `endpoint_url` is useful for local audit/debug but may later need redaction if endpoints become sensitive.
- `spawn_x` and `spawn_y` reflect current match request data.

### `arena_match_results`

One row per completed match result.

```sql
CREATE TABLE arena_match_results (
  match_id UUID PRIMARY KEY REFERENCES arena_matches(id) ON DELETE CASCADE,
  ticks INTEGER NOT NULL CHECK (ticks >= 0),
  updates INTEGER NOT NULL CHECK (updates >= 0),
  attack_intents INTEGER NOT NULL CHECK (attack_intents >= 0),
  rejected_actions INTEGER NOT NULL CHECK (rejected_actions >= 0)
);
```

Notes:

- This stores the current aggregate `ReplayMatchResult` counters.
- More counters can be added later or moved to a metrics table.

### `arena_match_agent_results`

One row per final agent summary.

```sql
CREATE TABLE arena_match_agent_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  has_spawned BOOLEAN NOT NULL,
  tiles_owned INTEGER NOT NULL CHECK (tiles_owned >= 0),
  is_alive BOOLEAN NOT NULL,
  UNIQUE (match_id, client_id)
);
```

Notes:

- This keeps final agent state queryable without reading replay JSONL.
- Later ratings can use this table as one input, but ratings are not part of this schema slice.

### `arena_replays`

One row per replay file.

```sql
CREATE TABLE arena_replays (
  match_id UUID PRIMARY KEY REFERENCES arena_matches(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format = 'openfront-agent-arena-jsonl'),
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Notes:

- Store path/format only.
- Do not store replay JSONL lines in PostgreSQL in this slice.
- Path should remain local and relative if possible once the final storage convention is chosen.

## Optional Later Tables

These are intentionally not first-slice tables:

- `arena_users`;
- `arena_agents`;
- `arena_api_keys`;
- `arena_ratings`;
- `arena_rating_events`;
- `arena_tournaments`;
- `arena_sessions`;
- `arena_session_turns`.

They should be added only when their feature stage begins.

## First Migration Shape

The first migration can be:

```text
001_create_arena_match_history.sql
```

It should create:

- `arena_matches`;
- `arena_match_players`;
- `arena_match_results`;
- `arena_match_agent_results`;
- `arena_replays`.

It should not create users, auth, ratings, tournaments, or session tables yet.

## Persistence Mapping

Current `ArenaMatchRecord` maps as:

- `record.matchID` -> `arena_matches.match_id`;
- `record.status` -> `arena_matches.status`;
- request `map` -> `arena_matches.map`;
- request `maxTicks` -> `arena_matches.max_ticks`;
- request `agentDecisionTimeoutMs` -> `arena_matches.agent_decision_timeout_ms`;
- runner marker -> `arena_matches.runner`;
- `record.createdAt` -> `arena_matches.created_at`;
- `record.completedAt` -> `arena_matches.completed_at`;
- request agents -> `arena_match_players`;
- `record.result` counters -> `arena_match_results`;
- `record.result.agents` -> `arena_match_agent_results`;
- `record.replay` -> `arena_replays`.

`ArenaMatchRecord` now stores the request metadata needed for this mapping directly: `map`, `maxTicks`, `agentDecisionTimeoutMs`, `runner`, and `agents`. This keeps the next PostgreSQL writer slice focused on translating one completed record into match-history rows instead of reconstructing request context from replay files.

## Open Decisions

Before implementing migrations, decide:

- Use `gen_random_uuid()` with `pgcrypto`, or use app-generated IDs?
- Store `endpoint_url` in `arena_match_players`, hash it, or omit it?
- Store replay path as absolute path or repo-relative path?
- Keep current public `matchID` rules, or introduce a generated public match ID?
- Use raw SQL migrations, a small migration runner, or an existing migration tool?
- Start PostgreSQL through Docker Compose now, or keep schema proposal only until a later package?

## Recommendation

Start with this minimal match-history schema.

Do not add users, API keys, ratings, tournaments, sessions, or full replay event storage yet.

The first implementation package added:

1. local PostgreSQL Docker Compose;
2. first SQL migration;
3. a small migration/check script;
4. docs for local setup.

The next package can make Arena API write completed match records to PostgreSQL through a storage adapter while keeping replay contents in JSONL files.
