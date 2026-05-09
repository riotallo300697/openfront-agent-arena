import fs from "node:fs";
import path from "node:path";

import { readReplayEvents } from "./replayReader";
import { localReplayFilePath } from "./replayWriter";
import { expectCondition, expectJsonEqual } from "./smokeAssert";

function writeReplayFixture(matchID: string, lines: string[]): string {
  const filePath = localReplayFilePath(matchID);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  return filePath;
}

function expectReplayReadFailure({
  expectedMessagePart,
  filePath,
  name,
}: {
  expectedMessagePart: string;
  filePath: string;
  name: string;
}): void {
  try {
    readReplayEvents(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    expectCondition(name, message.includes(expectedMessagePart), {
      expectedMessagePart,
      message,
    });
    return;
  }

  throw new Error(`${name} failed: replay reader accepted invalid input`);
}

const validReplayPath = writeReplayFixture("arena-replay-reader-valid-smoke", [
  JSON.stringify({
    type: "replay_metadata",
    format: "openfront-agent-arena-jsonl",
    version: 1,
    matchID: "arena-replay-reader-valid-smoke",
    runner: "local",
    map: "tests/testdata/maps/plains",
    seed: null,
    maxTicks: 0,
    agentDecisionTimeoutMs: 1000,
    agents: [],
    supportedActions: ["spawn", "wait", "attack"],
  }),
]);

const validEvents = readReplayEvents(validReplayPath);
expectJsonEqual(
  "valid replay reader fixture event types",
  validEvents.map((event) => event.type),
  ["replay_metadata"],
);

expectReplayReadFailure({
  name: "malformed JSONL rejection",
  filePath: writeReplayFixture("arena-replay-reader-malformed-smoke", [
    '{"type":"replay_metadata"',
  ]),
  expectedMessagePart: "line 1: valid JSON failed",
});

expectReplayReadFailure({
  name: "non-object replay line rejection",
  filePath: writeReplayFixture("arena-replay-reader-non-object-smoke", [
    JSON.stringify(["replay_metadata"]),
  ]),
  expectedMessagePart: "line 1: event object failed",
});

expectReplayReadFailure({
  name: "unknown replay event type rejection",
  filePath: writeReplayFixture("arena-replay-reader-unknown-type-smoke", [
    JSON.stringify({
      type: "unknown_replay_event",
      matchID: "arena-replay-reader-unknown-type-smoke",
    }),
  ]),
  expectedMessagePart: "line 1: known replay event type failed",
});

console.log("OpenFront Agent Arena replay reader smoke check passed.");
console.log(
  JSON.stringify(
    {
      validEvents: validEvents.length,
      rejectedCases: 3,
      checkedFailures: [
        "malformed JSONL",
        "non-object line",
        "unknown event type",
      ],
    },
    null,
    2,
  ),
);
