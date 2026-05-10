import { expectCondition, expectJsonEqual } from "../../runner/src/smokeAssert";
import type { ArenaMatchRecord } from "./arenaMatchStore";
import {
  buildSaveArenaMatchRecordSql,
  createPostgresArenaMatchStore,
  loadArenaMatchRecordsSql,
} from "./arenaPostgresMatchStore";

const fixtureRecord: ArenaMatchRecord = {
  matchID: "arena-postgres-store-smoke",
  status: "completed",
  createdAt: "2026-05-10T00:00:00.000Z",
  completedAt: "2026-05-10T00:00:01.000Z",
  map: "tests/testdata/maps/plains",
  maxTicks: 3,
  agentDecisionTimeoutMs: 1000,
  runner: "api-http",
  agents: [
    {
      clientID: "postgres-agent-a",
      name: "Postgres Agent A",
      endpoint: "http://127.0.0.1:5001/decide",
      spawn: {
        x: 10,
        y: 10,
      },
    },
    {
      clientID: "postgres-agent-b",
      name: "O'Brien Agent",
      endpoint: "http://127.0.0.1:5002/decide",
      spawn: {
        x: 30,
        y: 30,
      },
    },
  ],
  result: {
    matchID: "arena-postgres-store-smoke",
    ticks: 3,
    updates: 3,
    attackIntents: 0,
    rejectedActions: 1,
    agents: [
      {
        agent: "Postgres Agent A",
        clientID: "postgres-agent-a",
        hasSpawned: true,
        tilesOwned: 52,
        isAlive: true,
      },
      {
        agent: "O'Brien Agent",
        clientID: "postgres-agent-b",
        hasSpawned: true,
        tilesOwned: 52,
        isAlive: true,
      },
    ],
    replay: "arena/replays/arena-postgres-store-smoke.jsonl",
  },
  replay: {
    format: "openfront-agent-arena-jsonl",
    path: "arena/replays/arena-postgres-store-smoke.jsonl",
  },
};

const saveSql = buildSaveArenaMatchRecordSql(fixtureRecord);

for (const tableName of [
  "arena_matches",
  "arena_match_players",
  "arena_match_results",
  "arena_match_agent_results",
  "arena_replays",
]) {
  expectCondition(
    `arena postgres store save sql uses ${tableName}`,
    saveSql.includes(tableName),
    { tableName, saveSql },
  );
  expectCondition(
    `arena postgres store load sql uses ${tableName}`,
    loadArenaMatchRecordsSql.includes(tableName),
    { tableName, loadArenaMatchRecordsSql },
  );
}

expectCondition(
  "arena postgres store save sql escapes strings",
  saveSql.includes("O''Brien Agent"),
  { saveSql },
);

expectCondition(
  "arena postgres store keeps replay events out of sql",
  !/\breplay_events\b/i.test(saveSql) &&
    !/\breplay_events\b/i.test(loadArenaMatchRecordsSql),
  { saveSql, loadArenaMatchRecordsSql },
);

const saveCalls: string[] = [];
const saveStore = createPostgresArenaMatchStore({
  psql: async (sql) => {
    saveCalls.push(sql);
    return "1\n";
  },
});
await saveStore.saveMatch(fixtureRecord);

expectJsonEqual("arena postgres store save calls", saveCalls.length, 1);
expectCondition(
  "arena postgres store save call writes match",
  saveCalls[0]?.includes("INSERT INTO arena_matches") === true,
  { saveCalls },
);

const loadStore = createPostgresArenaMatchStore({
  psql: async (sql) => {
    expectJsonEqual("arena postgres store load sql", sql, loadArenaMatchRecordsSql);
    return JSON.stringify([fixtureRecord]);
  },
});

expectJsonEqual("arena postgres store load records", await loadStore.loadMatches(), [
  fixtureRecord,
]);

const invalidLoadStore = createPostgresArenaMatchStore({
  psql: async () => JSON.stringify([{ matchID: "invalid" }]),
});

let invalidLoadError: unknown = null;
try {
  await invalidLoadStore.loadMatches();
} catch (error) {
  invalidLoadError = error;
}

expectCondition(
  "arena postgres store rejects invalid loaded record",
  invalidLoadError instanceof Error &&
    invalidLoadError.message.includes("invalid PostgreSQL Arena match record"),
  {
    invalidLoadError:
      invalidLoadError instanceof Error
        ? invalidLoadError.message
        : invalidLoadError,
  },
);

console.log("OpenFront Agent Arena PostgreSQL match store smoke check passed.");
console.log(
  JSON.stringify(
    {
      matchID: fixtureRecord.matchID,
      checkedTables: 5,
      dockerRequired: false,
    },
    null,
    2,
  ),
);
