import { httpMixedMatchConfig } from "./httpMixedMatchConfig";
import { expectCondition, expectJsonEqual, expectNonEmptyString } from "./smokeAssert";

const playerClientIDs = httpMixedMatchConfig.players.map(
  (player) => player.clientID,
);
const uniquePlayerClientIDs = new Set(playerClientIDs);
const supportedActions = new Set(httpMixedMatchConfig.supportedActions);

expectNonEmptyString("mixed match ID", httpMixedMatchConfig.matchID);
expectJsonEqual("mixed match runner", httpMixedMatchConfig.runner, "mixed-http-local");
expectNonEmptyString("mixed match map label", httpMixedMatchConfig.map);
expectCondition(
  "mixed match max ticks",
  Number.isInteger(httpMixedMatchConfig.maxTicks) &&
    httpMixedMatchConfig.maxTicks > 0,
  { maxTicks: httpMixedMatchConfig.maxTicks },
);
expectCondition(
  "mixed match agent decision timeout",
  Number.isInteger(httpMixedMatchConfig.agentDecisionTimeoutMs) &&
    httpMixedMatchConfig.agentDecisionTimeoutMs > 0,
  { agentDecisionTimeoutMs: httpMixedMatchConfig.agentDecisionTimeoutMs },
);
expectCondition(
  "mixed match players are present",
  httpMixedMatchConfig.players.length === 2,
  { players: httpMixedMatchConfig.players },
);
expectCondition(
  "mixed match player client IDs are unique",
  uniquePlayerClientIDs.size === playerClientIDs.length,
  { playerClientIDs },
);
expectCondition("mixed match supported actions are present", supportedActions.size > 0, {
  supportedActions: httpMixedMatchConfig.supportedActions,
});

for (const player of httpMixedMatchConfig.players) {
  expectNonEmptyString("mixed match player username", player.username);
  expectNonEmptyString("mixed match player client ID", player.clientID);
}

for (const agent of [
  httpMixedMatchConfig.httpAgent,
  httpMixedMatchConfig.localAgent,
]) {
  expectNonEmptyString("mixed match agent client ID", agent.clientID);
  expectNonEmptyString("mixed match agent name", agent.name);
  expectCondition("mixed match agent belongs to player", uniquePlayerClientIDs.has(agent.clientID), {
    agent,
    playerClientIDs,
  });
  expectCondition(
    "mixed match agent spawn x",
    Number.isInteger(agent.spawn.x) && agent.spawn.x >= 0,
    { agent },
  );
  expectCondition(
    "mixed match agent spawn y",
    Number.isInteger(agent.spawn.y) && agent.spawn.y >= 0,
    { agent },
  );
}

expectCondition(
  "mixed match agents are different players",
  httpMixedMatchConfig.httpAgent.clientID !== httpMixedMatchConfig.localAgent.clientID,
  {
    httpAgent: httpMixedMatchConfig.httpAgent,
    localAgent: httpMixedMatchConfig.localAgent,
  },
);

console.log("OpenFront Agent Arena HTTP mixed match config smoke check passed.");
console.log(
  JSON.stringify(
    {
      matchID: httpMixedMatchConfig.matchID,
      runner: httpMixedMatchConfig.runner,
      map: httpMixedMatchConfig.map,
      maxTicks: httpMixedMatchConfig.maxTicks,
      agentDecisionTimeoutMs: httpMixedMatchConfig.agentDecisionTimeoutMs,
      players: httpMixedMatchConfig.players.length,
      supportedActions: httpMixedMatchConfig.supportedActions,
    },
    null,
    2,
  ),
);
