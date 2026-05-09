import { FixedSpawnExpandAgent } from "./baselineAgents";
import { createHeadlessGameRunner } from "./headless";
import { runReplayMatchTurns } from "./matchLoop";
import { buildReplayAgents } from "./replayLifecycle";
import { createLocalReplayWriter, localReplayFilePath } from "./replayWriter";
import { expectCondition, expectJsonEqual } from "./smokeAssert";
import type { AgentDecisionSource, AgentObservation } from "./types";

const matchID = "arena-match-loop-smoke";
const maxTicks = 112;
const players = [
  {
    username: "MatchLoopA",
    clientID: "match-loop-a",
    isLobbyCreator: true,
  },
  {
    username: "MatchLoopB",
    clientID: "match-loop-b",
  },
];

class RejectOnceThenSpawnAgent implements AgentDecisionSource {
  readonly name = "RejectOnceThenSpawn";
  private decisions = 0;

  decide(observation: AgentObservation): unknown {
    this.decisions += 1;

    if (this.decisions === 1) {
      return {
        type: "wait",
        unexpected: true,
      };
    }

    if (!observation.self.hasSpawned) {
      return {
        type: "spawn",
        x: 80,
        y: 80,
      };
    }

    return { type: "wait" };
  }
}

const agents: Record<string, AgentDecisionSource> = {
  "match-loop-a": new FixedSpawnExpandAgent("MatchLoopExpand", {
    x: 10,
    y: 10,
  }),
  "match-loop-b": new RejectOnceThenSpawnAgent(),
};

const runner = await createHeadlessGameRunner({
  gameID: matchID,
  players,
});
const replay = createLocalReplayWriter(matchID);
const result = await runReplayMatchTurns({
  agentDecisionTimeoutMs: 1000,
  agents,
  matchLabel: "match loop smoke",
  maxTicks,
  players,
  replay,
  runner,
});

await replay.close();

const replayAgents = buildReplayAgents(players, agents);

expectJsonEqual(
  "match loop smoke decisions",
  result.decisions.length,
  maxTicks * 2,
);
expectJsonEqual("match loop smoke ticks", result.ticks, maxTicks);
expectJsonEqual("match loop smoke updates", result.updates, maxTicks);
expectJsonEqual("match loop smoke rejected actions", result.rejectedActions, 1);
expectCondition("match loop smoke has intents", result.intentCount > 0, {
  result,
});
expectCondition(
  "match loop smoke has attack intents",
  result.attackIntents > 0,
  {
    result,
  },
);
expectCondition(
  "match loop smoke rejected decision recorded",
  result.decisions.some(
    (decision) =>
      decision.clientID === "match-loop-b" &&
      decision.inputValidation.status === "rejected" &&
      decision.action === null &&
      decision.validation === null &&
      decision.intent === null,
  ),
  { decisions: result.decisions },
);

console.log("OpenFront Agent Arena match loop smoke check passed.");
console.log(
  JSON.stringify(
    {
      matchID,
      replay: localReplayFilePath(matchID),
      agents: replayAgents,
      decisions: result.decisions.length,
      intents: result.intentCount,
      attackIntents: result.attackIntents,
      rejectedActions: result.rejectedActions,
      ticks: result.ticks,
      updates: result.updates,
    },
    null,
    2,
  ),
);
