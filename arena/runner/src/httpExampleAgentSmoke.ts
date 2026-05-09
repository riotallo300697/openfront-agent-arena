import type { StampedIntent, Turn } from "../../../src/core/Schemas";
import { startHttpExampleAgentServer } from "../../agents/httpExampleAgent";
import { buildLocalAgentDecision } from "./agentTurnPipeline";
import { createHeadlessGameRunner } from "./headless";
import { HttpAgentClient } from "./httpAgentClient";
import { expectCondition, expectJsonEqual } from "./smokeAssert";

const player = {
  username: "LiveHttpExampleAgent",
  clientID: "live-http-example-agent",
  isLobbyCreator: true,
};

const exampleAgent = await startHttpExampleAgentServer({
  spawn: {
    x: 10,
    y: 10,
  },
});

try {
  const runner = await createHeadlessGameRunner({
    gameID: "arena-http-example-agent-smoke",
    players: [player],
  });
  const client = new HttpAgentClient({
    name: "LiveHttpExampleAgent",
    endpoint: `${exampleAgent.url}/decide`,
  });

  const spawnDecision = await buildLocalAgentDecision({
    agent: client,
    player,
    runner,
    timeoutMs: 1000,
  });

  expectJsonEqual("example spawn input validation", spawnDecision.inputValidation, {
    status: "accepted",
  });
  expectJsonEqual("example spawn game validation", spawnDecision.validation, {
    status: "accepted",
  });
  expectCondition("example spawn action", spawnDecision.action?.type === "spawn", {
    decision: spawnDecision,
  });
  expectCondition("example spawn intent", spawnDecision.intent?.type === "spawn", {
    decision: spawnDecision,
  });

  const spawnIntents = [spawnDecision.intent].filter(
    (intent): intent is StampedIntent => intent !== null,
  );
  const spawnTurn: Turn = {
    turnNumber: 0,
    intents: spawnIntents,
  };

  runner.addTurn(spawnTurn);
  for (let turnNumber = 0; turnNumber < 3; turnNumber++) {
    if (turnNumber > 0) {
      runner.addTurn({
        turnNumber,
        intents: [],
      });
    }

    const didTick = runner.executeNextTick(runner.pendingTurns());
    expectCondition("example spawn tick executed", didTick, {
      turnNumber,
    });
  }
  expectCondition(
    "example agent spawned before wait decision",
    runner.game.playerByClientID(player.clientID)?.hasSpawned() === true,
    {
      ticks: runner.game.ticks(),
    },
  );

  const waitDecision = await buildLocalAgentDecision({
    agent: client,
    player,
    runner,
    timeoutMs: 1000,
  });

  expectJsonEqual("example wait input validation", waitDecision.inputValidation, {
    status: "accepted",
  });
  expectJsonEqual("example wait game validation", waitDecision.validation, {
    status: "accepted",
  });
  expectCondition("example wait action", waitDecision.action?.type === "wait", {
    decision: waitDecision,
  });
  expectJsonEqual("example wait intent", waitDecision.intent, null);

  console.log("OpenFront Agent Arena HTTP example agent smoke check passed.");
  console.log(
    JSON.stringify(
      {
        endpoint: client.endpoint,
        checkedDecisions: 2,
        spawnedAfterFirstDecision:
          runner.game.playerByClientID(player.clientID)?.hasSpawned() ?? false,
        ticks: runner.game.ticks(),
      },
      null,
      2,
    ),
  );
} finally {
  await exampleAgent.close();
}
