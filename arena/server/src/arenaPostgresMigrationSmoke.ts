import fs from "node:fs/promises";
import path from "node:path";

import { repoRoot } from "../../runner/src/headless";
import { expectCondition, expectJsonEqual } from "../../runner/src/smokeAssert";
import { runArenaPostgresMigrations } from "./arenaPostgresMigrate";

const migrationsDir = path.join(repoRoot, "arena/server/migrations");
const expectedMigration = "001_create_arena_match_history.sql";
const expectedTables = [
  "arena_matches",
  "arena_match_players",
  "arena_match_results",
  "arena_match_agent_results",
  "arena_replays",
];
const deferredTables = [
  "arena_users",
  "arena_agents",
  "arena_api_keys",
  "arena_ratings",
  "arena_tournaments",
  "arena_sessions",
  "arena_session_turns",
];

const migrationFiles = (await fs.readdir(migrationsDir))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

expectJsonEqual("arena postgres migration files", migrationFiles, [
  expectedMigration,
]);

const migrationSql = await fs.readFile(
  path.join(migrationsDir, expectedMigration),
  "utf8",
);

expectCondition(
  "arena postgres migration runner export",
  typeof runArenaPostgresMigrations === "function",
  { runArenaPostgresMigrations: typeof runArenaPostgresMigrations },
);

expectCondition(
  "arena postgres migration enables pgcrypto",
  /CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+pgcrypto/i.test(migrationSql),
  { migrationSql },
);

for (const tableName of expectedTables) {
  expectCondition(
    `arena postgres migration creates ${tableName}`,
    new RegExp(`CREATE\\s+TABLE\\s+${tableName}\\b`, "i").test(migrationSql),
    { tableName },
  );
}

for (const tableName of deferredTables) {
  expectCondition(
    `arena postgres migration defers ${tableName}`,
    !new RegExp(`CREATE\\s+TABLE\\s+${tableName}\\b`, "i").test(migrationSql),
    { tableName },
  );
}

expectCondition(
  "arena postgres migration keeps replay contents out of database",
  !/\breplay_events\b/i.test(migrationSql) &&
    !/\bevent_payload\b/i.test(migrationSql),
  { migrationSql },
);

console.log("OpenFront Agent Arena PostgreSQL migration smoke check passed.");
console.log(
  JSON.stringify(
    {
      migrationFiles,
      expectedTables,
      deferredTables,
    },
    null,
    2,
  ),
);
