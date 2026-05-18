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

export type ArenaSessionMatchArtifactSummary = {
  agentDecisionTimeoutMs: number;
  agents: ArenaSessionMatchArtifactAgent[];
  completedAt: string;
  createdAt: string;
  decisions: ArenaSessionDecisionCounts;
  format: "openfront-agent-arena-session-match-artifact-summary";
  map: ArenaSessionRecord["map"];
  matchID: string;
  maxTicks: number;
  replay: ArenaSessionMatchArtifact["replay"];
  result: {
    decisions: ArenaSessionDecisionCounts;
    replay: null;
    ticks: number;
    updates: null;
  };
  runner: "api-session";
  sessionID: string;
  status: "completed";
  turnCount: number;
  version: 1;
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

export function buildArenaSessionMatchArtifactSummary(
  artifact: ArenaSessionMatchArtifact,
): ArenaSessionMatchArtifactSummary {
  return {
    agentDecisionTimeoutMs: artifact.agentDecisionTimeoutMs,
    agents: artifact.agents.map(cloneAgent),
    completedAt: artifact.completedAt,
    createdAt: artifact.createdAt,
    decisions: cloneDecisionCounts(artifact.decisions),
    format: "openfront-agent-arena-session-match-artifact-summary",
    map: artifact.map,
    matchID: artifact.matchID,
    maxTicks: artifact.maxTicks,
    replay: { ...artifact.replay },
    result: {
      decisions: cloneDecisionCounts(artifact.result.decisions),
      replay: artifact.result.replay,
      ticks: artifact.result.ticks,
      updates: artifact.result.updates,
    },
    runner: artifact.runner,
    sessionID: artifact.sessionID,
    status: artifact.status,
    turnCount: artifact.turns.length,
    version: artifact.version,
  };
}

export function isArenaSessionMatchArtifact(
  value: unknown,
): value is ArenaSessionMatchArtifact {
  return (
    isRecord(value) &&
    value.format === "openfront-agent-arena-session-match-artifact" &&
    value.version === 1 &&
    typeof value.sessionID === "string" &&
    typeof value.matchID === "string" &&
    value.status === "completed" &&
    typeof value.createdAt === "string" &&
    typeof value.completedAt === "string" &&
    value.map === "tests/testdata/maps/plains" &&
    Number.isInteger(value.maxTicks) &&
    Number.isInteger(value.agentDecisionTimeoutMs) &&
    value.runner === "api-session" &&
    Array.isArray(value.agents) &&
    value.agents.every(isArenaSessionMatchArtifactAgent) &&
    isDecisionCounts(value.decisions) &&
    isRecord(value.replay) &&
    value.replay.format === "openfront-agent-arena-jsonl" &&
    value.replay.path === null &&
    isArenaSessionMatchArtifactResult(value.result) &&
    Array.isArray(value.turns) &&
    value.turns.every(isArenaSessionCompletedTurn)
  );
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDecisionCounts(value: unknown): value is ArenaSessionDecisionCounts {
  return (
    isRecord(value) &&
    Number.isInteger(value.expired) &&
    Number.isInteger(value.missing) &&
    Number.isInteger(value.pending) &&
    Number.isInteger(value.rejected) &&
    Number.isInteger(value.submitted) &&
    Number.isInteger(value.total)
  );
}

function isArenaSessionMatchArtifactAgent(
  value: unknown,
): value is ArenaSessionMatchArtifactAgent {
  return (
    isRecord(value) &&
    typeof value.clientID === "string" &&
    typeof value.name === "string" &&
    Number.isInteger(value.slotIndex) &&
    isDecisionCounts(value.decisions) &&
    (value.finalObservation === null ||
      (isRecord(value.finalObservation) &&
        typeof value.finalObservation.hasSpawned === "boolean" &&
        (typeof value.finalObservation.isAlive === "boolean" ||
          value.finalObservation.isAlive === null) &&
        Number.isInteger(value.finalObservation.tick) &&
        Number.isInteger(value.finalObservation.tilesOwned)))
  );
}

function isArenaSessionMatchArtifactResult(
  value: unknown,
): value is ArenaSessionMatchArtifactResult {
  return (
    isRecord(value) &&
    Array.isArray(value.agents) &&
    value.agents.every(isArenaSessionMatchArtifactAgent) &&
    isDecisionCounts(value.decisions) &&
    value.replay === null &&
    Number.isInteger(value.ticks) &&
    value.updates === null
  );
}

function isArenaSessionCompletedTurn(
  value: unknown,
): value is ArenaSessionCompletedTurn {
  return (
    isRecord(value) &&
    Number.isInteger(value.tick) &&
    Array.isArray(value.decisions) &&
    value.decisions.every(isArenaSessionDecision)
  );
}

function isArenaSessionDecision(
  value: unknown,
): value is ArenaSessionCompletedTurn["decisions"][number] {
  return (
    isRecord(value) &&
    typeof value.clientID === "string" &&
    (value.state === "submitted" ||
      value.state === "expired" ||
      value.state === "pending" ||
      value.state === "missing" ||
      value.state === "rejected") &&
    (typeof value.turnID === "string" || value.turnID === null) &&
    (value.reason === undefined ||
      value.reason === "invalid_turn" ||
      value.reason === "session_not_found" ||
      value.reason === "client_not_joined") &&
    isArtifactAction(value.action)
  );
}

function isArtifactAction(value: unknown): boolean {
  if (value === null) {
    return true;
  }

  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "wait") {
    return true;
  }

  if (value.type === "spawn") {
    return Number.isInteger(value.x) && Number.isInteger(value.y);
  }

  return (
    value.type === "attack" &&
    value.target === "neutral" &&
    (Number.isInteger(value.troops) || value.troops === null)
  );
}
