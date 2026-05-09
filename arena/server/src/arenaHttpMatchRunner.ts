import { createHeadlessGameRunner } from "../../runner/src/headless";
import { HttpAgentClient } from "../../runner/src/httpAgentClient";
import { runReplayMatchTurns } from "../../runner/src/matchLoop";
import {
  buildReplayMatchResult,
  matchResultToMatchEndEvent,
} from "../../runner/src/matchResult";
import { buildReplayAgents, writeReplayStart } from "../../runner/src/replayLifecycle";
import { buildReplaySummary } from "../../runner/src/replaySummary";
import {
  createLocalReplayWriter,
  localReplayFilePath,
} from "../../runner/src/replayWriter";
import type { AgentAction, AgentDecisionSource, ReplayMatchResult } from "../../runner/src/types";
import type { ArenaMatchRequest } from "./arenaMatchRequestValidation";

const supportedActions: AgentAction["type"][] = ["spawn", "wait", "attack"];

export async function runArenaHttpMatch(
  request: ArenaMatchRequest,
): Promise<ReplayMatchResult> {
  const players = request.agents.map((agent, index) => ({
    username: agent.name,
    clientID: agent.clientID,
    isLobbyCreator: index === 0,
  }));
  const agents: Record<string, AgentDecisionSource> = Object.fromEntries(
    request.agents.map((agent) => [
      agent.clientID,
      new HttpAgentClient({
        name: agent.name,
        endpoint: agent.endpoint,
      }),
    ]),
  );
  const runner = await createHeadlessGameRunner({
    gameID: request.matchID,
    players,
  });
  const replayAgents = buildReplayAgents(players, agents);
  const replay = createLocalReplayWriter(request.matchID);

  try {
    writeReplayStart(replay, {
      matchID: request.matchID,
      runner: "api-http",
      map: request.map,
      maxTicks: request.maxTicks,
      agentDecisionTimeoutMs: request.agentDecisionTimeoutMs,
      agents: replayAgents,
      supportedActions,
    });

    const loopResult = await runReplayMatchTurns({
      agentDecisionTimeoutMs: request.agentDecisionTimeoutMs,
      agents,
      matchLabel: "Arena API HTTP match",
      maxTicks: request.maxTicks,
      players,
      replay,
      runner,
    });
    const result = buildReplayMatchResult({
      matchID: request.matchID,
      loopResult,
      agents: buildReplaySummary(runner.game, players, agents),
      replay: localReplayFilePath(request.matchID),
    });

    replay.write(matchResultToMatchEndEvent(result));

    return result;
  } finally {
    await replay.close();
  }
}
