# PostgreSQL Local Setup

This document describes the local PostgreSQL setup for OpenFront Agent Arena.

Status: first local PostgreSQL migration setup exists. Arena API does not write match records to PostgreSQL yet.

## What Exists

Local PostgreSQL support currently includes:

- `arena/server/docker-compose.postgres.yml`;
- `arena/server/migrations/001_create_arena_match_history.sql`;
- `arena/server/src/arenaPostgresMigrate.ts`;
- `arena/server/src/arenaPostgresMigrationSmoke.ts`;
- npm scripts for local startup, shutdown, migration, and migration smoke checks.

The first migration creates only match history tables:

- `arena_matches`;
- `arena_match_players`;
- `arena_match_results`;
- `arena_match_agent_results`;
- `arena_replays`.

It also creates `pgcrypto` so the schema can use `gen_random_uuid()`.

## Commands

Start local PostgreSQL:

```text
npm.cmd run arena:postgres-up
```

Apply migrations:

```text
npm.cmd run arena:postgres-migrate
```

Stop local PostgreSQL:

```text
npm.cmd run arena:postgres-down
```

Check the migration bundle without requiring Docker:

```text
npm.cmd run arena:postgres-migration-smoke
```

The migration smoke is included in:

```text
npm.cmd run arena:check
```

## Local Connection

The Docker Compose service exposes PostgreSQL on:

```text
127.0.0.1:55432
```

Default local credentials:

```text
database: openfront_arena
user: openfront_arena
password: openfront_arena
```

Connection URL:

```text
postgres://openfront_arena:openfront_arena@127.0.0.1:55432/openfront_arena
```

## Current Boundary

PostgreSQL is not yet wired into `POST /arena/matches`.

Current persistence layers are:

- JSONL replay files in `arena/replays`;
- optional local JSONL match store for completed Arena API records;
- PostgreSQL schema and migration tooling prepared for the next package.

The next code package can add a PostgreSQL-backed match store that implements the existing match-store boundary or a sibling persistence adapter.

## Not Included Yet

This setup does not add:

- users;
- API keys;
- ratings;
- tournaments;
- sessions;
- MCP action tools;
- full replay event storage;
- public hosting;
- changes to `src/core`, game loop, or game rules.
