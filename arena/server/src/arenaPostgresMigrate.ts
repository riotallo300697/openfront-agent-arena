import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import { repoRoot } from "../../runner/src/headless";

const composeFilePath = path.join(
  repoRoot,
  "arena/server/docker-compose.postgres.yml",
);
const postgresService = "openfront-arena-postgres";
const postgresUser = "openfront_arena";
const postgresDatabase = "openfront_arena";
const migrationsDir = path.join(repoRoot, "arena/server/migrations");

async function listMigrationFiles(): Promise<string[]> {
  const fileNames = await fs.readdir(migrationsDir);
  return fileNames
    .filter((fileName) => /^\d{3}_.+\.sql$/.test(fileName))
    .sort();
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function runPsql(sql: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      [
        "compose",
        "-f",
        composeFilePath,
        "exec",
        "-T",
        postgresService,
        "psql",
        "-U",
        postgresUser,
        "-d",
        postgresDatabase,
        "-v",
        "ON_ERROR_STOP=1",
        "-At",
      ],
      {
        cwd: repoRoot,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const output = Buffer.concat(stdout).toString("utf8");
      const errorOutput = Buffer.concat(stderr).toString("utf8");
      if (code !== 0) {
        reject(
          new Error(
            `psql exited with code ${code}: ${
              errorOutput.length > 0 ? errorOutput : output
            }`,
          ),
        );
        return;
      }

      resolve(output);
    });

    child.stdin.end(sql);
  });
}

async function ensureMigrationTable(): Promise<void> {
  await runPsql(`
    CREATE TABLE IF NOT EXISTS arena_schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedMigrationVersions(): Promise<Set<string>> {
  const output = await runPsql(
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

  await runPsql(`
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
