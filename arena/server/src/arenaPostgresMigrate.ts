import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { repoRoot } from "../../runner/src/headless";
import { runArenaPostgresPsql, sqlString } from "./arenaPostgresPsql";

const migrationsDir = path.join(repoRoot, "arena/server/migrations");

async function listMigrationFiles(): Promise<string[]> {
  const fileNames = await fs.readdir(migrationsDir);
  return fileNames
    .filter((fileName) => /^\d{3}_.+\.sql$/.test(fileName))
    .sort();
}

async function ensureMigrationTable(): Promise<void> {
  await runArenaPostgresPsql(`
    CREATE TABLE IF NOT EXISTS arena_schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedMigrationVersions(): Promise<Set<string>> {
  const output = await runArenaPostgresPsql(
    "SELECT version FROM arena_schema_migrations ORDER BY version",
  );
  return new Set(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  );
}

async function applyMigration(fileName: string): Promise<void> {
  const sql = await fs.readFile(path.join(migrationsDir, fileName), "utf8");

  await runArenaPostgresPsql(`
    BEGIN;
    ${sql}
    INSERT INTO arena_schema_migrations (version) VALUES (${sqlString(fileName)});
    COMMIT;
  `);
}

export async function runArenaPostgresMigrations({
  requireContainer = true,
}: {
  requireContainer?: boolean;
} = {}): Promise<{
  applied: string[];
  skipped: string[];
}> {
  const applied: string[] = [];
  const skipped: string[] = [];

  if (!requireContainer) {
    return {
      applied,
      skipped,
    };
  }

  await ensureMigrationTable();
  const alreadyApplied = await appliedMigrationVersions();

  for (const fileName of await listMigrationFiles()) {
    if (alreadyApplied.has(fileName)) {
      skipped.push(fileName);
      continue;
    }

    await applyMigration(fileName);
    applied.push(fileName);
  }

  return {
    applied,
    skipped,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const result = await runArenaPostgresMigrations();
  console.log("OpenFront Agent Arena PostgreSQL migrations checked.");
  console.log(JSON.stringify(result, null, 2));
}
