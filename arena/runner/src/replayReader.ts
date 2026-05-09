import fs from "node:fs";

import { expectCondition, isRecord } from "./smokeAssert";
import type { ReplayEvent } from "./types";

const replayEventTypes = new Set<ReplayEvent["type"]>([
  "replay_metadata",
  "match_start",
  "tick",
  "match_end",
]);

function isReplayEventType(value: unknown): value is ReplayEvent["type"] {
  return (
    typeof value === "string" &&
    replayEventTypes.has(value as ReplayEvent["type"])
  );
}

export function readReplayEvents(filePath: string): ReplayEvent[] {
  expectCondition("replay file exists", fs.existsSync(filePath), {
    filePath,
    hint: "Run npm.cmd run arena:local before npm.cmd run arena:replay.",
  });

  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line, index) => {
      const parsed = JSON.parse(line) as unknown;
      expectCondition(`line ${index + 1}: event object`, isRecord(parsed), {
        line,
      });
      expectCondition(
        `line ${index + 1}: known replay event type`,
        isReplayEventType(parsed.type),
        { event: parsed },
      );
      return parsed as ReplayEvent;
    });
}
