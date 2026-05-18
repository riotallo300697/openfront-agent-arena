import type {
  ArenaSessionCompletedTurn,
  ArenaSessionCompletionAgentSummary,
  ArenaSessionCompletionSummary,
  ArenaSessionDecisionCounts,
} from "./arenaSessionCompletion";
import type { ArenaSessionRecord } from "./arenaSessionStore";

export type ArenaSessionMatchArtifact = {
  agentDecisionTimeoutMs: number;
  agents: ArenaSessionMatchArtifactAgent[];
  completedAt: string;
  createdAt: string;
  decisions: ArenaSessionDecisionCounts;
  format: "openfront-agent-arena-session-match-artifact";
  map: ArenaSessionRecord["map"];
  matchID: string;
  maxTicks: number;
  replay: {
    format: "openfront-agent-arena-jsonl";
    path: null;
  };
  result: ArenaSessionMatchArtifactResult;
  runner: "api-session";
  sessionID: string;
  status: "completed";
  turns: ArenaSessionCompletedTurn[];
  version: 1;
};

export type ArenaSessionMatchArtifactAgent =
  ArenaSessionCompletionAgentSummary;

export type ArenaSessionMatchArtifactResult = {
  agents: ArenaSessionMatchArtifactAgent[];
  decisions: ArenaSessionDecisionCounts;
  replay: null;
  ticks: number;
  updates: null;
};

export function buildArenaSessionMatchArtifact(
  completion: ArenaSessionCompletionSummary,
): ArenaSessionMatchArtifact {
  const agents = completion.agents.map(cloneAgent);
  const decisions = cloneDecisionCounts(completion.decisions);
  const turns = completion.turns.map((turn) => ({
    tick: turn.tick,
    decisions: turn.decisions.map((decision) => ({
      ...decision,
      action: decision.action === null ? null : { ...decision.action },
    })),
  }));

  return {
    agentDecisionTimeoutMs: completion.agentDecisionTimeoutMs,
    agents,
    completedAt: completion.completedAt,
    createdAt: completion.createdAt,
    decisions,
    format: "openfront-agent-arena-session-match-artifact",
    map: completion.map,
    matchID: completion.matchID,
    maxTicks: completion.maxTicks,
    replay: {
      format: "openfront-agent-arena-jsonl",
      path: null,
    },
    result: {
      agents: agents.map(cloneAgent),
      decisions: cloneDecisionCounts(decisions),
      replay: null,
      ticks: completion.ticks,
      updates: null,
    },
    runner: "api-session",
    sessionID: completion.sessionID,
    status: "completed",
    turns,
    version: 1,
  };
}

function cloneAgent(
  agent: ArenaSessionCompletionAgentSummary,
): ArenaSessionCompletionAgentSummary {
  return {
    ...agent,
    decisions: cloneDecisionCounts(agent.decisions),
    finalObservation:
      agent.finalObservation === null ? null : { ...agent.finalObservation },
  };
}

function cloneDecisionCounts(
  decisions: ArenaSessionDecisionCounts,
): ArenaSessionDecisionCounts {
  return { ...decisions };
}
