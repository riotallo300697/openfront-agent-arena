import { startHttpExampleAgentServer } from "../../agents/httpExampleAgent";
import { expectAgentsSpawnedAliveWithTiles } from "./agentStateAssertions";
import { FixedSpawnExpandAgent } from "./baselineAgents";
import { createHeadlessGameRunner } from "./headless";
import { HttpAgentClient } from "./httpAgentClient";
import { httpMixedMatchConfig } from "./httpMixedMatchConfig";
import { runReplayMatchTurns } from "./matchLoop";
import {
  buildReplayMatchResult,
  matchResultToMatchEndEvent,
} from "./matchResult";
import { buildReplayAgents, writeReplayStart } from "./replayLifecycle";
import { validateReplayFileSemantics } from "./replaySemanticValidation";
import { buildReplaySummary } from "./replaySummary";
import { createLocalReplayWriter, localReplayFilePath } from "./replayWriter";
import { expectCondition, expectJsonEqual } from "./smokeAssert";
import type { AgentDecisionSource } from "./types";

const {
  agentDecisionTimeoutMs,
  httpAgent,
  localAgent,
  map,
  matchID,
  maxTicks,
  players,
  runner: runnerKind,
  supportedActions,
} = httpMixedMatchConfig;

const exampleAgent = await startHttpExampleAgentServer({
  spawn: httpAgent.spawn,
});

try {
  const runner = await createHeadlessGameRunner({
    gameID: matchID,
    players,
  });
  const agents: Record<string, AgentDecisionSource> = {
    [httpAgent.clientID]: new HttpAgentClient({
      name: httpAgent.name,
      endpoint: `${exampleAgent.url}/decide`,
    }),
    [localAgent.clientID]: new FixedSpawnExpandAgent(
      localAgent.name,
      localAgent.spawn,
    ),
  };
  const replayAgents = buildReplayAgents(players, agents);
  const replay = createLocalReplayWriter(matchID);

  writeReplayStart(replay, {
    matchID,
    runner: runnerKind,
    map,
    maxTicks,
    agentDecisionTimeoutMs,
    agents: replayAgents,
    supportedActions,
  });

  const loopResult = await runReplayMatchTurns({
    agentDecisionTimeoutMs,
    agents,
    matchLabel: "mixed HTTP match",
    maxTicks,
    players,
    replay,
    runner,
    onTurnDecisions: (turnDecisions) => {
      for (const decision of turnDecisions) {
        expectJsonEqual(
          `${decision.agent} input validation`,
          decision.inputValidation,
          {
            status: "accepted",
          },
        );
        expectJsonEqual(
          `${decision.agent} game validation`,
          decision.validation,
          {
            status: "accepted",
          },
        );
      }
    },
  });
  const { decisions } = loopResult;

  const httpDecisions = decisions.filter(
    (decision) => decision.clientID === httpAgent.clientID,
  );
  const localDecisions = decisions.filter(
    (decision) => decision.clientID === localAgent.clientID,
  );
  const finalSummary = buildReplaySummary(runner.game, players, agents);
  const result = buildReplayMatchResult({
    matchID,
    loopResult,
    agents: finalSummary,
    replay: localReplayFilePath(matchID),
  });
  const expectedFinalAgents = replayAgents.map((agent) => ({
    agent: agent.name,
    clientID: agent.clientID,
  }));
  const finalPlayers = result.agents.map((agent) => ({
    clientID: agent.clientID,
    hasSpawned: agent.hasSpawned,
    tilesOwned: agent.tilesOwned,
    isAlive: agent.isAlive,
  }));

  expectCondition(
    "HTTP mixed match has HTTP decisions",
    httpDecisions.length === maxTicks,
    { httpDecisions: httpDecisions.length, maxTicks },
  );
  expectCondition(
    "HTTP mixed match has local decisions",
    localDecisions.length === maxTicks,
    { localDecisions: localDecisions.length, maxTicks },
  );
  expectCondition(
    "HTTP agent eventually waits",
    httpDecisions.some((decision) => decision.action?.type === "wait"),
    { httpDecisions },
  );
  expectCondition(
    "HTTP mixed match produced intents",
    loopResult.intentCount > 0,
    {
      intentCount: loopResult.intentCount,
    },
  );

  expectAgentsSpawnedAliveWithTiles({
    name: "mixed match final agents",
    agents: result.agents,
    expectedAgents: expectedFinalAgents,
  });

  replay.write(matchResultToMatchEndEvent(result));

  await replay.close();

  const replayPath = result.replay;
  const replayCheck = validateReplayFileSemantics(replayPath, {
    matchID,
    runner: runnerKind,
    map,
    maxTicks,
    agentDecisionTimeoutMs,
    agents: replayAgents,
    supportedActions,
    finalAgents: expectedFinalAgents,
    expectedRejectedActions: 0,
    expectedDecisionsPerTick: players.length,
  });

  console.log("OpenFront Agent Arena HTTP mixed match smoke check passed.");
  console.log(
    JSON.stringify(
      {
        endpoint: `${exampleAgent.url}/decide`,
        ticks: result.ticks,
        decisions: decisions.length,
        httpDecisions: httpDecisions.length,
        localDecisions: localDecisions.length,
        intents: loopResult.intentCount,
        replay: replayPath,
        replayEvents: replayCheck.events.length,
        players: finalPlayers,
      },
      null,
      2,
    ),
  );
} finally {
  await exampleAgent.close();
}
