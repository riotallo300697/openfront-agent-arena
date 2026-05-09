import { createHeadlessGameRunner } from "../../runner/src/headless";
import { HttpAgentClient } from "../../runner/src/httpAgentClient";
import { runReplayMatchTurns } from "../../runner/src/matchLoop";
import {
  buildReplayMatchResult,
  matchResultToMatchEndEvent,
} from "../../runner/src/matchResult";
import {
  buildReplayAgents,
  writeReplayStart,
} from "../../runner/src/replayLifecycle";
import { buildReplaySummary } from "../../runner/src/replaySummary";
import {
  createLocalReplayWriter,
  localReplayFilePath,
} from "../../runner/src/replayWriter";
import type {
  AgentAction,
  AgentDecisionSource,
  ReplayMatchResult,
} from "../../runner/src/types";
import {
  decisionsToActionEvents,
  type ArenaApiEventSink,
} from "./arenaApiEvents";
import type { ArenaMatchRequest } from "./arenaMatchRequestValidation";

const supportedActions: AgentAction["type"][] = ["spawn", "wait", "attack"];

export async function runArenaHttpMatch(
  request: ArenaMatchRequest,
  {
    emitEvent,
  }: {
    emitEvent?: ArenaApiEventSink;
  } = {},
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
    await emitEvent?.({
      type: "match.started",
      matchID: request.matchID,
      map: request.map,
      maxTicks: request.maxTicks,
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
      onTurnDecisions: async (decisions, turnNumber) => {
        for (const event of decisionsToActionEvents({
          decisions,
          matchID: request.matchID,
          turnNumber,
        })) {
          await emitEvent?.(event);
        }
      },
      onTick: async (event) => {
        await emitEvent?.({
          type: "match.tick",
          matchID: request.matchID,
          tick: event.tick,
          turnNumber: event.turnNumber,
          summary: event.summary,
        });
      },
    });
    const result = buildReplayMatchResult({
      matchID: request.matchID,
      loopResult,
      agents: buildReplaySummary(runner.game, players, agents),
      replay: localReplayFilePath(request.matchID),
    });

    replay.write(matchResultToMatchEndEvent(result));
    await emitEvent?.({
      type: "match.ended",
      matchID: request.matchID,
      result,
    });

    return result;
  } finally {
    await replay.close();
  }
}
