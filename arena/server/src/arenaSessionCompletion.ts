import type { AgentAction, AgentObservation } from "../../runner/src/types";
import type { ArenaSessionCoordinatorDecision } from "./arenaSessionCoordinator";
import type { ArenaSessionRecord } from "./arenaSessionStore";

export type ArenaSessionDecisionCounts = {
  expired: number;
  missing: number;
  pending: number;
  rejected: number;
  submitted: number;
  total: number;
};

export type ArenaSessionCompletedTurn = {
  decisions: ArenaSessionCoordinatorDecision[];
  tick: number;
};

export type ArenaSessionCompletionAgentSummary = {
  clientID: string;
  decisions: ArenaSessionDecisionCounts;
  finalObservation: {
    hasSpawned: boolean;
    isAlive: boolean | null;
    tick: number;
    tilesOwned: number;
  } | null;
  name: string;
  slotIndex: number;
};

export type ArenaSessionCompletionSummary = {
  agentDecisionTimeoutMs: number;
  agents: ArenaSessionCompletionAgentSummary[];
  completedAt: string;
  createdAt: string;
  currentTick: number;
  decisions: ArenaSessionDecisionCounts;
  map: ArenaSessionRecord["map"];
  matchID: string;
  maxTicks: number;
  replay: null;
  runner: "api-session";
  sessionID: string;
  status: "completed";
  ticks: number;
  turns: ArenaSessionCompletedTurn[];
};

export function buildArenaSessionCompletionSummary({
  latestObservations,
  session,
  turns,
}: {
  latestObservations: AgentObservation[];
  session: ArenaSessionRecord;
  turns: ArenaSessionCompletedTurn[];
}): ArenaSessionCompletionSummary {
  if (session.status !== "completed" || session.completedAt === undefined) {
    throw new Error("session completion summary requires a completed session");
  }

  const latestObservationsByClientID = new Map(
    latestObservations.map((observation) => [
      observation.self.clientID,
      observation,
    ]),
  );
  const clonedTurns = turns.map((turn) => ({
    tick: turn.tick,
    decisions: turn.decisions.map(cloneDecision),
  }));

  return {
    agentDecisionTimeoutMs: session.agentDecisionTimeoutMs,
    agents: session.agents.map((agent) => {
      const observation = latestObservationsByClientID.get(agent.clientID);
      return {
        clientID: agent.clientID,
        decisions: countDecisions(
          clonedTurns.flatMap((turn) =>
            turn.decisions.filter(
              (decision) => decision.clientID === agent.clientID,
            ),
          ),
        ),
        finalObservation:
          observation === undefined
            ? null
            : {
                hasSpawned: observation.self.hasSpawned,
                isAlive:
                  observation.players.find(
                    (player) => player.clientID === agent.clientID,
                  )?.isAlive ?? null,
                tick: observation.tick,
                tilesOwned: observation.self.tilesOwned,
              },
        name: agent.name,
        slotIndex: agent.slotIndex,
      };
    }),
    completedAt: session.completedAt,
    createdAt: session.createdAt,
    currentTick: session.currentTick,
    decisions: countDecisions(
      clonedTurns.flatMap((turn) => turn.decisions),
    ),
    matchID: session.matchID,
    map: session.map,
    maxTicks: session.maxTicks,
    replay: null,
    runner: "api-session",
    sessionID: session.sessionID,
    status: "completed",
    ticks: session.currentTick,
    turns: clonedTurns,
  };
}

function countDecisions(
  decisions: ArenaSessionCoordinatorDecision[],
): ArenaSessionDecisionCounts {
  const counts: ArenaSessionDecisionCounts = {
    expired: 0,
    missing: 0,
    pending: 0,
    rejected: 0,
    submitted: 0,
    total: decisions.length,
  };

  for (const decision of decisions) {
    counts[decision.state] += 1;
  }

  return counts;
}

function cloneDecision(
  decision: ArenaSessionCoordinatorDecision,
): ArenaSessionCoordinatorDecision {
  return {
    ...decision,
    action: cloneAction(decision.action),
  };
}

function cloneAction(action: AgentAction | null): AgentAction | null {
  return action === null ? null : { ...action };
}
