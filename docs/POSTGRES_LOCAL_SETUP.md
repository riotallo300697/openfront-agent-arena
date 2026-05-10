# PostgreSQL Local Setup

This document describes the local PostgreSQL setup for OpenFront Agent Arena.

Status: first local PostgreSQL migration setup exists, and a PostgreSQL-backed Arena match store adapter is available for manual server runs.

## What Exists

Local PostgreSQL support currently includes:

- `arena/server/docker-compose.postgres.yml`;
- `arena/server/migrations/001_create_arena_match_history.sql`;
- `arena/server/src/arenaPostgresMigrate.ts`;
- `arena/server/src/arenaPostgresMigrationSmoke.ts`;
- `arena/server/src/arenaPostgresMatchStore.ts`;
- `arena/server/src/arenaPostgresMatchStoreSmoke.ts`;
- npm scripts for local startup, shutdown, migration, server mode, and smoke checks.

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

Check the PostgreSQL match store SQL boundary without requiring Docker:

```text
npm.cmd run arena:postgres-store-smoke
```

Start the Arena API server with the PostgreSQL match store:

```text
npm.cmd run arena:server-postgres
```

This mode expects local PostgreSQL to be running and migrated first.

The migration and store smokes are included in:

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

PostgreSQL is wired as an optional match-store backend for `POST /arena/matches` when the manual server is started with `ARENA_MATCH_STORE=postgres`.

Current persistence layers are:

- JSONL replay files in `arena/replays`;
- optional local JSONL match store for completed Arena API records;
- optional PostgreSQL match store for completed Arena API records.

The PostgreSQL match store writes completed records into match-history tables and keeps replay contents in JSONL files. The database stores replay metadata and path only.

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
