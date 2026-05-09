import { GameUpdateViewData } from "../../../src/core/game/GameUpdates";
import { expectAgentsSpawnedAliveWithTiles } from "./agentStateAssertions";
import { createHeadlessGameRunner } from "./headless";
import { localMatchConfig } from "./localMatchConfig";
import { runReplayMatchTurns } from "./matchLoop";
import {
  buildLocalMatchResult,
  buildReplayMatchResult,
  matchResultToMatchEndEvent,
} from "./matchResult";
import { buildReplayAgents, writeReplayStart } from "./replayLifecycle";
import { buildReplaySummary } from "./replaySummary";
import { createLocalReplayWriter } from "./replayWriter";

async function main() {
  const {
    agentDecisionTimeoutMs,
    agents,
    map,
    matchID,
    maxTicks,
    players,
    supportedActions,
  } = localMatchConfig;
  const replay = createLocalReplayWriter(matchID);
  const updates: GameUpdateViewData[] = [];
  const replayAgents = buildReplayAgents(players, agents);

  const runner = await createHeadlessGameRunner({
    gameID: matchID,
    players,
    onUpdate: (update) => updates.push(update),
  });

  writeReplayStart(replay, {
    matchID,
    runner: "local",
    map,
    maxTicks,
    agentDecisionTimeoutMs,
    agents: replayAgents,
    supportedActions,
  });

  const loopResult = await runReplayMatchTurns({
    agentDecisionTimeoutMs,
    agents,
    matchLabel: "local match",
    maxTicks,
    players,
    replay,
    runner,
    updateCount: () => updates.length,
  });

  const summary = buildReplaySummary(runner.game, players, agents);
  const replayResult = buildReplayMatchResult({
    matchID,
    loopResult,
    agents: summary,
    replay: replay.filePath,
  });
  const result = buildLocalMatchResult({
    ...replayResult,
    supportedActions,
  });

  expectAgentsSpawnedAliveWithTiles({
    name: "local match final agents",
    agents: result.agents,
    expectedAgents: replayAgents.map((agent) => ({
      agent: agent.name,
      clientID: agent.clientID,
    })),
  });

  replay.write(matchResultToMatchEndEvent(result));

  await replay.close();

  console.log("OpenFront Agent Arena local match completed.");
  console.log(JSON.stringify(result, null, 2));
}

await main();
