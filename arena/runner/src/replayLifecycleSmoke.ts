import {
  buildReplayAgents,
  buildReplayMatchEndEvent,
  writeReplayEnd,
  writeReplayStart,
} from "./replayLifecycle";
import { readReplayEvents } from "./replayReader";
import { createLocalReplayWriter, localReplayFilePath } from "./replayWriter";
import { expectJsonEqual } from "./smokeAssert";
import type { AgentReplaySummary } from "./types";

const matchID = "arena-replay-lifecycle-smoke";
const players = [
  {
    clientID: "replay-lifecycle-a",
  },
  {
    clientID: "replay-lifecycle-b",
  },
];
const agentsByClientID = {
  "replay-lifecycle-a": {
    name: "ReplayLifecycleA",
  },
  "replay-lifecycle-b": {
    name: "ReplayLifecycleB",
  },
};
const replayAgents = buildReplayAgents(players, agentsByClientID);
const finalAgents: AgentReplaySummary[] = [
  {
    agent: "ReplayLifecycleA",
    clientID: "replay-lifecycle-a",
    hasSpawned: true,
    tilesOwned: 12,
    isAlive: true,
  },
  {
    agent: "ReplayLifecycleB",
    clientID: "replay-lifecycle-b",
    hasSpawned: true,
    tilesOwned: 9,
    isAlive: true,
  },
];
const matchEndInput = {
  matchID,
  ticks: 7,
  updates: 7,
  attackIntents: 2,
  rejectedActions: 1,
  agents: finalAgents,
};

expectJsonEqual("replay lifecycle agents", replayAgents, [
  {
    name: "ReplayLifecycleA",
    clientID: "replay-lifecycle-a",
  },
  {
    name: "ReplayLifecycleB",
    clientID: "replay-lifecycle-b",
  },
]);

expectJsonEqual(
  "replay lifecycle match end builder",
  buildReplayMatchEndEvent(matchEndInput),
  {
    type: "match_end",
    ...matchEndInput,
  },
);

const replay = createLocalReplayWriter(matchID);

writeReplayStart(replay, {
  matchID,
  runner: "mixed-http-local",
  map: "tests/testdata/maps/plains",
  seed: 123,
  maxTicks: 7,
  agentDecisionTimeoutMs: 1000,
  agents: replayAgents,
  supportedActions: ["spawn", "wait", "attack"],
});
writeReplayEnd(replay, matchEndInput);

await replay.close();

const events = readReplayEvents(localReplayFilePath(matchID));

expectJsonEqual(
  "replay lifecycle event types",
  events.map((event) => event.type),
  ["replay_metadata", "match_start", "match_end"],
);
expectJsonEqual("replay lifecycle metadata", events[0], {
  type: "replay_metadata",
  format: "openfront-agent-arena-jsonl",
  version: 1,
  matchID,
  runner: "mixed-http-local",
  map: "tests/testdata/maps/plains",
  seed: 123,
  maxTicks: 7,
  agentDecisionTimeoutMs: 1000,
  agents: replayAgents,
  supportedActions: ["spawn", "wait", "attack"],
});
expectJsonEqual("replay lifecycle match start", events[1], {
  type: "match_start",
  matchID,
  map: "tests/testdata/maps/plains",
  maxTicks: 7,
  agents: replayAgents,
  supportedActions: ["spawn", "wait", "attack"],
});
expectJsonEqual("replay lifecycle match end", events[2], {
  type: "match_end",
  ...matchEndInput,
});

console.log("OpenFront Agent Arena replay lifecycle smoke check passed.");
console.log(
  JSON.stringify(
    {
      matchID,
      replay: localReplayFilePath(matchID),
      events: events.length,
      agents: replayAgents.length,
      firstEvent: events[0].type,
      lastEvent: events[events.length - 1].type,
    },
    null,
    2,
  ),
);
