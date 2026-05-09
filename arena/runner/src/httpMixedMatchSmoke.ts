import type { StampedIntent, Turn } from "../../../src/core/Schemas";
import { startHttpExampleAgentServer } from "../../agents/httpExampleAgent";
import { buildLocalAgentDecision } from "./agentTurnPipeline";
import { FixedSpawnExpandAgent } from "./baselineAgents";
import { createHeadlessGameRunner } from "./headless";
import { HttpAgentClient } from "./httpAgentClient";
import { httpMixedMatchConfig } from "./httpMixedMatchConfig";
import { readReplayEvents } from "./replayReader";
import { buildReplaySummary } from "./replaySummary";
import { createLocalReplayWriter, localReplayFilePath } from "./replayWriter";
import { expectCondition, expectJsonEqual } from "./smokeAssert";
import type {
  AgentDecisionSource,
  LocalAgentDecision,
  ReplayMatchEndEvent,
  ReplayMetadataEvent,
  ReplayTickEvent,
} from "./types";

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
  const replayAgents = players.map((player) => ({
    name: agents[player.clientID].name,
    clientID: player.clientID,
  }));
  const replay = createLocalReplayWriter(matchID);
  const decisions: LocalAgentDecision[] = [];
  let intentCount = 0;
  let rejectedActions = 0;

  replay.write({
    type: "replay_metadata",
    format: "openfront-agent-arena-jsonl",
    version: 1,
    matchID,
    runner: runnerKind,
    map,
    seed: null,
    maxTicks,
    agentDecisionTimeoutMs,
    agents: replayAgents,
    supportedActions,
  });

  replay.write({
    type: "match_start",
    matchID,
    map,
    maxTicks,
    agents: replayAgents,
    supportedActions,
  });

  for (let turnNumber = 0; turnNumber < maxTicks; turnNumber++) {
    const turnDecisions = await Promise.all(
      players.map((player) =>
        buildLocalAgentDecision({
          agent: agents[player.clientID],
          player,
          runner,
          timeoutMs: agentDecisionTimeoutMs,
        }),
      ),
    );
    decisions.push(...turnDecisions);

    for (const decision of turnDecisions) {
      expectJsonEqual(`${decision.agent} input validation`, decision.inputValidation, {
        status: "accepted",
      });
      expectJsonEqual(`${decision.agent} game validation`, decision.validation, {
        status: "accepted",
      });

      if (
        decision.inputValidation.status === "rejected" ||
        decision.validation?.status === "rejected"
      ) {
        rejectedActions += 1;
      }
    }

    const intents = turnDecisions
      .map((decision) => decision.intent)
      .filter((intent): intent is StampedIntent => intent !== null);
    const turn: Turn = {
      turnNumber,
      intents,
    };

    intentCount += intents.length;
    runner.addTurn(turn);

    const didTick = runner.executeNextTick(runner.pendingTurns());
    expectCondition("mixed HTTP match tick executed", didTick, {
      turnNumber,
    });

    replay.write({
      type: "tick",
      tick: runner.game.ticks(),
      turnNumber,
      decisions: turnDecisions,
      intents,
      summary: buildReplaySummary(runner.game, players, agents),
      updateCount: runner.game.ticks(),
    });
  }

  const httpDecisions = decisions.filter(
    (decision) => decision.clientID === httpAgent.clientID,
  );
  const localDecisions = decisions.filter(
    (decision) => decision.clientID === localAgent.clientID,
  );
  const finalPlayers = players.map((player) => {
    const gamePlayer = runner.game.playerByClientID(player.clientID);

    return {
      clientID: player.clientID,
      hasSpawned: gamePlayer?.hasSpawned() ?? false,
      tilesOwned: gamePlayer?.numTilesOwned() ?? 0,
      isAlive: gamePlayer?.isAlive() ?? false,
    };
  });
  const finalSummary = buildReplaySummary(runner.game, players, agents);

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
  expectCondition("HTTP mixed match produced intents", intentCount > 0, {
    intentCount,
  });

  for (const player of finalPlayers) {
    expectCondition("mixed match player spawned", player.hasSpawned, {
      player,
    });
    expectCondition("mixed match player owns tiles", player.tilesOwned > 0, {
      player,
    });
    expectCondition("mixed match player alive", player.isAlive, {
      player,
    });
  }

  replay.write({
    type: "match_end",
    matchID,
    ticks: runner.game.ticks(),
    updates: runner.game.ticks(),
    attackIntents: decisions.filter(
      (decision) => decision.intent?.type === "attack",
    ).length,
    rejectedActions,
    agents: finalSummary,
  });

  await replay.close();

  const replayEvents = readReplayEvents(localReplayFilePath(matchID));
  const metadata = replayEvents[0] as ReplayMetadataEvent;
  const tickEvents = replayEvents.filter(
    (event): event is ReplayTickEvent => event.type === "tick",
  );
  const matchEnd = replayEvents[replayEvents.length - 1] as ReplayMatchEndEvent;

  expectJsonEqual("mixed replay metadata runner", metadata.runner, runnerKind);
  expectJsonEqual(
    "mixed replay metadata timeout",
    metadata.agentDecisionTimeoutMs,
    agentDecisionTimeoutMs,
  );
  expectJsonEqual("mixed replay tick count", tickEvents.length, maxTicks);
  expectJsonEqual("mixed replay match end ticks", matchEnd.ticks, maxTicks);
  expectJsonEqual("mixed replay rejected actions", matchEnd.rejectedActions, 0);
  expectCondition(
    "mixed replay records decisions",
    tickEvents.every((event) => event.decisions.length === players.length),
    { tickEvents },
  );

  console.log("OpenFront Agent Arena HTTP mixed match smoke check passed.");
  console.log(
    JSON.stringify(
      {
        endpoint: `${exampleAgent.url}/decide`,
        ticks: runner.game.ticks(),
        decisions: decisions.length,
        httpDecisions: httpDecisions.length,
        localDecisions: localDecisions.length,
        intents: intentCount,
        replay: localReplayFilePath(matchID),
        replayEvents: replayEvents.length,
        players: finalPlayers,
      },
      null,
      2,
    ),
  );
} finally {
  await exampleAgent.close();
}
