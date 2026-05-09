import { GameUpdateViewData } from "../../../src/core/game/GameUpdates";
import type { StampedIntent, Turn } from "../../../src/core/Schemas";
import { validateAction } from "./actionValidation";
import { createHeadlessGameRunner } from "./headless";
import { actionToIntent } from "./intentAdapter";
import { localMatchConfig } from "./localMatchConfig";
import {
  buildLocalMatchResult,
  localMatchResultToMatchEndEvent,
} from "./localMatchResult";
import { buildObservation } from "./observation";
import { buildReplaySummary } from "./replaySummary";
import { createLocalReplayWriter } from "./replayWriter";

async function main() {
  const { agents, map, matchID, maxTicks, players, supportedActions } =
    localMatchConfig;
  const replay = createLocalReplayWriter(matchID);
  const updates: GameUpdateViewData[] = [];
  const replayAgents = players.map((player) => ({
    name: agents[player.clientID].name,
    clientID: player.clientID,
  }));

  const runner = await createHeadlessGameRunner({
    gameID: matchID,
    players,
    onUpdate: (update) => updates.push(update),
  });

  let attackIntents = 0;
  let rejectedActions = 0;

  replay.write({
    type: "replay_metadata",
    format: "openfront-agent-arena-jsonl",
    version: 1,
    matchID,
    runner: "local",
    map,
    seed: null,
    maxTicks,
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
    const decisions = players.map((player) => {
      const observation = buildObservation(runner, player);
      const action = agents[player.clientID].decide(observation);
      const validation = validateAction(runner.game, observation, action);
      const intent =
        validation.status === "accepted"
          ? actionToIntent(runner.game, player, action)
          : null;

      if (validation.status === "rejected") {
        rejectedActions += 1;
      }

      return {
        agent: agents[player.clientID].name,
        clientID: player.clientID,
        observation,
        action,
        validation,
        intent,
      };
    });
    const intents = decisions
      .map((decision) => decision.intent)
      .filter((intent): intent is StampedIntent => intent !== null);

    const turn: Turn = {
      turnNumber,
      intents,
    };

    attackIntents += intents.filter(
      (intent) => intent.type === "attack",
    ).length;

    runner.addTurn(turn);
    const didTick = runner.executeNextTick(runner.pendingTurns());
    if (!didTick) {
      throw new Error(`Local match failed on turn ${turnNumber}`);
    }

    replay.write({
      type: "tick",
      tick: runner.game.ticks(),
      turnNumber,
      decisions,
      intents,
      summary: buildReplaySummary(runner.game, players, agents),
      updateCount: updates.length,
    });
  }

  const summary = buildReplaySummary(runner.game, players, agents);
  const result = buildLocalMatchResult({
    matchID,
    ticks: runner.game.ticks(),
    updates: updates.length,
    attackIntents,
    rejectedActions,
    agents: summary,
    supportedActions,
    replay: replay.filePath,
  });

  if (
    result.agents.some((player) => !player.hasSpawned || player.tilesOwned <= 0)
  ) {
    throw new Error(
      `Expected both local agents to spawn and own tiles, got ${JSON.stringify(
        result.agents,
      )}`,
    );
  }

  replay.write(localMatchResultToMatchEndEvent(result));

  await replay.close();

  console.log("OpenFront Agent Arena local match completed.");
  console.log(JSON.stringify(result, null, 2));
}

await main();
