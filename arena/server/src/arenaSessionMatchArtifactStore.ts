import fs from "node:fs/promises";
import path from "node:path";

import {
  isArenaSessionMatchArtifact,
  type ArenaSessionMatchArtifact,
} from "./arenaSessionMatchArtifact";

export type ArenaSessionMatchArtifactStore = {
  loadArtifacts(): Promise<ArenaSessionMatchArtifact[]>;
  saveArtifact(artifact: ArenaSessionMatchArtifact): Promise<void>;
};

export function createJsonlArenaSessionMatchArtifactStore(
  filePath: string,
): ArenaSessionMatchArtifactStore {
  return {
    async loadArtifacts() {
      let content = "";
      try {
        content = await fs.readFile(filePath, "utf8");
      } catch (error) {
        if (isRecord(error) && "code" in error && error.code === "ENOENT") {
          return [];
        }

        throw error;
      }

      const artifacts: ArenaSessionMatchArtifact[] = [];
      const matchIDs = new Set<string>();
      const sessionIDs = new Set<string>();

      for (const [index, line] of content.split(/\r?\n/).entries()) {
        if (line.trim().length === 0) {
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(line) as unknown;
        } catch (error) {
          throw new Error(
            `invalid Arena session artifact JSON at line ${index + 1}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }

        if (!isArenaSessionMatchArtifact(parsed)) {
          throw new Error(
            `invalid Arena session artifact record at line ${index + 1}`,
          );
        }

        if (sessionIDs.has(parsed.sessionID)) {
          throw new Error(
            `duplicate Arena session artifact for sessionID ${parsed.sessionID}`,
          );
        }

        if (matchIDs.has(parsed.matchID)) {
          throw new Error(
            `duplicate Arena session artifact for matchID ${parsed.matchID}`,
          );
        }

        sessionIDs.add(parsed.sessionID);
        matchIDs.add(parsed.matchID);
        artifacts.push(parsed);
      }

      return artifacts;
    },
    async saveArtifact(artifact) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.appendFile(filePath, `${JSON.stringify(artifact)}\n`, "utf8");
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
