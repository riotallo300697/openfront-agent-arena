import { localMatchConfig } from "./localMatchConfig";
import { localReplayFilePath } from "./replayWriter";
import { validateReplayFileSemantics } from "./replaySemanticValidation";

const localMatchID = localMatchConfig.matchID;
const expectedFinalAgents = localMatchConfig.players.map((player) => ({
  agent: localMatchConfig.agents[player.clientID].name,
  clientID: player.clientID,
}));
const expectedReplayAgents = localMatchConfig.players.map((player) => ({
  name: localMatchConfig.agents[player.clientID].name,
  clientID: player.clientID,
}));

function main() {
  const filePath = localReplayFilePath(localMatchID);
  const result = validateReplayFileSemantics(filePath, {
    matchID: localMatchID,
    runner: "local",
    map: localMatchConfig.map,
    maxTicks: localMatchConfig.maxTicks,
    agentDecisionTimeoutMs: localMatchConfig.agentDecisionTimeoutMs,
    agents: expectedReplayAgents,
    supportedActions: localMatchConfig.supportedActions,
    finalAgents: expectedFinalAgents,
    expectedRejectedActions: 0,
    expectedDecisionsPerTick: localMatchConfig.players.length,
    minAttackIntents: 1,
  });

  console.log("OpenFront Agent Arena replay smoke check passed.");
  console.log(
    JSON.stringify(
      {
        filePath,
        events: result.events.length,
        ticks: result.tickEvents.length,
        matchEndTicks: result.matchEnd.ticks,
        finalAgents: expectedFinalAgents.length,
        firstEvent: result.events[0].type,
        lastEvent: result.matchEnd.type,
      },
      null,
      2,
    ),
  );
}

main();
