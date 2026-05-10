import { spawn } from "node:child_process";
import path from "node:path";

import { repoRoot } from "../../runner/src/headless";

export type ArenaPostgresPsql = (sql: string) => Promise<string>;

export const arenaPostgresConnection = {
  composeFilePath: path.join(repoRoot, "arena/server/docker-compose.postgres.yml"),
  database: "openfront_arena",
  service: "openfront-arena-postgres",
  user: "openfront_arena",
} as const;

export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function runArenaPostgresPsql(sql: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      [
        "compose",
        "-f",
        arenaPostgresConnection.composeFilePath,
        "exec",
        "-T",
        arenaPostgresConnection.service,
        "psql",
        "-U",
        arenaPostgresConnection.user,
        "-d",
        arenaPostgresConnection.database,
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
