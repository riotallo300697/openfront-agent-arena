import type { AgentReplaySummary } from "../../runner/src/types";
import {
  isArenaMatchRecord,
  type ArenaMatchRecord,
  type ArenaMatchStore,
} from "./arenaMatchStore";
import {
  runArenaPostgresPsql,
  sqlString,
  type ArenaPostgresPsql,
} from "./arenaPostgresPsql";

export type PostgresArenaMatchStoreOptions = {
  psql?: ArenaPostgresPsql;
};

function sqlNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`cannot write non-finite number to PostgreSQL: ${value}`);
  }

  return String(value);
}

function sqlBoolean(value: boolean): string {
  return value ? "TRUE" : "FALSE";
}

function playersCte(record: ArenaMatchRecord): string {
  if (record.agents.length === 0) {
    return "inserted_players AS (SELECT NULL::uuid AS id WHERE FALSE)";
  }

  const rows = record.agents.map((agent, slotIndex) => {
    return `(${[
      sqlString(agent.clientID),
      sqlString(agent.name),
      sqlString(agent.endpoint),
      sqlNumber(slotIndex),
      sqlNumber(agent.spawn.x),
      sqlNumber(agent.spawn.y),
    ].join(", ")})`;
  });

  return `
    inserted_players AS (
      INSERT INTO arena_match_players (
        match_id,
        client_id,
        name,
        endpoint_url,
        slot_index,
        spawn_x,
        spawn_y
      )
      SELECT
        inserted_match.id,
        player.client_id,
        player.name,
        player.endpoint_url,
        player.slot_index,
        player.spawn_x,
        player.spawn_y
      FROM inserted_match
      CROSS JOIN (VALUES
        ${rows.join(",\n        ")}
      ) AS player(client_id, name, endpoint_url, slot_index, spawn_x, spawn_y)
      RETURNING id
    )`;
}

function agentResultsCte(agents: AgentReplaySummary[]): string {
  if (agents.length === 0) {
    return "inserted_agent_results AS (SELECT NULL::uuid AS id WHERE FALSE)";
  }

  const rows = agents.map((agent) => {
    return `(${[
      sqlString(agent.clientID),
      sqlString(agent.agent),
      sqlBoolean(agent.hasSpawned),
      sqlNumber(agent.tilesOwned),
      sqlBoolean(agent.isAlive),
    ].join(", ")})`;
  });

  return `
    inserted_agent_results AS (
      INSERT INTO arena_match_agent_results (
        match_id,
        client_id,
        name,
        has_spawned,
        tiles_owned,
        is_alive
      )
      SELECT
        inserted_match.id,
        agent_result.client_id,
        agent_result.name,
        agent_result.has_spawned,
        agent_result.tiles_owned,
        agent_result.is_alive
      FROM inserted_match
      CROSS JOIN (VALUES
        ${rows.join(",\n        ")}
      ) AS agent_result(client_id, name, has_spawned, tiles_owned, is_alive)
      RETURNING id
    )`;
}

export function buildSaveArenaMatchRecordSql(record: ArenaMatchRecord): string {
  return `
    BEGIN;
    WITH inserted_match AS (
      INSERT INTO arena_matches (
        match_id,
        status,
        map,
        max_ticks,
        agent_decision_timeout_ms,
        runner,
        created_at,
        completed_at
      )
      VALUES (
        ${sqlString(record.matchID)},
        ${sqlString(record.status)},
        ${sqlString(record.map)},
        ${sqlNumber(record.maxTicks)},
        ${sqlNumber(record.agentDecisionTimeoutMs)},
        ${sqlString(record.runner)},
        ${sqlString(record.createdAt)}::timestamptz,
        ${sqlString(record.completedAt)}::timestamptz
      )
      RETURNING id
    ),
    ${playersCte(record)},
    inserted_result AS (
      INSERT INTO arena_match_results (
        match_id,
        ticks,
        updates,
        attack_intents,
        rejected_actions
      )
      SELECT
        inserted_match.id,
        ${sqlNumber(record.result.ticks)},
        ${sqlNumber(record.result.updates)},
        ${sqlNumber(record.result.attackIntents)},
        ${sqlNumber(record.result.rejectedActions)}
      FROM inserted_match
      RETURNING match_id
    ),
    ${agentResultsCte(record.result.agents)},
    inserted_replay AS (
      INSERT INTO arena_replays (
        match_id,
        format,
        path
      )
      SELECT
        inserted_match.id,
        ${sqlString(record.replay.format)},
        ${sqlString(record.replay.path)}
      FROM inserted_match
      RETURNING match_id
    )
    SELECT count(*) FROM inserted_match;
    COMMIT;
  `;
}

