import fs from "node:fs/promises";
import path from "node:path";

import type { ReplayMatchResult } from "../../runner/src/types";
import type {
  ArenaMatchAgentRequest,
  ArenaMatchRequest,
} from "./arenaMatchRequestValidation";

export type ArenaMatchRunner = "api-http";

export type ArenaMatchRecord = {
  matchID: string;
  status: "completed";
  createdAt: string;
  completedAt: string;
  map: ArenaMatchRequest["map"];
  maxTicks: number;
  agentDecisionTimeoutMs: number;
  runner: ArenaMatchRunner;
  agents: ArenaMatchAgentRequest[];
  result: ReplayMatchResult;
  replay: {
    format: "openfront-agent-arena-jsonl";
    path: string;
  };
};

export type ArenaMatchStore = {
  loadMatches(): Promise<ArenaMatchRecord[]>;
  saveMatch(record: ArenaMatchRecord): Promise<void>;
};

export function createInMemoryArenaMatchStore(): ArenaMatchStore {
  return {
    async loadMatches() {
      return [];
    },
    async saveMatch() {
      return;
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArenaMatchRecordAgent(value: unknown): value is ArenaMatchAgentRequest {
  return (
    isRecord(value) &&
    typeof value.clientID === "string" &&
    typeof value.name === "string" &&
    typeof value.endpoint === "string" &&
    isRecord(value.spawn) &&
    Number.isInteger(value.spawn.x) &&
    Number.isInteger(value.spawn.y)
  );
}

function isArenaMatchRecord(value: unknown): value is ArenaMatchRecord {
  return (
    isRecord(value) &&
    typeof value.matchID === "string" &&
    value.status === "completed" &&
    typeof value.createdAt === "string" &&
    typeof value.completedAt === "string" &&
    value.map === "tests/testdata/maps/plains" &&
    Number.isInteger(value.maxTicks) &&
    Number.isInteger(value.agentDecisionTimeoutMs) &&
    value.runner === "api-http" &&
    Array.isArray(value.agents) &&
    value.agents.every(isArenaMatchRecordAgent) &&
    isRecord(value.result) &&
    isRecord(value.replay) &&
    value.replay.format === "openfront-agent-arena-jsonl" &&
    typeof value.replay.path === "string"
  );
}

export function createJsonlArenaMatchStore(filePath: string): ArenaMatchStore {
  return {
    async loadMatches() {
      let content = "";
      try {
        content = await fs.readFile(filePath, "utf8");
      } catch (error) {
        if (
          isRecord(error) &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return [];
        }

        throw error;
      }

      const records: ArenaMatchRecord[] = [];
      const matchIDs = new Set<string>();
      for (const [index, line] of content.split(/\r?\n/).entries()) {
        if (line.trim().length === 0) {
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(line) as unknown;
        } catch (error) {
          throw new Error(
            `invalid Arena match store JSON at line ${index + 1}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }

        if (!isArenaMatchRecord(parsed)) {
          throw new Error(`invalid Arena match store record at line ${index + 1}`);
        }

        if (matchIDs.has(parsed.matchID)) {
          throw new Error(
            `duplicate Arena match store record for matchID ${parsed.matchID}`,
          );
        }

        matchIDs.add(parsed.matchID);
        records.push(parsed);
      }

      return records;
    },
    async saveMatch(record) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
    },
  };
}
