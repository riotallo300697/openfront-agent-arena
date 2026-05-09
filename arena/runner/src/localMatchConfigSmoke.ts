import { localMatchConfig } from "./localMatchConfig";
import { expectCondition, expectNonEmptyString } from "./smokeAssert";

const playerClientIDs = localMatchConfig.players.map(
  (player) => player.clientID,
);
const uniquePlayerClientIDs = new Set(playerClientIDs);
const agentClientIDs = Object.keys(localMatchConfig.agents);
const supportedActions = new Set(localMatchConfig.supportedActions);

expectNonEmptyString("match ID", localMatchConfig.matchID);
expectNonEmptyString("map label", localMatchConfig.map);
expectCondition(
  "max ticks",
  Number.isInteger(localMatchConfig.maxTicks) && localMatchConfig.maxTicks > 0,
  { maxTicks: localMatchConfig.maxTicks },
);
expectCondition(
  "agent decision timeout",
  Number.isInteger(localMatchConfig.agentDecisionTimeoutMs) &&
    localMatchConfig.agentDecisionTimeoutMs > 0,
  { agentDecisionTimeoutMs: localMatchConfig.agentDecisionTimeoutMs },
);
expectCondition("players are present", localMatchConfig.players.length > 0, {
  players: localMatchConfig.players,
});
expectCondition("supported actions are present", supportedActions.size > 0, {
  supportedActions: localMatchConfig.supportedActions,
});
expectCondition(
  "player client IDs are unique",
  uniquePlayerClientIDs.size === playerClientIDs.length,
  { playerClientIDs },
);

for (const player of localMatchConfig.players) {
  expectNonEmptyString("player username", player.username);
  expectNonEmptyString("player client ID", player.clientID);
  expectCondition("player has agent", player.clientID in localMatchConfig.agents, {
    player,
    agentClientIDs,
  });
  expectNonEmptyString(
    "agent name",
    localMatchConfig.agents[player.clientID].name,
  );
}

for (const agentClientID of agentClientIDs) {
  expectCondition("agent belongs to configured player", uniquePlayerClientIDs.has(agentClientID), {
    agentClientID,
    playerClientIDs,
  });
}

console.log("OpenFront Agent Arena local match config smoke check passed.");
console.log(
  JSON.stringify(
    {
      matchID: localMatchConfig.matchID,
      map: localMatchConfig.map,
      maxTicks: localMatchConfig.maxTicks,
      agentDecisionTimeoutMs: localMatchConfig.agentDecisionTimeoutMs,
      players: localMatchConfig.players.length,
      agents: agentClientIDs.length,
      supportedActions: localMatchConfig.supportedActions,
    },
    null,
    2,
  ),
);