export const loadArenaMatchRecordsSql = `
  SELECT COALESCE(json_agg(record), '[]'::json)
  FROM (
    SELECT json_build_object(
      'matchID', arena_matches.match_id,
      'status', arena_matches.status,
      'createdAt', to_char(arena_matches.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'completedAt', to_char(arena_matches.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'map', arena_matches.map,
      'maxTicks', arena_matches.max_ticks,
      'agentDecisionTimeoutMs', arena_matches.agent_decision_timeout_ms,
      'runner', arena_matches.runner,
      'agents', COALESCE((
        SELECT json_agg(json_build_object(
          'clientID', arena_match_players.client_id,
          'name', arena_match_players.name,
          'endpoint', arena_match_players.endpoint_url,
          'spawn', json_build_object(
            'x', arena_match_players.spawn_x,
            'y', arena_match_players.spawn_y
          )
        ) ORDER BY arena_match_players.slot_index)
        FROM arena_match_players
        WHERE arena_match_players.match_id = arena_matches.id
      ), '[]'::json),
      'result', json_build_object(
        'matchID', arena_matches.match_id,
        'ticks', arena_match_results.ticks,
        'updates', arena_match_results.updates,
        'attackIntents', arena_match_results.attack_intents,
        'rejectedActions', arena_match_results.rejected_actions,
        'agents', COALESCE((
          SELECT json_agg(json_build_object(
            'agent', arena_match_agent_results.name,
            'clientID', arena_match_agent_results.client_id,
            'hasSpawned', arena_match_agent_results.has_spawned,
            'tilesOwned', arena_match_agent_results.tiles_owned,
            'isAlive', arena_match_agent_results.is_alive
          ) ORDER BY arena_match_agent_results.name, arena_match_agent_results.client_id)
          FROM arena_match_agent_results
          WHERE arena_match_agent_results.match_id = arena_matches.id
        ), '[]'::json),
        'replay', arena_replays.path
      ),
      'replay', json_build_object(
        'format', arena_replays.format,
        'path', arena_replays.path
      )
    ) AS record
    FROM arena_matches
    JOIN arena_match_results ON arena_match_results.match_id = arena_matches.id
    JOIN arena_replays ON arena_replays.match_id = arena_matches.id
    ORDER BY arena_matches.created_at, arena_matches.match_id
  ) loaded_records
`;

function parseArenaMatchRecordsJson(output: string): ArenaMatchRecord[] {
  const trimmed = output.trim();
  const parsed = JSON.parse(trimmed.length === 0 ? "[]" : trimmed) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("PostgreSQL Arena match store returned non-array JSON");
  }

  for (const [index, record] of parsed.entries()) {
    if (!isArenaMatchRecord(record)) {
      throw new Error(`invalid PostgreSQL Arena match record at index ${index}`);
    }
  }

  return parsed;
}

export function createPostgresArenaMatchStore({
  psql = runArenaPostgresPsql,
}: PostgresArenaMatchStoreOptions = {}): ArenaMatchStore {
  return {
    async loadMatches() {
      return parseArenaMatchRecordsJson(await psql(loadArenaMatchRecordsSql));
    },
    async saveMatch(record) {
      await psql(buildSaveArenaMatchRecordSql(record));
    },
  };
}
