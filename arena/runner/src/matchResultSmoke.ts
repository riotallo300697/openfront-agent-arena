import {
  buildLocalMatchResult,
  buildReplayMatchResult,
  matchResultToMatchEndEvent,
} from "./matchResult";
import { expectJsonEqual } from "./smokeAssert";
import type { AgentReplaySummary } from "./types";

const agents: AgentReplaySummary[] = [
  {
    agent: "ResultA",
    clientID: "result-a",
    hasSpawned: true,
    tilesOwned: 10,
    isAlive: true,
  },
  {
    agent: "ResultB",
    clientID: "result-b",
    hasSpawned: true,
    tilesOwned: 8,
    isAlive: true,
  },
];

const replayResult = buildReplayMatchResult({
  matchID: "arena-match-result-smoke",
  loopResult: {
    ticks: 42,
    updates: 42,
    attackIntents: 3,
    rejectedActions: 1,
  },
  agents,
  replay: "arena/replays/arena-match-result-smoke.jsonl",
});

expectJsonEqual("match result replay result", replayResult, {
  matchID: "arena-match-result-smoke",
  ticks: 42,
  updates: 42,
  attackIntents: 3,
  rejectedActions: 1,
  agents,
  replay: "arena/replays/arena-match-result-smoke.jsonl",
});

const localResult = buildLocalMatchResult({
  ...replayResult,
  supportedActions: ["spawn", "wait", "attack"],
});

expectJsonEqual("match result local result", localResult, {
  matchID: replayResult.matchID,
  ticks: replayResult.ticks,
  updates: replayResult.updates,
  attackIntents: replayResult.attackIntents,
  rejectedActions: replayResult.rejectedActions,
  agents,
  supportedActions: ["spawn", "wait", "attack"],
  replay: replayResult.replay,
});

expectJsonEqual(
  "match result match end event",
  matchResultToMatchEndEvent(localResult),
  {
    type: "match_end",
    matchID: replayResult.matchID,
    ticks: replayResult.ticks,
    updates: replayResult.updates,
    attackIntents: replayResult.attackIntents,
    rejectedActions: replayResult.rejectedActions,
    agents,
  },
);

console.log("OpenFront Agent Arena match result smoke check passed.");
console.log(
  JSON.stringify(
    {
      matchID: replayResult.matchID,
      ticks: replayResult.ticks,
      updates: replayResult.updates,
      attackIntents: replayResult.attackIntents,
      rejectedActions: replayResult.rejectedActions,
      agents: replayResult.agents.length,
      supportedActions: localResult.supportedActions,
    },
    null,
    2,
  ),
);
