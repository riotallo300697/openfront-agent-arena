CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

CREATE TABLE arena_match_results (
  match_id UUID PRIMARY KEY REFERENCES arena_matches(id) ON DELETE CASCADE,
  ticks INTEGER NOT NULL CHECK (ticks >= 0),
  updates INTEGER NOT NULL CHECK (updates >= 0),
  attack_intents INTEGER NOT NULL CHECK (attack_intents >= 0),
  rejected_actions INTEGER NOT NULL CHECK (rejected_actions >= 0)
);

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

CREATE TABLE arena_replays (
  match_id UUID PRIMARY KEY REFERENCES arena_matches(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format = 'openfront-agent-arena-jsonl'),
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
